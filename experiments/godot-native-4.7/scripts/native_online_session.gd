extends Node
## Headless-safe bridge from existing unrated Node side-view private 1v1
## to the native 2.5D render stage. Server owns combat results.
## Transport is WebSocket/20Hz snapshots, NOT GGPO/UDP or ranked.
signal room_code_ready(code: String, slot: int)
signal connection_state(message: String)
signal network_health(rtt_ms: int, variation_ms: int)
const Transport = preload("res://scripts/native_side_transport.gd")
var transport: Node
var online := false
var started := false
var latest_ack := 0

func _ready() -> void:
	transport=Transport.new()
	transport.name="Transport"
	add_child(transport)
	transport.room_ready.connect(_on_room)
	transport.match_started.connect(_on_match_start)
	transport.authoritative_state.connect(_on_snapshot)
	transport.server_notice.connect(_on_notice)
	transport.connection_failed.connect(_on_notice)
	transport.room_disconnected.connect(_on_disconnected)
	transport.latency_sample.connect(_on_latency_sample)
	set_physics_process(false)

func open_room(endpoint: String, origin: String, invitation: String="", stage: String="reliquary") -> bool:
	if get_parent().get_node("Practice").active:
		return false
	close_room()
	if not transport.open_private_room(endpoint,origin,invitation,stage):
		return false
	online=true
	latest_ack=0
	set_physics_process(true)
	return true

func _on_room(code: String, slot: int) -> void:
	room_code_ready.emit(code,slot)
	connection_state.emit("Private 1v1 room ready for player "+str(slot+1))

func _on_match_start(snapshot: Dictionary) -> void:
	started=true
	latest_ack=0
	get_parent().get_node("NativeAudio").reset_timeline()
	get_parent().get_node("CombatHud").reset_mode("PRIVATE 1V1",false)
	get_parent().last_confirmed_tick=-1
	if not get_parent().apply_authoritative_state(snapshot):
		_on_notice("Invalid server match starting state")
		close_room()
		return
	connection_state.emit("Private unrated duel started")

func _on_snapshot(snapshot: Dictionary, ack: int, events: Array) -> void:
	if not online or not started:
		return
	if ack < latest_ack:
		_on_notice("Non-monotonic server input acknowledgement")
		close_room()
		return
	latest_ack=ack
	if not get_parent().apply_authoritative_state(snapshot):
		_on_notice("Invalid or stale combat snapshot")
	else:
		get_parent().get_node("NativeAudio").accept_events(events,int(snapshot.get("tick",-1)))

func _on_notice(message: String) -> void:
	connection_state.emit(message)

func _on_latency_sample(rtt_ms: int, variation_ms: int) -> void:
	if not online:
		return
	get_parent().get_node("CombatHud").show_server_latency(rtt_ms,variation_ms)
	network_health.emit(rtt_ms,variation_ms)

func _on_disconnected() -> void:
	if not online:
		return
	online=false
	started=false
	latest_ack=0
	set_physics_process(false)
	get_parent().get_node("CombatHud").clear()
	connection_state.emit("Private room disconnected. Create or join a new room.")

func _physics_process(_delta: float) -> void:
	if not online or not started:
		return
	var overlay: CanvasLayer=get_parent().get_node("InputSettings")
	var native_menu: CanvasLayer=get_parent().get_node_or_null("NativeMenu")
	var paused_by_menu := overlay.visible or (native_menu!=null and native_menu.visible)
	var commands: Array[int]=[0,0,0,0] if paused_by_menu else get_parent().get_node("NativeControls").encoded_input()
	transport.send_fighter_input(commands[0],commands[1],["","cut","hew","shot","step","feint"][commands[2]],commands[3]==1)

func close_room() -> void:
	set_physics_process(false)
	online=false
	started=false
	get_parent().get_node("CombatHud").clear()
	latest_ack=0
	if transport!=null:
		transport.close()
