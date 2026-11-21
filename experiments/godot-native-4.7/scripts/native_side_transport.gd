extends Node
## Native Godot bridge to the existing UNRATED private side-view transport.
## Never evaluates untrusted match results or changes deterministic engine state.
## Native WebSocket Origin is a compatibility header, NOT authentication.
signal room_ready(code: String, slot: int)
signal match_started(snapshot: Dictionary)
signal authoritative_state(snapshot: Dictionary, ack: int, events: Array)
signal server_notice(message: String)
signal connection_failed(message: String)
signal room_disconnected()

const RULESET := "seamless-side/1"
const ENDPOINT := "/fight/side/socket"
const MAX_PACKET_BYTES := 160000
const MAX_BUFFERED_BYTES := 2048
const CONNECTION_TIMEOUT_MS := 10000

var socket: WebSocketPeer = null
var handshake_at: int = 0
var last_sent_at: int = -10000
var opened := false
var room_code := ""
var local_slot := -1
var latest_tick := -1
var sequence := 0
var requested_code := ""
var requested_stage := "reliquary"

func open_private_room(endpoint: String, origin: String, code: String = "", stage: String = "reliquary") -> bool:
	close()
	# The legacy server has no account-bound credentials; do not attach any
	# access tokens, Discord information or user identifiers here.
	if not endpoint.ends_with(ENDPOINT) or not (endpoint.begins_with("ws://") or endpoint.begins_with("wss://")):
		connection_failed.emit("Invalid side-view WebSocket endpoint")
		return false
	var normalized := endpoint.trim_suffix(ENDPOINT).replace("wss://", "https://").replace("ws://", "http://")
	if normalized != origin or not (origin.begins_with("http://") or origin.begins_with("https://")):
		connection_failed.emit("The server origin does not match the connection")
		return false
	if code != "":
		var pattern := RegEx.create_from_string("^[A-Za-z0-9_-]{12}$")
		if pattern.search(code) == null:
			connection_failed.emit("Invalid room invitation")
			return false
	if not ["reliquary", "lantern", "cistern"].has(stage):
		connection_failed.emit("Invalid arena")
		return false
	var new_socket := WebSocketPeer.new()
	new_socket.handshake_headers = PackedStringArray(["Origin: " + origin])
	new_socket.max_queued_packets = 128
	new_socket.inbound_buffer_size = 262144
	var result := new_socket.connect_to_url(endpoint)
	if result != OK:
		connection_failed.emit("Could not initiate connection")
		return false
	socket = new_socket
	opened = false
	requested_code = code
	requested_stage = stage
	handshake_at = Time.get_ticks_msec()
	set_process(true)
	return true

func _process(_delta: float) -> void:
	if socket == null:
		return
	socket.poll()
	var state := socket.get_ready_state()
	if state == WebSocketPeer.STATE_OPEN:
		if not opened:
			opened = true
			var invitation: Variant = null if requested_code == "" else requested_code
			var hello := {"t": "hello", "code": invitation, "stage": requested_stage, "look": {}}
			if socket.send_text(JSON.stringify(hello)) != OK:
				connection_failed.emit("Unable to send room greeting")
				close()
				return
		var count := 0
		while socket != null and socket.get_ready_state() == WebSocketPeer.STATE_OPEN and socket.get_available_packet_count() > 0 and count < 48:
			count += 1
			var packet := socket.get_packet()
			if not socket.was_string_packet() or packet.size() > MAX_PACKET_BYTES:
				connection_failed.emit("Unexpected server packet")
				close()
				return
			var message: Variant = JSON.parse_string(packet.get_string_from_utf8())
			if message is Dictionary:
				_handle_message(message)
	elif state == WebSocketPeer.STATE_CLOSED:
		if not opened:
			connection_failed.emit("Server connection failed or was rejected")
		elif local_slot >= 0:
			server_notice.emit("Side-view room disconnected")
		socket = null
		opened = false
		room_code = ""
		local_slot = -1
		set_process(false)
		room_disconnected.emit()
	elif not opened and Time.get_ticks_msec() - handshake_at >= CONNECTION_TIMEOUT_MS:
		connection_failed.emit("Connection timed out")
		close()

func _handle_message(message: Dictionary) -> void:
	if message.has("rules") and message["rules"] != RULESET:
		connection_failed.emit("Incompatible side-view ruleset")
		close()
		return
	var kind: String = str(message.get("t", ""))
	if kind == "room":
		var new_slot: int = int(message.get("slot", -1))
		var new_code: String = str(message.get("code", ""))
		var pattern := RegEx.create_from_string("^[A-Za-z0-9_-]{12}$")
		if not [0, 1].has(new_slot) or pattern.search(new_code) == null:
			connection_failed.emit("Malformed server room")
			close()
			return
		local_slot = new_slot
		room_code = new_code
		room_ready.emit(room_code, local_slot)
	elif kind == "start":
		if message.get("s") is Dictionary:
			sequence = 0
			latest_tick = -1
			match_started.emit(message["s"])
	elif kind == "state":
		var snapshot: Variant = message.get("s")
		if not snapshot is Dictionary or snapshot.get("rules", "") != RULESET:
			return
		var tick: Variant = snapshot.get("tick")
		if typeof(tick) != TYPE_INT or tick <= latest_tick or tick < 0:
			return
		var players: Variant = snapshot.get("p")
		if not players is Array or players.size() != 2:
			return
		latest_tick = tick
		var ack: int = maxi(0, int(message.get("ack", 0)))
		var ev: Variant = message.get("events", [])
		var events: Array = ev if ev is Array else []
		authoritative_state.emit(snapshot, ack, events)
	elif kind == "notice" or kind == "error":
		server_notice.emit(str(message.get("message", "")))

func send_fighter_input(x: int, y: int, action: String = "", guard: bool = false) -> bool:
	if socket == null or socket.get_ready_state() != WebSocketPeer.STATE_OPEN or local_slot < 0:
		return false
	if not [-1, 0, 1].has(x) or not [-1, 0, 1].has(y):
		return false
	if not ["", "cut", "hew", "shot", "step", "feint"].has(action):
		return false
	var now := Time.get_ticks_msec()
	if now - last_sent_at < 12 or socket.get_current_outbound_buffered_amount() > MAX_BUFFERED_BYTES:
		return false
	var next := sequence + 1
	if next >= 2147480000:
		return false
	var input := {"t": "input", "x": x, "y": y, "act": action, "guard": guard, "seq": next}
	if socket.send_text(JSON.stringify(input)) != OK:
		return false
	sequence = next
	last_sent_at = now
	return true

func send_latency_probe(id: int) -> bool:
	if socket == null or socket.get_ready_state() != WebSocketPeer.STATE_OPEN or id < 0:
		return false
	return socket.send_text(JSON.stringify({"t": "ping", "id": id})) == OK

func close() -> void:
	if socket != null and socket.get_ready_state() != WebSocketPeer.STATE_CLOSED:
		socket.close(1000, "leaving native side-view preview")
	socket = null
	opened = false
	room_code = ""
	local_slot = -1
	latest_tick = -1
	sequence = 0
	set_process(false)
