extends Node
## Isolated native Hunt v3 1v1 research practice using real SFHuntCombat C++.
## Not routed to live netcode, rankings or public matchmaking. No fake NPC AI.
signal state_updated(snapshot: Dictionary)
signal training_stopped()
const MAX_HISTORY := 120
const AVAILABLE := ["passive","approach","pressure"]
var active := false
var paused := false
var profile := "passive"
var last_state: Dictionary={}
var input_history: Array=[]
var first_retained_tick := 0
var game: Object

func _ready() -> void:
	set_physics_process(false)

func start_training(dummy: String="passive",left_weapon: int=0,right_weapon: int=1) -> bool:
	if dummy not in AVAILABLE or not ClassDB.class_exists("SFHuntCombat"):
		return false
	if get_parent().get_node("Online").online or get_parent().get_node("Practice").active or active:
		return false
	var native: Object=ClassDB.instantiate("SFHuntCombat")
	if native==null or not native.select_weapons(left_weapon,right_weapon):
		return false
	game=native
	active=true
	paused=false
	profile=dummy
	input_history.clear()
	first_retained_tick=0
	game.save_local_checkpoint()
	last_state=game.get_state()
	get_parent().get_node("CombatHud").reset_mode("TRAINING",true)
	get_parent().last_confirmed_tick=-1
	if not _publish_state():
		stop_training()
		return false
	# A real 60 Hz simulation uses Godot physics ticks; rendering may run faster.
	set_physics_process(true)
	return true

func stop_training() -> void:
	set_physics_process(false)
	active=false
	paused=false
	game=null
	last_state={}
	input_history.clear()
	first_retained_tick=0
	get_parent().get_node("CombatHud").clear()
	training_stopped.emit()

func _publish_state() -> bool:
	if not active or game==null:
		return false
	last_state=game.get_state()
	var meter: Dictionary=game.get_move_frame_data(0)
	if not get_parent().apply_native_hunt_state(last_state,meter):
		return false
	state_updated.emit(last_state)
	return true

func get_frame_meter(slot: int=0) -> Dictionary:
	if not active or game==null or slot<0 or slot>1:
		return {}
	return game.get_move_frame_data(slot)

func _valid(values: Array) -> bool:
	if values.size()!=4:
		return false
	for n in values:
		if typeof(n)!=TYPE_INT:
			return false
	return int(values[0]) in [-1,0,1] and int(values[1]) in [-1,0,1] and \
	 int(values[2])>=0 and int(values[2])<=11 and int(values[3])==0

func step_manual(local: Array,remote: Array) -> bool:
	if not active or game==null or not _valid(local) or not _valid(remote) or last_state.get("over",false):
		return false
	if not game.step_encoded(local[0],local[1],local[2],local[3],
	 remote[0],remote[1],remote[2],remote[3]):
		return false
	var saved: int=game.save_local_checkpoint()
	if saved<0:
		return false
	input_history.append({"tick":saved,"local":local.duplicate(),"remote":remote.duplicate()})
	if input_history.size()>MAX_HISTORY:
		input_history.pop_front()
	first_retained_tick=maxi(0,saved-MAX_HISTORY)
	if not _publish_state():
		stop_training()
		return false
	if last_state.get("over",false):
		set_physics_process(false)
	return true

func reset_training() -> bool:
	if not active or game==null:
		return false
	game.reset()
	game.save_local_checkpoint()
	input_history.clear()
	first_retained_tick=0
	get_parent().get_node("CombatHud").reset_mode("TRAINING",true)
	get_parent().last_confirmed_tick=-1
	return _publish_state()

func rewind_frames(frames: int) -> bool:
	if not active or game==null or frames<1 or frames>MAX_HISTORY:
		return false
	var now: int=int(last_state.get("tick",0))
	var target: int=now-frames
	if target<first_retained_tick or not game.restore_local_checkpoint(target):
		return false
	input_history=input_history.filter(func(event: Dictionary)->bool:
		return int(event["tick"])<=target)
	paused=true
	set_physics_process(false)
	get_parent().get_node("CombatHud").reset_mode("TRAINING",true)
	get_parent().last_confirmed_tick=-1
	return _publish_state()

func available_history_frames() -> int:
	return maxi(0,int(last_state.get("tick",0))-first_retained_tick) if active else 0

func _dummy_input() -> Array:
	if last_state.get("ready",0)>0 or last_state.get("end",0)>0 or last_state.get("over",false):
		return [0,0,0,0]
	if profile=="passive":
		return [0,0,0,0]
	var hero: Dictionary=last_state["p"][0]
	var dummy: Dictionary=last_state["p"][1]
	var distance: float=float(hero["x"])-float(dummy["x"])
	var reach: float=absf(distance)
	var x: int=(1 if distance>0 else -1) if reach>95.0 else 0
	var tick: int=int(last_state["tick"])
	var action:=0
	if profile=="pressure" and reach<145.0 and tick%89==11:
		action=2 # Heavy, with REAL startup/parry frames.
	elif profile=="approach" and reach<105.0 and tick%131==29:
		action=1
	return [x,0,action,0]

func _physics_process(_delta: float) -> void:
	if not active or paused:
		return
	var menu: CanvasLayer=get_parent().get_node("NativeMenu")
	var settings: CanvasLayer=get_parent().get_node("InputSettings")
	var graphics: CanvasLayer=get_parent().get_node("GraphicsSettings")
	if menu.visible or settings.visible or graphics.visible:
		return
	var legacy_input: Array=get_parent().get_node("NativeControls").encoded_input()
	# Transitional bindings: legacy cut/heavy/shot/step/feint become genuine
	# Hunt actions. Guard is ALWAYS discarded. New trick/blood/heal bindings
	# need their own approved remappable UI before public release.
	var mapping: Array=[0,1,2,5,6,7]
	if legacy_input.size()!=4 or int(legacy_input[2])<0 or int(legacy_input[2])>=mapping.size():
		return
	var local: Array=[int(legacy_input[0]),int(legacy_input[1]),
		mapping[int(legacy_input[2])],0]
	step_manual(local,_dummy_input())
