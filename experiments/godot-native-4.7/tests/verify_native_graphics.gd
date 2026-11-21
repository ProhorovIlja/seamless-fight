extends SceneTree
const Stage = preload("res://scenes/stage.tscn")
const Graphics = preload("res://scripts/native_graphics.gd")
const Transport = preload("res://scripts/native_side_transport.gd")
func _initialize() -> void:
	call_deferred("_verify")
func _fail(message: String) -> void:
	push_error(message)
	quit(1)
func _verify() -> void:
	var stage := Stage.instantiate()
	root.add_child(stage)
	await process_frame
	if (stage.get_node("CombatCamera") as Camera3D).projection != Camera3D.PROJECTION_ORTHOGONAL:
		_fail("Native 2.5D camera not orthographic")
		return
	if stage.get_node_or_null("OriginalPaintedReliquary")==null:
		_fail("Missing original painted Gothic stage")
		return
	if not stage.set_visual_stage("moonlit"):
		_fail("Could not activate actual site-art skyline stage")
		return
	var site: Node3D = stage.get_node("SiteBackdrop")
	if not site.visible or not site.has_node("FarCity") or not site.has_node("Moon") or not site.has_node("Mist"):
		_fail("Site-backed 2.5D arena lacks required original artwork")
		return
	if stage.get_node("OriginalPaintedReliquary").visible:
		_fail("Two stage artworks rendered on top of each other")
		return
	var origin: Vector3 = stage.world_position(255.0,436.0)
	if stage.set_visual_stage("unknown") or stage.world_position(255.0,436.0) != origin:
		_fail("Stage art changed authoritative combat projection or accepted invalid theme")
		return
	site.set_reduce_motion(true)
	if site.is_processing():
		_fail("Reduced-motion preference must stop scenery drift")
		return
	if not stage.set_visual_stage("reliquary") or not stage.get_node("OriginalPaintedReliquary").visible:
		_fail("Original stage restoration failed")
		return

	var options := Graphics.new()
	root.add_child(options)
	var profile := options.default_profile()
	if not options.validate_profile(profile).is_empty():
		_fail("Default graphics profile invalid")
		return
	var false_feature := profile.duplicate()
	false_feature["dlss_5"]=true
	if options.validate_profile(false_feature).is_empty():
		_fail("Unimplemented NVIDIA feature was falsely exposed")
		return
	false_feature=profile.duplicate()
	false_feature["scale"]=3.0
	if options.validate_profile(false_feature).is_empty():
		_fail("Unsafe render scale accepted")
		return
	if not options.apply_profile(profile) or Engine.max_fps!=120:
		_fail("Native FPS/quality settings did not apply")
		return
	if absf(root.scaling_3d_scale-1.0)>0.001:
		_fail("Native 3D resolution changed unexpectedly")
		return
	for feature in ["dlss_5","fsr_4_1_2","xess_3","nvidia_reflex","frame_generation"]:
		if options.available_features()[feature]:
			_fail("Unsupported GPU SDK misrepresented: "+feature)
			return
	var point: Vector3 = stage.world_position(255.0,436.0)
	if absf(point.x+3.75)>0.001 or point.z!=0:
		_fail("Combat plane was altered by native graphics")
		return
	var network := Transport.new()
	root.add_child(network)
	if not network.has_method("send_fighter_input") or not network.has_method("open_private_room"):
		_fail("Server transport unavailable in native client")
		return
	print("GODOT_NATIVE_PC_GRAPHICS_BASELINE_PASSED: original painting, fixed camera, VSync and cap settings, no fake vendor features")
	quit(0)
