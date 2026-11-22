extends SceneTree
## Engine-side rigging contract. Fake minimal geometry exists only inside this
## regression test; no primitive is bundled as a visible playable hunter.
const Stage=preload("res://scenes/stage.tscn")
const Rig=preload("res://scripts/rig_socket.gd")
func _initialize() -> void:
	call_deferred("_verify")
func _fail(message: String) -> void:
	push_error("NATIVE_RIG_CONTRACT_FAILED: "+message)
	quit(1)
func _verify() -> void:
	var stage: Variant=Stage.instantiate()
	root.add_child(stage)
	await process_frame
	for fighter in ["Veil","Cinder"]:
		var socket: Node3D=stage.get_node(fighter)
		if not socket.has_method("install_original_rig") or not socket.has_method("apply_visual_state"):
			_fail("Native game fighter node lacks the actual authored GLB rig gateway")
			return
		if socket.install_original_rig("res://assets/characters/../out-of-tree.glb"):
			_fail("Native rig gateway accepted path traversal")
			return
		if socket.install_original_rig("res://assets/characters/fictional.glb"):
			_fail("Native rig gateway pretended a missing model was installed")
			return
	var rig: Variant=Rig.new()
	root.add_child(rig)
	var model := Node3D.new()
	rig.add_child(model)
	if rig.validate_visual_rig(model).is_empty():
		_fail("Fake low-detail model passed high-fidelity animation acceptance")
		return
	var skeleton := Skeleton3D.new()
	skeleton.name="Skeleton3D"
	for i in range(24):
		skeleton.add_bone("Bone_"+str(i))
	model.add_child(skeleton)
	var mesh := MeshInstance3D.new()
	var sphere := SphereMesh.new()
	sphere.radial_segments=72
	sphere.rings=48
	mesh.mesh=sphere
	var skin := Skin.new()
	for i in range(24):
		skin.add_bind(i,Transform3D.IDENTITY)
	mesh.skin=skin
	mesh.skeleton=NodePath("../Skeleton3D")
	model.add_child(mesh)
	var animator := AnimationPlayer.new()
	model.add_child(animator)
	var library := AnimationLibrary.new()
	for clip in Rig.REQUIRED_CLIPS:
		var animation := Animation.new()
		animation.length=2.0
		library.add_animation(clip,animation)
	animator.add_animation_library("",library)
	if rig.validate_visual_rig(model).is_empty():
		_fail("A fake rig with 12 EMPTY animation clips must fail quality acceptance")
		return
	# Test-only keyed skeleton posing proves the gate rejects named empty clips
	# and still accepts technically articulated, sufficiently detailed rigs.
	for clip in Rig.REQUIRED_CLIPS:
		var animation: Animation=library.get_animation(clip)
		var track: int=animation.add_track(Animation.TYPE_ROTATION_3D)
		animation.track_set_path(track,NodePath("Skeleton3D:Bone_0"))
		animation.track_insert_key(track,0.0,Quaternion.IDENTITY)
		animation.track_insert_key(track,0.2,Quaternion(Vector3.UP,0.15))
	if not rig.validate_visual_rig(model).is_empty():
		_fail("Technical 24-bone skinned rig with actual keyed skeleton poses was rejected")
		return
	rig.animator=animator
	var hew := {"act":"hew","age":23,"y":436.0,"vx":0.0,"crouch":false,"guardAge":0}
	rig.apply_visual_state(hew)
	if animator.current_animation!="hew" or absf(animator.current_animation_position-23.0/60.0)>0.001:
		_fail("Native imported animation is not sampled from confirmed 60 Hz attack age")
		return
	if rig.derived_clip({"act":"guardBreak"})!="guard_break":
		_fail("Guard-break visual clip mapping lost")
		return
	if rig.derived_clip({"act":"","guardAge":3})!="guard":
		_fail("Deflect/guard pose not derived from authoritative combat")
		return
	if rig.derived_clip({"act":"","crouch":true})!="crouch":
		_fail("Crouching pose not derived from authoritative combat")
		return
	if rig.derived_clip({"act":"","y":425.0})!="jump":
		_fail("Jump pose does not follow fixed 2.5D fighter height")
		return
	if rig.derived_clip({"act":"","vx":3.0})!="run":
		_fail("Running pose does not follow canonical movement velocity")
		return
	# Avoid deleting a currently playing animation while a skinned skeleton
	# is still registered with AnimationPlayer. Godot 4.7.2 can crash in its
	# scene teardown after an otherwise passing headless test.
	animator.stop()
	library.remove_animation("hew")
	if rig.validate_visual_rig(model).is_empty():
		_fail("Rig missing a mandatory authored heavy attack clip was accepted")
		return
	# Dispose test-only fake rig and stage before quitting Godot; it must never
	# appear as a shipped hunter or remain referenced by native renderers.
	rig.queue_free()
	stage.queue_free()
	await process_frame
	await process_frame
	print("NATIVE_AUTHORING_RIG_CONTRACT_PASSED: real skinned geometry, 24 bones, twelve keyed pose clips, exact server-age animation sampling and no fake fallback hunters")
	quit(0)
