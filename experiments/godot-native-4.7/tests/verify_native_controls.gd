extends SceneTree
const Controls = preload("res://scripts/native_controls.gd")
func _initialize() -> void:
	call_deferred("_verify")
func _fail(message: String) -> void:
	push_error("NATIVE_INPUT_PROFILE_FAILURE: "+message)
	quit(1)
func _verify() -> void:
	var c := Controls.new()
	root.add_child(c)
	await process_frame
	var profile: Dictionary = c.default_profile()
	if not c.validate_profile(profile).is_empty() or not c.apply_profile(profile):
		_fail("Default keyboard and controller profiles rejected")
		return
	for action in c.ACTIONS:
		if not InputMap.has_action(action) or InputMap.action_get_events(action).is_empty():
			_fail("Required native input action missing: "+action)
			return
	var duplicate := profile.duplicate(true)
	duplicate["actions"]["sf_cut"].append({"kind":"key","code":KEY_A})
	if c.validate_profile(duplicate).is_empty() or c.apply_profile(duplicate):
		_fail("Duplicate physical key collision accepted")
		return
	var malicious := profile.duplicate(true)
	malicious["actions"]["sf_shot"]=[{"kind":"pad_button","code":2147483647}]
	if c.validate_profile(malicious).is_empty() or c.save_profile(malicious):
		_fail("Unbounded input ID was accepted")
		return
	var unknown := profile.duplicate(true)
	unknown["actions"]["sf_unknown"]=[{"kind":"key","code":KEY_B}]
	if c.validate_profile(unknown).is_empty():
		_fail("Unsupported game action was accepted")
		return
	var captured := InputEventKey.new()
	captured.physical_keycode=KEY_Z
	captured.pressed=true
	var entry: Dictionary = c.make_binding(captured)
	if entry.get("code",0) != KEY_Z:
		_fail("Keyboard rebinding did not capture physical key")
		return
	var remapped: Dictionary = c.with_rebinding(profile,"sf_cut",entry)
	if remapped.is_empty() or not c.validate_profile(remapped).is_empty() or not c.apply_profile(remapped):
		_fail("A valid rebinding was rejected")
		return
	if InputMap.action_get_events("sf_cut").size()!=1:
		_fail("Rebinding did not replace stale original mappings")
		return
	if not c.apply_profile(profile):
		_fail("Could not restore initial bindings")
		return
	if c.encoded_input().size()!=4:
		_fail("Native input must match 4-field C++/wire format")
		return
	print("NATIVE_INPUT_PROFILE_VERIFIED: KBM/pad defaults, conflicts, strict codes, capture, rebinding and canonical 4-int output")
	quit(0)
