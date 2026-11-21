extends Node
## Developer-local training harness using the exact native C++ 60Hz rules.
## No fake "human AI", ranking, account service, network prediction or CPU bot
## learning is claimed. This remains outside public matchmaking.
signal practice_state(snapshot: Dictionary)
signal practice_stopped()
const ALLOWED_BOTS := ["passive","easy","normal","hard"]
const HZ := 60
const MAX_HISTORY_FRAMES := 720
const DUMMY_TAPE_LIMIT := 600
const INPUT_TRACE_LIMIT := 120
# Exact legacy seamless-side/1 C++ frame-table values. Hunt v3 is not ported.
const LEGACY_FRAME_TABLE := {
 "cut":[9,5,15],"hew":[21,7,24],"shot":[9,1,25],
 "step":[0,9,12],"feint":[0,0,14],"stun":[0,0,22],"guardBreak":[0,0,28]
}
var dummy_tape: Array = []
var dummy_recording := false
var dummy_replaying := false
var input_trace: Array = []
var dummy_replay_start_tick := 0
var snapshots: Array[PackedByteArray] = []
var history_start_tick := 0
var paused := false
var _combat: Object = null
var bot := "normal"
var active := false
var last_state: Dictionary = {}

func _ready() -> void:
	set_physics_process(false)

func start_training(profile: String = "normal") -> bool:
	if profile not in ALLOWED_BOTS or not ClassDB.class_exists("SFCombat") or get_parent().get_node("Online").online:
		return false
	var instance: Object = ClassDB.instantiate("SFCombat")
	if instance == null:
		return false
	_combat=instance
	bot=profile
	active=true
	paused=false
	dummy_tape.clear()
	input_trace.clear()
	dummy_recording=false
	dummy_replaying=false
	last_state=_combat.get_state()
	snapshots.clear()
	history_start_tick=0
	var initial: PackedByteArray=_combat.save_checkpoint()
	if initial.size()!=228:
		stop_training()
		return false
	snapshots.append(initial)
	get_parent().get_node("NativeAudio").reset_timeline()
	get_parent().get_node("CombatHud").reset_mode("TRAINING",true)
	get_parent().last_confirmed_tick=-1
	get_parent().apply_authoritative_state(last_state)
	set_physics_process(true)
	practice_state.emit(last_state)
	return true

func stop_training() -> void:
	active=false
	paused=false
	dummy_tape.clear()
	input_trace.clear()
	dummy_recording=false
	dummy_replaying=false
	snapshots.clear()
	history_start_tick=0
	set_physics_process(false)
	_combat=null
	last_state={}
	get_parent().get_node("CombatHud").clear()
	practice_stopped.emit()

func reset_rounds() -> bool:
	if not active or _combat==null:
		return false
	_combat.reset()
	input_trace.clear()
	dummy_recording=false
	dummy_replaying=false
	last_state=_combat.get_state()
	snapshots.clear()
	history_start_tick=0
	snapshots.append(_combat.save_checkpoint())
	get_parent().get_node("CombatHud").reset_mode("TRAINING",true)
	get_parent().last_confirmed_tick=-1
	get_parent().apply_authoritative_state(last_state)
	practice_state.emit(last_state)
	return true

func _bot_input(state: Dictionary) -> Array[int]:
	var players: Array = state["p"]
	var hero: Dictionary=players[0]
	var target: Dictionary=players[1]
	if state["ready"]>0 or state["end"]>0 or state["over"]:
		return [0,0,0,0]
	if dummy_replaying and not dummy_tape.is_empty():
		var elapsed: int=maxi(0,int(state["tick"])-dummy_replay_start_tick)
		var sample: Array=dummy_tape[elapsed%dummy_tape.size()]
		return [-int(sample[0]),int(sample[1]),int(sample[2]),int(sample[3])]
	if bot=="passive":
		return [0,0,0,0]
	var distance: float=float(hero["x"])-float(target["x"])
	var gap: float=absf(distance)
	var direction := 1 if distance>0 else -1
	var cutoff := 88.0 if bot=="hard" else 113.0
	var x: int=direction if gap>cutoff else ( -direction if gap<40.0 else 0 )
	var action := 0
	var tick: int=state["tick"]
	var cadence := 63 if bot=="hard" else 90 if bot=="normal" else 132
	if gap<115.0 and tick%cadence==5:
		action=1
	if bot=="hard" and gap<138.0 and tick%149==43:
		action=2
	# No instant reaction to a new local input: bot sees only last completed
	# game snapshot and acts on a bounded deterministic cadence.
	var guarding := false
	if bot=="hard":
		guarding=hero["act"] in ["cut","hew"] and tick%13<4
	elif bot=="normal":
		guarding=hero["act"]=="hew" and tick%23<5
	return [x,0,action,1 if guarding else 0]

func begin_dummy_recording() -> bool:
	if not active or _combat==null or last_state.get("over",false):
		return false
	dummy_tape.clear()
	dummy_recording=true
	dummy_replaying=false
	return true

func finish_dummy_recording() -> int:
	if not active or dummy_tape.is_empty():
		return 0
	dummy_recording=false
	return dummy_tape.size()

func play_dummy_recording() -> bool:
	if not active or dummy_recording or dummy_tape.is_empty() or last_state.get("over",false):
		return false
	dummy_replay_start_tick=int(last_state.get("tick",0))
	dummy_replaying=true
	return true

func stop_dummy_replay() -> void:
	dummy_replaying=false

