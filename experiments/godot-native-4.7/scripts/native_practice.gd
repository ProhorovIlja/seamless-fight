extends Node
## Developer-local training harness using the exact native C++ 60Hz rules.
## No fake "human AI", ranking, account service, network prediction or CPU bot
## learning is claimed. This remains outside public matchmaking.
signal practice_state(snapshot: Dictionary)
signal practice_stopped()
const ALLOWED_BOTS := ["passive","easy","normal","hard"]
const HZ := 60
var _combat: Object = null
var bot := "normal"
var active := false
var last_state: Dictionary = {}

func _ready() -> void:
	set_physics_process(false)

func start_training(profile: String = "normal") -> bool:
	if profile not in ALLOWED_BOTS or not ClassDB.class_exists("SFCombat"):
		return false
	var instance: Object = ClassDB.instantiate("SFCombat")
	if instance == null:
		return false
	_combat=instance
	bot=profile
	active=true
	last_state=_combat.get_state()
	get_parent().last_confirmed_tick=-1
	get_parent().apply_authoritative_state(last_state)
	set_physics_process(true)
	practice_state.emit(last_state)
	return true

func stop_training() -> void:
	active=false
	set_physics_process(false)
	_combat=null
	last_state={}
	practice_stopped.emit()

func reset_rounds() -> bool:
	if not active or _combat==null:
		return false
	_combat.reset()
	last_state=_combat.get_state()
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

func _physics_process(_delta: float) -> void:
	if not active or _combat == null:
		return
	var command: Array[int] = get_parent().get_node("NativeControls").encoded_input()
	if command.size()!=4:
		stop_training()
		return
	var foe: Array[int] = _bot_input(last_state)
	if not _combat.step_encoded(command[0],command[1],command[2],command[3],
	 foe[0],foe[1],foe[2],foe[3]):
		push_error("Native training rejected a control packet")
		stop_training()
		return
	last_state=_combat.get_state()
	get_parent().apply_authoritative_state(last_state)
	practice_state.emit(last_state)
	if last_state.get("over",false):
		set_physics_process(false)
