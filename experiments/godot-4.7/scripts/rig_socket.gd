extends Node3D
## An optional imported GLB rig belongs here. This gateway deliberately leaves
## the game empty if no licensed, authored character is available, instead of
## generating cheap cubes and calling them premium character art.
const BASE := "res://assets/characters/"
var model_root: Node3D = null
var animator: AnimationPlayer = null

func install_original_rig(path: String) -> bool:
	if not path.begins_with(BASE) or not path.ends_with(".glb"):
		return false
	if path.contains("..") or not ResourceLoader.exists(path):
		return false
	var resource := load(path)
	if not resource is PackedScene:
		return false
	var node := resource.instantiate()
	if not node is Node3D:
		node.free()
		return false
	if model_root != null:
		model_root.queue_free()
	add_child(node)
	model_root = node
	animator = _find_animation_player(node)
	return true

func _find_animation_player(root_node: Node) -> AnimationPlayer:
	for child in root_node.get_children():
		if child is AnimationPlayer:
			return child
		var nested := _find_animation_player(child)
		if nested != null:
			return nested
	return null

func apply_visual_clip(clip_name: String, confirmed_age: int) -> void:
	if animator == null or not animator.has_animation(clip_name):
		return
	if animator.current_animation != clip_name:
		animator.play(clip_name)
	# Confirmed action time drives the pose. This method does not change combat.
	if confirmed_age >= 0 and clip_name not in ["idle", "run"]:
		animator.seek(float(confirmed_age) / 60.0, true)
