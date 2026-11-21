extends SceneTree
## Contract tests use in-memory deliberately fake rigs; no model is ever shipped.
## Prove low-detail/empty animation inputs are rejected before source acceptance.
const Rig=preload("res://scripts/hunt_rig_socket.gd")
func _initialize() -> void:
	call_deferred("_verify")
func _fail(message: String) -> void:
	push_error("HUNT_V3_PREMIUM_RIG_CONTRACT_FAIL: "+message)
	quit(1)
func _verify() -> void:
	var rig=Rig.new()
	root.add_child(rig)
	await process_frame
	if rig.contract.get("rules","")!="sf-hunt-lab/3" or rig.contract.get("hz",0)!=60:
		_fail("Native rig clip requirements disagree with current Hunt rules")
		return
	var required: Array[String]=rig.required_clips("mournweave")
	if required.size()!=46 or not required.has("airShot") or required.has("airStep") or required.has("guard"):
		_fail("Hunt v3 must require all 28 combat actions plus 18 shared original performances")
		return
	if not rig.required_clips("fake-weapon").is_empty():
		_fail("Unknown proprietary weapon accepted")
		return
	if rig.install_original_hunter("res://assets/characters/../escape.glb","mournweave"):
		_fail("Original character import allowed directory traversal")
		return
	if rig.install_original_hunter("res://assets/characters/absent.glb","mournweave"):
		_fail("Missing original character was replaced by placeholder")
		return
	var actor := Node3D.new()
	rig.add_child(actor)
	if rig.validate_original_rig(actor,"mournweave").is_empty():
		_fail("Empty model accepted as premium original art")
		return
	var skeleton := Skeleton3D.new()
	skeleton.name="Skeleton3D"
	for i in range(42):
		skeleton.add_bone("Bone_"+str(i))
	actor.add_child(skeleton)
	var mesh := MeshInstance3D.new()
	var sphere := SphereMesh.new()
	sphere.radial_segments=96
	sphere.rings=120
	mesh.mesh=sphere
	var skin := Skin.new()
	for i in range(42):
		skin.add_bind(i,Transform3D.IDENTITY)
	mesh.skin=skin
	mesh.skeleton=NodePath("../Skeleton3D")
	actor.add_child(mesh)
	var player := AnimationPlayer.new()
	actor.add_child(player)
	var library := AnimationLibrary.new()
	for clip_name in required:
		var clip := Animation.new()
		clip.length=2.2
		library.add_animation(clip_name,clip)
	player.add_animation_library("",library)
	if rig.validate_original_rig(actor,"mournweave").is_empty():
		_fail("Technically detailed mesh with 46 EMPTY animation names passed")
		return
	for clip_name in required:
		var clip: Animation=library.get_animation(clip_name)
		for bone in range(2):
			var track=clip.add_track(Animation.TYPE_ROTATION_3D)
			clip.track_set_path(track,NodePath("Skeleton3D:Bone_"+str(bone)))
			clip.track_insert_key(track,0.0,Quaternion.IDENTITY)
			clip.track_insert_key(track,0.25,Quaternion(Vector3.UP,0.14))
	if not rig.validate_original_rig(actor,"mournweave").is_empty():
		_fail("42-bone, 8000+ skinned vertices and all 46 keyed clip names rejected")
		return
	rig.animator=player
	rig.bound_weapon="mournweave"
	var fighter={
		"act":"foldedHeavy","age":23,"x":430.0,"y":436.0,"vx":0.0,
		"crouch":false,"weapon":"mournweave"
	}
	var snapshot={"rules":"sf-hunt-lab/3","tick":1,
		"p":[fighter,fighter.duplicate(true)]}
	if not rig.apply_confirmed_pose(snapshot):
		_fail("Hunt confirmed combat pose was rejected")
		return
	if player.current_animation!="foldedHeavy" or absf(player.current_animation_position-23.0/60.0)>0.001:
		_fail("3D heavy animation does not sample authoritative 60Hz combat age")
		return
	if rig.apply_confirmed_pose(snapshot):
		_fail("Duplicate tick should never resample an animation")
		return
	var next=snapshot.duplicate(true)
	next["tick"]=2
	next["p"][0]["act"]="airShot"
	next["p"][0]["age"]=10
	if not rig.apply_confirmed_pose(next) or player.current_animation!="airShot":
		_fail("Airborne firearm animation did not resolve to real clip")
		return
	if absf(player.current_animation_position-10.0/60.0)>0.001:
		_fail("Airborne firearm sampled wall-clock instead of game frame")
		return
	next["tick"]=3
	next["p"][0]["act"]="guard"
	if rig.apply_confirmed_pose(next):
		_fail("Forbidden conventional guard animation accepted in Hunt v3")
		return
	rig.reset_render_timeline()
	next["tick"]=1
	next["p"][0]["act"]="foldedLight"
	if not rig.apply_confirmed_pose(next):
		_fail("Renderer could not explicitly rewind after a rollback")
		return
	player.stop()
	library.remove_animation("airShot")
	if rig.validate_original_rig(actor,"mournweave").is_empty():
		_fail("Missing aerial gun performance was not detected")
		return
	rig.queue_free()
	await process_frame
	await process_frame
	print("HUNT_V3_ORIGINAL_3D_RIG_GATE_PASS: generated 60Hz manifest, 46 required clips, actual keyed poses, airShot, rollback resampling and no copied art")
	quit(0)
