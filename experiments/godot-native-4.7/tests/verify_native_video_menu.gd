extends SceneTree
## End-to-end Godot 4.7 UI test for actual engine-backed video options.
## No fake DLSS/FSR4/Reflex SDK capability or invented GPU measurement.
const Stage=preload("res://scenes/stage.tscn")
func _initialize() -> void:
	call_deferred("_verify")
func _fail(message: String) -> void:
	push_error("NATIVE_VIDEO_MENU_FAILED: "+message)
	quit(1)
func _verify() -> void:
	var stage: Variant=Stage.instantiate()
	root.add_child(stage)
	await process_frame
	var gfx: Variant=stage.get_node("GraphicsSettings")
	if gfx.visible or gfx.controller==null:
		_fail("Video settings must initialize actual graphics API and stay closed until requested")
		return
	gfx.open_settings()
	if not gfx.visible or gfx.upscale.item_count<2 or gfx.fps_cap.item_count<7:
		_fail("Accessible renderer choices are missing")
		return
	if gfx.controller.available_features().get("dlss_5",true) or gfx.controller.available_features().get("fsr_4_1_2",true):
		_fail("Native UI falsely advertises unavailable vendor SDKs")
		return
	for i in range(gfx.fps_cap.item_count):
		if gfx.fps_cap.get_item_metadata(i)==60:
			gfx.fps_cap.select(i)
			break
	gfx.render_scale.value=75
	gfx.reduce_motion.button_pressed=true
	if not gfx.apply_settings():
		_fail("Real Godot render profile could not apply and persist")
		return
	if Engine.max_fps!=60 or absf(root.scaling_3d_scale-.75)>0.001:
		_fail("UI input did not change native FPS cap and actual GPU render scale")
		return
	if not stage.get_node("SiteBackdrop").reduce_motion:
		_fail("Saved motion-reduction setting did not stop visual stage motion")
		return
	if gfx.controller.load_profile().get("fps_cap")!=60:
		_fail("Video settings failed to persist to user directory")
		return
	gfx._restore_defaults()
	if Engine.max_fps!=120 or absf(root.scaling_3d_scale-1.0)>0.001:
		_fail("Restoring defaults did not reverse real Godot settings")
		return
	if stage.get_node("SiteBackdrop").reduce_motion:
		_fail("Reset did not restore normal optional scenery animation")
		return
	gfx.close_settings()
	if gfx.visible:
		_fail("Native video settings cannot be closed")
		return
	print("GODOT_NATIVE_VIDEO_MENU_PASSED: actual FPS cap, true 3D render scale, motion reduction, persisted profile, default restore and no fake vendor SDK switches")
	quit(0)
