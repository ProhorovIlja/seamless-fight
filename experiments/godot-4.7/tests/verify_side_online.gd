extends SceneTree

const Transport = preload("res://scripts/native_side_transport.gd")
const Stage = preload("res://scenes/stage.tscn")
const ORIGIN := "http://127.0.0.1:18893"
const ENDPOINT := "ws://127.0.0.1:18893/fight/side/socket"

var host: Node = null
var guest: Node = null
var view: Node3D = null
var errors: Array[String] = []
var room_code := ""
var guest_room_code := ""
var host_started := false
var guest_started := false
var host_ticks := -1
var guest_ticks := -1
var host_first_x := 255.0
var host_last_x := 255.0

func _initialize() -> void:
	call_deferred("_run")

func _issue(message: String) -> void:
	errors.append(message)
	push_error(message)

func _host_room(code: String, slot: int) -> void:
	room_code = code
	if slot != 0:
		_issue("Host must be player zero")

func _guest_room(code: String, slot: int) -> void:
	guest_room_code = code
	if slot != 1:
		_issue("Guest must be player one")

func _host_started(_state: Dictionary) -> void:
	host_started = true

func _guest_started(_state: Dictionary) -> void:
	guest_started = true

func _host_state(state: Dictionary, _ack: int, _events: Array) -> void:
	var tick: int = state.get("tick", -1)
	if tick <= host_ticks:
		_issue("Godot host accepted nonmonotonic server ticks")
	host_ticks = tick
	if state.get("p") is Array and state["p"].size() == 2:
		host_last_x = float(state["p"][0]["x"])
		if not view.apply_authoritative_state(state) and view.last_confirmed_tick != tick:
			_issue("Native 3D view failed to accept legal server state")

func _guest_state(state: Dictionary, _ack: int, _events: Array) -> void:
	var tick: int = state.get("tick", -1)
	if tick <= guest_ticks:
		_issue("Godot guest accepted nonmonotonic server ticks")
	guest_ticks = tick

func _run() -> void:
	host = Transport.new()
	guest = Transport.new()
	view = Stage.instantiate()
	root.add_child(view)
	root.add_child(host)
	root.add_child(guest)
	host.room_ready.connect(_host_room)
	guest.room_ready.connect(_guest_room)
	host.match_started.connect(_host_started)
	guest.match_started.connect(_guest_started)
	host.authoritative_state.connect(_host_state)
	guest.authoritative_state.connect(_guest_state)
	host.connection_failed.connect(_issue)
	guest.connection_failed.connect(_issue)
	if host.open_private_room("ws://127.0.0.1:18893/invalid", ORIGIN):
		_issue("Invalid WebSocket destination accepted")
	if host.open_private_room(ENDPOINT, "http://wrong.example"):
		_issue("Mismatched origin accepted")
	if host.open_private_room(ENDPOINT, ORIGIN, "incorrect-code"):
		_issue("Malformed invitation accepted")
	if not host.open_private_room(ENDPOINT, ORIGIN):
		_issue("Host could not open local 1v1 socket")
	var started := Time.get_ticks_msec()
	while room_code == "" and Time.get_ticks_msec() - started < 4000 and errors.is_empty():
		await create_timer(0.02).timeout
	if room_code.length() != 12:
		_issue("Native host did not receive actual 12-char private invite")
	elif not guest.open_private_room(ENDPOINT, ORIGIN, room_code, "reliquary"):
		_issue("Guest could not use host invitation")
	started = Time.get_ticks_msec()
	while (not host_started or not guest_started) and Time.get_ticks_msec() - started < 4000 and errors.is_empty():
		await create_timer(0.02).timeout
	if not host_started or not guest_started:
		_issue("Native client pair did not receive real server start")
	if guest_room_code != room_code:
		_issue("Guest invitation did not join same server room")
	started = Time.get_ticks_msec()
	while host_ticks < 120 and Time.get_ticks_msec() - started < 5000 and errors.is_empty():
		# Both clients send real canonical input at ~60 Hz after ready time.
		if host_started and host_ticks >= 90:
			host.send_fighter_input(1, 0)
		else:
			host.send_fighter_input(0, 0)
		guest.send_fighter_input(0, 0)
		await create_timer(0.017).timeout
	if host_ticks < 110 or guest_ticks < 110:
		_issue("Native clients did not receive 20Hz server-authoritative snapshots")
	if host_last_x <= host_first_x + 15.0:
		_issue("Server did not accept native Windows-style fighter movement")
	if absf(float(view.get_node("Veil").position.x) - (host_last_x - 480.0) / 60.0) > 0.15:
		_issue("3D view is inconsistent with trusted server world position")
	if not errors.is_empty():
		print("GODOT_NATIVE_PRIVATE_PVP_TEST_FAILED ", errors)
		host.close()
		guest.close()
		quit(1)
		return
	print("GODOT_NATIVE_PRIVATE_PVP_BRIDGE_PASSED: two Godot clients, Origin, invitation, 60Hz input, 20Hz snapshots, fixed-plane render")
	host.close()
	guest.close()
	quit(0)
