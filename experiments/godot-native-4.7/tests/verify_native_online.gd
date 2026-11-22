extends SceneTree
## Two real Godot 4.7 native-renderer scenes, existing local Node side server.
## Private 1v1 session only; no fake ranked/P2P, no network rollback claim.
const Stage = preload("res://scenes/stage.tscn")
const ORIGIN := "http://127.0.0.1:18893"
const ENDPOINT := "ws://127.0.0.1:18893/fight/side/socket"
var code := ""
var guest_code := ""
var errors: Array[String]=[]
var host: Node3D
var guest: Node3D
var host_started := false
var guest_started := false
var host_rtt_count := 0
var last_host_rtt := -1

func _initialize() -> void:
	call_deferred("_verify")

func _fail(message: String) -> void:
	errors.append(message)
	push_error("NATIVE_GODOT_PRIVATE_1V1_FAIL: "+message)

func _host_room(invitation: String,slot: int) -> void:
	code=invitation
	if slot!=0: _fail("Host must occupy slot zero")

func _guest_room(invitation: String,slot: int) -> void:
	guest_code=invitation
	if slot!=1: _fail("Guest must occupy slot one")

func _verify() -> void:
	host=Stage.instantiate()
	guest=Stage.instantiate()
	root.add_child(host)
	root.add_child(guest)
	await process_frame
	var h: Node=host.get_node("Online")
	var g: Node=guest.get_node("Online")
	h.room_code_ready.connect(_host_room)
	g.room_code_ready.connect(_guest_room)
	h.transport.match_started.connect(func(_s): host_started=true)
	h.network_health.connect(func(rtt: int, spread: int):
		host_rtt_count+=1
		last_host_rtt=rtt
		if rtt<0 or rtt>4000 or spread<0 or spread>4000:
			_fail("Bounded server echo RTT invalid")
	)
	g.transport.match_started.connect(func(_s): guest_started=true)
	# Reject the untrusted endpoint and origin before opening the real room.
	if host.connect_private_1v1(ENDPOINT,"http://wrong.example"):
		_fail("Mismatched Origin was accepted")
	if host.connect_private_1v1("ws://127.0.0.1:18893/invalid",ORIGIN):
		_fail("Unrecognized fighting endpoint was accepted")
	if host.connect_private_1v1(ENDPOINT,ORIGIN,"bad-code"):
		_fail("Invalid room code was accepted")
	if not errors.is_empty():
		quit(1)
		return
	if not host.connect_private_1v1(ENDPOINT,ORIGIN):
		_fail("Native Windows scene refused actual private server")
		quit(1)
		return
	h.set_physics_process(false)
	var t := Time.get_ticks_msec()
	while code=="" and Time.get_ticks_msec()-t<4000:
		await create_timer(0.02).timeout
	if code.length()!=12 or not guest.connect_private_1v1(ENDPOINT,ORIGIN,code):
		_fail("Failed to host and join same 12-character private room")
		quit(1)
		return
	g.set_physics_process(false)
	# A visible native menu must send neutral input without a GDScript
	# Array[int]/Array conversion error. Production also calls this path.
	h._physics_process(1.0/60.0)
	g._physics_process(1.0/60.0)
	t=Time.get_ticks_msec()
	while (not host_started or not guest_started) and Time.get_ticks_msec()-t<4000:
		await create_timer(0.02).timeout
	if not host_started or not guest_started or guest_code!=code:
		_fail("Two native scenes did not receive actual match starts")
		quit(1)
		return
	var last_host_x := 255.0
	t=Time.get_ticks_msec()
	while host.last_confirmed_tick<132 and Time.get_ticks_msec()-t<6500:
		if host.last_confirmed_tick>92:
			h.transport.send_fighter_input(1,0)
		else:
			h.transport.send_fighter_input(0,0)
		g.transport.send_fighter_input(0,0)
		await create_timer(0.017).timeout
	# Read exact simulation-space coordinates; zero-Z scene projection remains.
	var visual: Node3D=host.get_node("Veil")
	last_host_x=255.0+60.0*(visual.position.x+3.75)
	if host_rtt_count<1:
		var probe_started := Time.get_ticks_msec()
		while host_rtt_count<1 and Time.get_ticks_msec()-probe_started<1800:
			await create_timer(0.03).timeout
	if host_rtt_count<1 or last_host_rtt<0:
		_fail("Server echo latency probes never returned actual RTT")
	if host.last_confirmed_tick<126 or guest.last_confirmed_tick<126:
		_fail("Actual 20 Hz native-renderer server snapshots did not advance")
	if absf(visual.position.z)>0.001 or last_host_x<270.0:
		_fail("Native scene did not follow 60 Hz authoritative movement")
	var latency_text: String=host.get_node("CombatHud").server_latency.text
	if host_rtt_count>0 and latency_text.find("SERVER RTT: ")==-1:
		_fail("Server RTT was not displayed as an observed, non-oneway value")
	if absf(host.get_node("CombatCamera").position.z-12.0)>0.001:
		_fail("Competitive camera left its fixed side-view plane")
	host.disconnect_private_1v1()
	guest.disconnect_private_1v1()
	if not errors.is_empty():
		quit(1)
		return
	print("GODOT_NATIVE_WINDOWS_1V1_SCENES_SERVER_PASS: two native-renderer scenes, real invitation, server snapshots, 2.5D authoritative movement and measured server-echo RTT")
	quit(0)
