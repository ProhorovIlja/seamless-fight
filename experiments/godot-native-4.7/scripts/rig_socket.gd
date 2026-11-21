extends Node3D
## Audited optional high-fidelity 3D hunter gateway.
## Does not synthesize or substitute cheap prototype models for final fighters.
## Imported scenes must be original/licensed GLB files, skinned to a real
## articulated skeleton and carry all gameplay-visible motion phases.
const BASE := "res://assets/characters/"
const REQUIRED_CLIPS := [
	"idle", "run", "jump", "crouch", "guard", "step",
	"cut", "hew", "shot", "stun", "feint", "guard_break"
]
const MIN_SKELETON_BONES := 24
var model_root: Node3D = null
var animator: AnimationPlayer = null
var current_clip := ""

func _find_animation_player(node: Node) -> AnimationPlayer:
	if node is AnimationPlayer:
		return node as AnimationPlayer
	for child in node.get_children():
		var nested := _find_animation_player(child)
		if nested != null:
			return nested
	return null

func _find_skeleton(node: Node) -> Skeleton3D:
	if node is Skeleton3D:
		return node as Skeleton3D
	for child in node.get_children():
		var nested := _find_skeleton(child)
		if nested != null:
			return nested
	return null

func _find_mesh(node: Node) -> MeshInstance3D:
	if node is MeshInstance3D and (node as MeshInstance3D).mesh!=null and (node as MeshInstance3D).skin!=null and (node as MeshInstance3D).skin.get_bind_count()>=MIN_SKELETON_BONES:
		return node as MeshInstance3D
	for child in node.get_children():
		var nested := _find_mesh(child)
		if nested != null:
			return nested
	return null

func validate_visual_rig(source: Node3D) -> Array[String]:
	var problems: Array[String]=[]
	if source==null:
		return ["No compatible imported scene root"]
	var skeleton := _find_skeleton(source)
	if skeleton==null or skeleton.get_bone_count()<MIN_SKELETON_BONES:
		problems.append("A real articulated character skeleton with at least 24 bones is required")
	if _find_mesh(source)==null:
		problems.append("Imported character requires skinned mesh geometry with at least 24 bone bindings")
	var player := _find_animation_player(source)
	if player==null:
		problems.append("Imported character requires an AnimationPlayer")
	else:
		for clip in REQUIRED_CLIPS:
			if not player.has_animation(clip):
				problems.append("Missing authored animation: "+clip)
	return problems

func install_original_rig(path: String) -> bool:
	if not path.begins_with(BASE) or not path.ends_with(".glb") or path.contains(".."):
		return false
	if not ResourceLoader.exists(path):
		return false
	var resource: Resource=load(path)
	if not resource is PackedScene:
		return false
	var imported := (resource as PackedScene).instantiate()
	if not imported is Node3D:
		imported.free()
		return false
	var root: Node3D=imported as Node3D
	var problems := validate_visual_rig(root)
	if not problems.is_empty():
		push_warning("Rejected incomplete authored hunter: "+str(problems))
		root.free()
		return false
	if model_root!=null:
		model_root.queue_free()
	add_child(root)
	model_root=root
	animator=_find_animation_player(root)
	current_clip=""
	return true

func derived_clip(state: Dictionary) -> String:
	var action: String=str(state.get("act",""))
	if action=="guardBreak":
		return "guard_break"
	if action in ["cut","hew","shot","step","feint","stun"]:
		return action
	if int(state.get("guardAge",0))>0:
		return "guard"
	if bool(state.get("crouch",false)):
		return "crouch"
	if float(state.get("y",436.0))<435.5:
		return "jump"
	if absf(float(state.get("vx",0.0)))>0.35:
		return "run"
	return "idle"

func apply_visual_state(state: Dictionary) -> void:
	if animator==null:
		return
	var clip := derived_clip(state)
	apply_visual_clip(clip,maxi(0,int(state.get("age",0))))

func apply_visual_clip(clip_name: String, confirmed_age: int) -> void:
	if animator==null or clip_name not in REQUIRED_CLIPS:
		return
	if not animator.has_animation(clip_name):
		return
	if current_clip!=clip_name:
		current_clip=clip_name
		animator.play(clip_name)
	if confirmed_age>=0 and clip_name not in ["idle","run","jump","crouch","guard"]:
		# Renderer samples the exact confirmed combat phase. Collision, damage
		# and parry windows are calculated solely in the portable C++ rules.
		var clip_length: float=animator.get_animation(clip_name).length
		animator.seek(minf(clip_length,float(confirmed_age)/60.0),true)
