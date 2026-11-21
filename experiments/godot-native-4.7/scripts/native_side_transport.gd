extends Node
const WireNumbers=preload("res://scripts/native_wire_numbers.gd")
## Native Godot bridge to the existing UNRATED private side-view transport.
## Never evaluates untrusted match results or changes deterministic engine state.
## Native WebSocket Origin is a compatibility header, NOT authentication.
signal room_ready(code: String, slot: int)
signal spectator_joined(snapshot: Dictionary, stage: String)
signal gallery_changed(code: String)
signal spectator_count_changed(viewers: int)
signal match_started(snapshot: Dictionary)
signal authoritative_state(snapshot: Dictionary, ack: int, events: Array)
signal server_notice(message: String)
signal connection_failed(message: String)
signal room_disconnected()
signal latency_sample(rtt_ms: int, variation_ms: int)

const RULESET := "seamless-side/1"
const ENDPOINT := "/fight/side/socket"
const MAX_PACKET_BYTES := 160000
const MAX_BUFFERED_BYTES := 2048
const CONNECTION_TIMEOUT_MS := 10000
const PROBE_INTERVAL_MS := 1000
const PROBE_TIMEOUT_MS := 4000
const PROBE_WINDOW := 12
var pending_probe_id := -1
var pending_probe_at := -1
var last_probe_at := -10000
var next_probe_id := 1
var rtt_samples: Array[int] = []

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
var requested_watch := false
var spectating := false

func open_public_spectator(endpoint: String, origin: String, watch_code: String) -> bool:
	if watch_code.is_empty():
		return false
	return open_private_room(endpoint,origin,watch_code,"reliquary",true)

func open_private_room(endpoint: String, origin: String, code: String = "", stage: String = "reliquary", watch: bool = false) -> bool:
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
	requested_watch = watch
	handshake_at = Time.get_ticks_msec()
	reset_latency()
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
			var hello := {"t": "watch", "code": requested_code} if requested_watch else {"t": "hello", "code": invitation, "stage": requested_stage, "look": {}}
			if socket.send_text(JSON.stringify(hello)) != OK:
				connection_failed.emit("Unable to send room greeting")
				close()
				return
		_tick_latency_probe()
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
		elif local_slot >= 0 or spectating:
			server_notice.emit("Side-view room disconnected")
		socket = null
		opened = false
		room_code = ""
		local_slot = -1
		spectating=false
		requested_watch=false
		set_process(false)
		reset_latency()
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
	if kind == "pong":
		_accept_probe(message.get("id"))
	elif kind == "room":
		var new_slot: int = WireNumbers.checked_nonnegative(message.get("slot",-1),1)
		var new_code: String = str(message.get("code", ""))
		var pattern := RegEx.create_from_string("^[A-Za-z0-9_-]{12}$")
		if not [0, 1].has(new_slot) or pattern.search(new_code) == null:
			connection_failed.emit("Malformed server room")
			close()
			return
		local_slot = new_slot
		room_code = new_code
		room_ready.emit(room_code, local_slot)
	elif kind == "watching":
		if not requested_watch:
			return
		var snapshot: Variant=message.get("s")
		var stage: String=str(message.get("stage",""))
		if not snapshot is Dictionary or snapshot.get("rules","")!=RULESET or not ["reliquary","lantern","cistern"].has(stage):
			connection_failed.emit("Untrusted spectator snapshot")
			close()
			return
		var players: Variant=snapshot.get("p")
		if not players is Array or players.size()!=2 or WireNumbers.checked_nonnegative(snapshot.get("tick",-1),100000000)<0:
			connection_failed.emit("Invalid 1v1 spectator snapshot")
			close()
			return
		spectating=true
		local_slot=-1
		sequence=0
		latest_tick=int(snapshot.get("tick",0))
		spectator_joined.emit(snapshot,stage)
	elif kind == "gallery":
		if local_slot==0 and not requested_watch:
			var code: Variant=message.get("code")
			var raw: String="" if code==null else str(code)
			var pattern := RegEx.create_from_string("^[A-Za-z0-9_-]{12}$")
			if raw.is_empty() or pattern.search(raw)!=null:
				gallery_changed.emit(raw)
	elif kind == "audience":
		if local_slot==0 and not requested_watch:
			var viewers: int=WireNumbers.checked_nonnegative(message.get("viewers",-1),6)
			if viewers>=0:
				spectator_count_changed.emit(viewers)
	elif kind == "start":
		if message.get("s") is Dictionary:
			sequence = 0
			latest_tick = -1
			match_started.emit(message["s"])
	elif kind == "state":
		var snapshot: Variant = message.get("s")
		if not snapshot is Dictionary or snapshot.get("rules", "") != RULESET:
			return
		var tick: int = WireNumbers.checked_nonnegative(snapshot.get("tick"),100000000)
		if tick < 0 or tick <= latest_tick:
			return
		var players: Variant = snapshot.get("p")
		if not players is Array or players.size() != 2:
			return
		latest_tick = tick
		var ack: int = WireNumbers.checked_nonnegative(message.get("ack",0),2147480000)
		if ack < 0:
			return
		var ev: Variant = message.get("events", [])
		var events: Array = ev if ev is Array else []
		authoritative_state.emit(snapshot, ack, events)
	elif kind == "notice" or kind == "error":
		server_notice.emit(str(message.get("message", "")))

