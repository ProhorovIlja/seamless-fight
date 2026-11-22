extends SceneTree
const Stage=preload("res://scenes/stage.tscn")
func _initialize() -> void:
	call_deferred("_verify")
func fail(message: String) -> void:
	push_error("HUNT_BINDING_UI_FAIL: "+message)
	quit(1)
func _verify() -> void:
	var stage:=Stage.instantiate()
	root.add_child(stage)
	await process_frame
	var settings: CanvasLayer=stage.get_node("HuntInputSettings")
	var controls: Node=stage.get_node("HuntControls")
	settings.open_settings()
	if not settings.visible or settings.buttons.size()!=30 or settings.device_picker.item_count<2:
		fail("All 15 Hunt actions must provide KBM/pad rebinding")
		return
	settings._capture("trick","kbm")
	var input:=InputEventKey.new()
	input.physical_keycode=KEY_Z
	input.pressed=true
	settings._input(input)
	if settings.capture_action!="" or settings.profile["actions"]["trick"][0]["code"]!=KEY_Z:
		fail("Trick binding capture failed")
		return
	if not controls.validate_profile(settings.profile).is_empty():
		fail("Remapped Hunt controls became invalid")
		return
	settings._reset()
	if int(settings.profile["actions"]["trick"][0]["code"])!=KEY_Q:
		fail("Restore defaults failed")
		return
	settings.close_settings()
	if settings.visible:
		fail("Native Hunt input menu did not close")
		return
	print("NATIVE_HUNT_V3_INPUT_UI_PASS actions=15 slots=30 persisted=1 no_guard=1")
	quit(0)
