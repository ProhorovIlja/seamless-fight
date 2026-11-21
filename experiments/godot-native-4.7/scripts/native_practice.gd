extends Node
## Developer-local training harness using the exact native C++ 60Hz rules.
## No fake "human AI", ranking, account service, network prediction or CPU bot
## learning is claimed. This remains outside public matchmaking.
signal practice_state(snapshot: Dictionary)
signal practice_stopped()
const ALLOWED_BOTS := ["passive","easy","normal","hard"]
const HZ := 60
const MAX_HISTORY_FRAMES := 720
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
	last_state=_combat.get_state()
	snapshots.clear()
	history_start_tick=0
	var initial: PackedByteArray=_combat.save_checkpoint()
	if initial.size()!=228:
		stop_training()
		return false
	snapshots.append(initial)
	get_parent().get_node("CombatHud").reset_mode("TRAINING",true)
	get_parent().last_confirmed_tick=-1
	get_parent().apply_authoritative_state(last_state)
	set_physics_process(true)
	practice_state.emit(last_state)
	return true

func stop_training() -> void:
	active=false
	paused=false
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
	var original: PackedByteArray=_combat.save_checkpoint()
	if not _combat.load_checkpoint(snapshots[index]):
		if original.size()==228:
			_combat.load_checkpoint(original)
		return false
	snapshots.resize(index+1)
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

func _advance_state(command: Array[int]) -> bool:
	if command.size()!=4 or _combat==null:
		return false
	var foe: Array[int]=_bot_input(last_state)
	if not _combat.step_encoded(command[0],command[1],command[2],command[3],
	 foe[0],foe[1],foe[2],foe[3]):
		return false
	var encoded: PackedByteArray=_combat.save_checkpoint()
	if encoded.size()!=228:
		stop_training()
		push_error("Native combat state exceeded bounded canonical checkpoint format")
		return false
	last_state=_combat.get_state()
	snapshots.append(encoded)
	if snapshots.size()>MAX_HISTORY_FRAMES+1:
		snapshots.pop_front()
		history_start_tick+=1
	get_parent().apply_authoritative_state(last_state)
	practice_state.emit(last_state)
	if last_state.get("over",false):
		set_physics_process(false)
	return true

func _physics_process(_delta: float) -> void:
	if not active or _combat == null:
		return
	var controls_panel: CanvasLayer=get_parent().get_node("InputSettings")
	var menu: CanvasLayer=get_parent().get_node_or_null("NativeMenu")
	var blocked := controls_panel.visible or (menu != null and menu.visible)
	var command: Array[int] = [0,0,0,0] if blocked else get_parent().get_node("NativeControls").encoded_input()
	if command.size()!=4 or not _advance_state(command):
		stop_training()