func dummy_tape_frames() -> int:
	return dummy_tape.size()

func pause_training() -> bool:
	if not active:
		return false
	paused=true
	set_physics_process(false)
	return true

func resume_training() -> bool:
	if not active:
		return false
	paused=false
	set_physics_process(not last_state.get("over",false))
	return true

func available_history_frames() -> int:
	if not active or snapshots.is_empty():
		return 0
	return int(last_state.get("tick",0))-history_start_tick

func rewind_frames(frames: int) -> bool:
	if not active or _combat==null or frames<1 or frames>MAX_HISTORY_FRAMES:
		return false
	var now: int=int(last_state.get("tick",0))
	var destination: int=now-frames
	var index: int=destination-history_start_tick
	if index<0 or index>=snapshots.size():
		return false
	dummy_recording=false
	var original: PackedByteArray=_combat.save_checkpoint()
	if not _combat.load_checkpoint(snapshots[index]):
		if original.size()==228:
			_combat.load_checkpoint(original)
		return false
	snapshots.resize(index+1)
	input_trace=input_trace.filter(func(entry: Dictionary)->bool: return int(entry["tick"])<=destination)
	last_state=_combat.get_state()
	if int(last_state["tick"])!=destination:
		_combat.load_checkpoint(original)
		return false
	pause_training()
	get_parent().get_node("CombatHud").reset_mode("TRAINING",true)
	get_parent().last_confirmed_tick=-1
	get_parent().apply_authoritative_state(last_state)
	practice_state.emit(last_state)
	return true

func advance_one_frame() -> bool:
	if not active or not paused or _combat==null or last_state.get("over",false):
		return false
	# Frame advance while a menu is open uses neutral player inputs and the
	# deterministic bot. No hidden F1/menu key is consumed by combat.
	return _advance_state([0,0,0,0])

func _advance_state(command: Array) -> bool:
	if command.size()!=4 or _combat==null:
		return false
	for value in command:
		if typeof(value)!=TYPE_INT:
			return false
	if int(command[0]) not in [-1,0,1] or int(command[1]) not in [-1,0,1] or int(command[2])<0 or int(command[2])>5 or int(command[3]) not in [0,1]:
		return false
	var foe: Array[int]=_bot_input(last_state)
	if not _combat.step_encoded(command[0],command[1],command[2],command[3],
	 foe[0],foe[1],foe[2],foe[3]):
		return false
	var previous: Dictionary=last_state
	var encoded: PackedByteArray=_combat.save_checkpoint()
	if encoded.size()!=228:
		stop_training()
		push_error("Native combat state exceeded bounded canonical checkpoint format")
		return false
	last_state=_combat.get_state()
	input_trace.append({"tick":int(last_state["tick"]),"player":command.duplicate(),"dummy":foe.duplicate()})
	if input_trace.size()>INPUT_TRACE_LIMIT:
		input_trace.pop_front()
	if dummy_recording and not last_state.get("over",false) and int(last_state.get("ready",0))==0 and int(last_state.get("end",0))==0:
		if dummy_tape.size()<DUMMY_TAPE_LIMIT:
			dummy_tape.append(command.duplicate())
		if dummy_tape.size()>=DUMMY_TAPE_LIMIT:
			dummy_recording=false
	snapshots.append(encoded)
	if snapshots.size()>MAX_HISTORY_FRAMES+1:
		snapshots.pop_front()
		history_start_tick+=1
	get_parent().apply_authoritative_state(last_state)
	get_parent().get_node("NativeAudio").accept_local_transition(previous,last_state)
	practice_state.emit(last_state)
	if last_state.get("over",false):
		set_physics_process(false)
	return true

func get_input_trace(limit: int=30) -> Array:
	if not active or limit<1 or limit>INPUT_TRACE_LIMIT:
		return []
	return input_trace.slice(maxi(0,input_trace.size()-limit)).duplicate(true)

func get_frame_meter(slot: int=0) -> Dictionary:
	if not active or slot<0 or slot>1 or last_state.is_empty():
		return {}
	var fighter: Dictionary=last_state["p"][slot]
	var action: String=str(fighter.get("act",""))
	var timings: Array=LEGACY_FRAME_TABLE.get(action,[0,0,0])
	var age: int=int(fighter.get("age",0))
	var startup: int=int(timings[0])
	var active_frames: int=int(timings[1])
	var recovery: int=int(timings[2])
	var total: int=startup+active_frames+recovery
	var phase: String="idle"
	if action!="":
		phase="startup" if age<startup else "active" if age<startup+active_frames else "recovery"
	return {"rules":"seamless-side/1","slot":slot,"action":action,
		"phase":phase,"age":age,"startup":startup,"active":active_frames,
		"recovery":recovery,"remaining":maxi(0,total-age),
		"source":"legacy-C++-frame-table-not-Hunt-v3"}

func _physics_process(_delta: float) -> void:
	if not active or _combat == null:
		return
	var controls_panel: CanvasLayer=get_parent().get_node("InputSettings")
	var menu: CanvasLayer=get_parent().get_node_or_null("NativeMenu")
	var video: CanvasLayer=get_parent().get_node("GraphicsSettings")
	var blocked := controls_panel.visible or video.visible or (menu != null and menu.visible)
	var command: Array = [0,0,0,0] if blocked else get_parent().get_node("NativeControls").encoded_input()
	if command.size()!=4 or not _advance_state(command):
		stop_training()
