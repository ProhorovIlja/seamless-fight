extends SceneTree
## Pure Godot 4.7 transport contract: no live internet, credentials or ranking.
## Verifies 1v1 read-only observer state and host-only public gallery commands.
const Transport=preload("res://scripts/native_side_transport.gd")
func _initialize() -> void:
	call_deferred("_test")
func _fail(message: String) -> void:
	push_error("NATIVE_2_5D_SPECTATOR_FAILURE: "+message)
	quit(1)
func _test() -> void:
	var t: Variant=Transport.new()
	root.add_child(t)
	await process_frame
	var seen: Array[Dictionary]=[]
	var galleries: Array[String]=[]
	var audience: Array[int]=[]
	t.spectator_joined.connect(func(snapshot: Dictionary, stage: String):
		seen.append({"tick":snapshot["tick"],"stage":stage}))
	t.gallery_changed.connect(func(code: String):galleries.append(code))
	t.spectator_count_changed.connect(func(count: int):audience.append(count))
	var snapshot: Dictionary={"rules":"seamless-side/1","tick":28,"p":[
		{"x":255.0,"y":436.0,"hp":100.0},
		{"x":705.0,"y":436.0,"hp":100.0}
	]}
	t._handle_message({"t":"watching","rules":"seamless-side/1",
		"stage":"cistern","s":snapshot})
	if not seen.is_empty():
		_fail("Unsolicited spectator snapshot accepted without watch mode")
		return
	t.requested_watch=true
	t._handle_message({"t":"watching","rules":"seamless-side/1",
		"stage":"cistern","s":snapshot})
	if seen.size()!=1 or seen[0]["tick"]!=28 or seen[0]["stage"]!="cistern":
		_fail("Confirmed versioned 1v1 spectator snapshot rejected")
		return
	if not t.spectating or t.local_slot!=-1 or t.send_fighter_input(1,0,"hew",false):
		_fail("Spectator can become a fighter or send an attack")
		return
	if t.change_public_gallery(true):
		_fail("Spectator can open someone else's public lobby")
		return
	t._handle_message({"t":"gallery","code":"123456789abc"})
	if not galleries.is_empty():
		_fail("Spectator was accepted as host for private gallery")
		return
	var started: Array[int]=[]
	t.match_started.connect(func(s: Dictionary):started.append(int(s["tick"])))
	t._handle_message({"t":"start","rules":"seamless-side/1","s":snapshot})
	if started!=[28]:
		_fail("Rematch start was not delivered to ongoing read-only spectator")
		return
	t.close()
	if t.spectating or t.requested_watch:
		_fail("Observer privileges retained after disconnect")
		return
	t.local_slot=0
	t._handle_message({"t":"gallery","code":"ABCdef_12345"})
	t._handle_message({"t":"audience","viewers":3})
	if galleries!=["ABCdef_12345"] or audience!=[3]:
		_fail("Host gallery and real spectator-count updates rejected")
		return
	t._handle_message({"t":"gallery","code":"../private"})
	t._handle_message({"t":"audience","viewers":7})
	if galleries.size()!=1 or audience.size()!=1:
		_fail("Untrusted watch code or forged viewer overflow was accepted")
		return
	t.queue_free()
	await process_frame
	print("GODOT_NATIVE_SIDE_SPECTATOR_PASS: exact rules, mid-game snapshot, no third fighter, host-only gallery and rematch")
	quit(0)