func send_fighter_input(x: int, y: int, action: String = "", guard: bool = false) -> bool:
	if socket == null or socket.get_ready_state() != WebSocketPeer.STATE_OPEN or local_slot < 0 or spectating:
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

func change_public_gallery(open: bool) -> bool:
	if local_slot!=0 or spectating or socket==null or socket.get_ready_state()!=WebSocketPeer.STATE_OPEN:
		return false
	return socket.send_text(JSON.stringify({"t":"gallery","open":open}))==OK

func reset_latency() -> void:
	pending_probe_id=-1
	pending_probe_at=-1
	last_probe_at=-10000
	next_probe_id=1
	rtt_samples.clear()

func _tick_latency_probe() -> void:
	if socket==null or socket.get_ready_state()!=WebSocketPeer.STATE_OPEN or local_slot<0:
		return
	var now: int=Time.get_ticks_msec()
	if pending_probe_id>=0 and now-pending_probe_at>=PROBE_TIMEOUT_MS:
		pending_probe_id=-1
		pending_probe_at=-1
	if pending_probe_id>=0 or now-last_probe_at<PROBE_INTERVAL_MS:
		return
	if socket.get_current_outbound_buffered_amount()>MAX_BUFFERED_BYTES:
		return
	if send_latency_probe(next_probe_id):
		pending_probe_id=next_probe_id
		pending_probe_at=now
		last_probe_at=now
		next_probe_id+=1
		if next_probe_id>=2000000000:
			next_probe_id=1

func _accept_probe(wire_id: Variant) -> bool:
	var id: int=WireNumbers.checked_nonnegative(wire_id,2000000000)
	if id<0 or id!=pending_probe_id or pending_probe_at<0:
		return false
	var elapsed: int=Time.get_ticks_msec()-pending_probe_at
	pending_probe_id=-1
	pending_probe_at=-1
	if elapsed<0 or elapsed>PROBE_TIMEOUT_MS:
		return false
	rtt_samples.append(elapsed)
	if rtt_samples.size()>PROBE_WINDOW:
		rtt_samples.pop_front()
	var low := PROBE_TIMEOUT_MS
	var high := 0
	for sample in rtt_samples:
		low=mini(low,sample)
		high=maxi(high,sample)
	latency_sample.emit(elapsed,high-low)
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
	spectating = false
	requested_watch = false
	latest_tick = -1
	sequence = 0
	reset_latency()
	set_process(false)
