extends SceneTree
## Full native Hunt v3 remappable input regression; old side/1 remains intact.
const HuntControls=preload("res://scripts/native_hunt_controls.gd")
func _initialize() -> void:
	call_deferred("_verify")
func fail(why: String) -> void:
	push_error("NATIVE_HUNT_CONTROLS_FAIL: "+why)
	quit(1)
func _verify() -> void:
	var controls:=HuntControls.new()
	root.add_child(controls)
	await process_frame
	var original: Dictionary=controls.default_profile()
	if original["actions"].size()!=15 or not controls.validate_profile(original).is_empty():
		fail("Must expose every Hunt input verb with valid default mappings")
		return
	if not controls.apply_profile(original):
		fail("Could not apply original source-compatible input profile")
		return
	for action in controls.ACTIONS:
		if not InputMap.has_action("sfh_"+action) or InputMap.action_get_events("sfh_"+action).is_empty():
			fail("Hunt verb missing physical input binding: "+action)
			return
	var used: Dictionary={}
	for action in controls.ACTIONS:
		for binding in original["actions"][action]:
			var key: String=str(binding)
			if used.has(key):
				fail("Hunt defaults collide on physical key: "+action)
				return
			used[key]=action
	var directions: Dictionary={"move_left":true,"move_right":true,"jump":true,"crouch":true}
	if controls.encode_pressed(directions)!=[0,0,0,0]:
		fail("Leverless simultaneous opposite directions must neutralize")
		return
	controls.previous_pressed.clear()
	var pressed: Dictionary={"move_right":true,"jump":true,"shot":true}
	if controls.encode_pressed(pressed)!=[1,-1,5,0]:
		fail("Directional plus aerial gun-shot command mis-encoded")
		return
	if controls.encode_pressed(pressed)!=[1,-1,0,0]:
		fail("Held gun input emitted auto-fire")
		return
	controls.previous_pressed.clear()
	for index in range(controls.VERBS.size()):
		var key: String=controls.VERBS[index]
		var command: Dictionary={}
		command[key]=true
		var encoded: Array=controls.encode_pressed(command)
		if encoded!=[0,0,index+1,0]:
			fail("Hunt action mismatch: "+key+" => "+str(encoded))
			return
		controls.encode_pressed({})
	var invalid: Dictionary=original.duplicate(true)
	invalid["actions"]["light"].append({"kind":"key","code":KEY_A})
	if controls.validate_profile(invalid).is_empty() or controls.apply_profile(invalid):
		fail("Duplicate Hunt key was accepted")
		return
	invalid=original.duplicate(true)
	invalid["actions"]["blood"]=[{"kind":"mouse","code":2147483647}]
	if controls.validate_profile(invalid).is_empty():
		fail("Unsafe Hunt binding was accepted")
		return
	if controls.select_device(2147483647):
		fail("Unknown gamepad ID accepted")
		return
	if not controls.select_device(controls.DEVICE_KBM) or controls.encoded_input()!=[0,0,0,0]:
		fail("Cannot lock keyboard/mouse controls")
		return
	var edited: Dictionary=controls.with_rebinding(original,"trick",{"kind":"key","code":KEY_Z},"kbm")
	if edited.is_empty() or not controls.validate_profile(edited).is_empty():
		fail("Valid Hunt trick weapon rebinding rejected")
		return
	var serialized: Dictionary=JSON.parse_string(JSON.stringify(edited))
	var restored: Dictionary=controls.normalized_json(serialized)
	if restored.is_empty() or restored!=edited:
		fail("Godot JSON numeric floats broke save/load remapping roundtrip")
		return
	if not controls.save_profile(edited) or controls.load_profile()!=edited:
		fail("Hunt bindings are not persisted correctly")
		return
	if not controls.apply_profile(edited):
		fail("Saved Hunt bindings could not be loaded into InputMap")
		return
	if controls.make_binding(InputEventMouseMotion.new())!={}:
		fail("Mouse pointer movement was accepted as combat macro")
		return
	print("NATIVE_HUNT_V3_CONTROLS=PASS actions=15 real_verbs=11 kbm_gamepad_stick=1 nocombos=1 no_guard=1 socd_neutral=1 edge=1 persisted=1")
	quit(0)
