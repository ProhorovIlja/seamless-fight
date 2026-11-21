extends Node3D
## Separate Hunt v3 3D PERFORMANCE contract. NOT attached to legacy stage.
## Accepts original/cleared skinned GLB sources with actual skeletal pose keys.
## No placeholder actors, borrowed Bloodborne assets, or simulated attack logic.
const MANIFEST := "res://assets/hunt_animation_manifest.json"
const ASSET_ROOT := "res://assets/characters/"
const RULESET := "sf-hunt-lab/3"
const CLIP_SCHEMA := "sf-hunt-godot-clips/1"
const HZ := 60
const MIN_BONES := 42
const MIN_VERTICES := 8000
const MIN_ANIMATED_BONES := 2
const VISUAL_BLEND_SECONDS := 0.08
var contract: Dictionary={}
var source_model: Node3D
var animator: AnimationPlayer
var bound_weapon := ""
var visual_clip := ""
var confirmed_tick := -1

func _ready() -> void:
	_load_contract()

func _load_contract() -> bool:
	if not FileAccess.file_exists(MANIFEST):
		return false
	var file := FileAccess.open(MANIFEST,FileAccess.READ)
	if file==null or file.get_length()>60000:
		return false
	var parsed: Variant=JSON.parse_string(file.get_as_text())
	if not parsed is Dictionary:
		return false
	if parsed.get("schema","")!=CLIP_SCHEMA or parsed.get("rules","")!=RULESET:
		return false
	if int(parsed.get("hz",0))!=HZ or parsed.get("clipsAreFinished",true)!=false:
		return false
	var shared: Variant=parsed.get("shared")
	var weapons: Variant=parsed.get("weapons")
	if not shared is Array or shared.size()<15 or not weapons is Dictionary or weapons.size()!=2:
		return false
	for weapon in ["mournweave","thornwake"]:
		if not weapons.get(weapon) is Array or weapons[weapon].size()!=28:
			return false
		var names: Dictionary={}
		for move in weapons[weapon]:
			if not move is Dictionary:
				return false
			var clip: String=str(move.get("clip",""))
			if names.has(clip) or clip.is_empty():
				return false
			names[clip]=true
			if int(move.get("frames",0))<1 or int(move.get("startup",-1))<0:
				return false
		for must in ["airShot","visceral","visceralVictim","blood","heal","step","stun"]:
			if not names.has(must):
				return false
	contract=parsed
	return true

func required_clips(weapon: String) -> Array[String]:
	if not contract.has("weapons") or not contract["weapons"].has(weapon):
		return []
	var clips: Array[String]=[]
	for clip in contract["shared"]:
		clips.append(str(clip))
	for move in contract["weapons"][weapon]:
		clips.append(str(move["clip"]))
	return clips

func _find_skeleton(root: Node) -> Skeleton3D:
	if root is Skeleton3D:
		return root as Skeleton3D
	for child in root.get_children():
		var found := _find_skeleton(child)
		if found!=null:
			return found
	return null

func _find_animator(root: Node) -> AnimationPlayer:
	if root is AnimationPlayer:
		return root as AnimationPlayer
	for child in root.get_children():
		var found := _find_animator(child)
		if found!=null:
			return found
	return null

func _skinned_vertex_count(root: Node) -> int:
	var total := 0
	if root is MeshInstance3D:
		var node:=root as MeshInstance3D
		if node.mesh!=null and node.skin!=null and node.skin.get_bind_count()>=MIN_BONES:
			for i in range(node.mesh.get_surface_count()):
				var arrays: Array=node.mesh.surface_get_arrays(i)
				total+=(arrays[Mesh.ARRAY_VERTEX] as PackedVector3Array).size()
	for child in root.get_children():
		total+=_skinned_vertex_count(child)
	return total

func _valid_performance(clip: Animation) -> bool:
	if clip==null or clip.length<0.25:
		return false
	var bones: Dictionary={}
	for index in range(clip.get_track_count()):
		var track_type: int=clip.track_get_type(index)
		if track_type not in [Animation.TYPE_POSITION_3D,Animation.TYPE_ROTATION_3D,Animation.TYPE_SCALE_3D]:
			continue
		var bone_path:=str(clip.track_get_path(index))
		if not bone_path.contains(":") or clip.track_get_key_count(index)<2:
			continue
		bones[bone_path]=true
	return bones.size()>=MIN_ANIMATED_BONES

func validate_original_rig(model: Node3D,weapon: String) -> Array[String]:
	var errors: Array[String]=[]
	if not contract.has("weapons"):
		return ["Hunt v3 animation manifest unavailable"]
	if not contract["weapons"].has(weapon):
		return ["Unknown original Hunt weapon"]
	if model==null:
		return ["Original 3D hunter source missing"]
	var skeleton:=_find_skeleton(model)
	if skeleton==null or skeleton.get_bone_count()<MIN_BONES:
		errors.append("Missing premium rig: at least 42 articulated skeleton bones")
	if _skinned_vertex_count(model)<MIN_VERTICES:
		errors.append("Original skinned character is missing or too low detail")
	var animation_player:=_find_animator(model)
	if animation_player==null:
		errors.append("Missing authored animation library")
		return errors
	var clip_lengths: Dictionary={}
	for move in contract["weapons"][weapon]:
		clip_lengths[move["clip"]]=float(move["frames"])/float(HZ)
	for clip_name in required_clips(weapon):
		if not animation_player.has_animation(clip_name):
			errors.append("Missing original authored 3D animation: "+clip_name)
			continue
		var clip: Animation=animation_player.get_animation(clip_name)
		if not _valid_performance(clip):
			errors.append("Clip lacks two articulated bones with real pose keys: "+clip_name)
		elif clip_lengths.has(clip_name) and clip.length+0.0001<float(clip_lengths[clip_name]):
			errors.append("Animation shorter than exact combat frame lifetime: "+clip_name)
	return errors

func install_original_hunter(path: String,weapon: String) -> bool:
	if not path.begins_with(ASSET_ROOT) or not path.ends_with(".glb") or path.contains(".."):
		return false
	if not ResourceLoader.exists(path):
		return false
	var resource=load(path)
	if not resource is PackedScene:
		return false
	var candidate=(resource as PackedScene).instantiate()
	if not candidate is Node3D:
		candidate.free()
		return false
	var problems=validate_original_rig(candidate as Node3D,weapon)
	if not problems.is_empty():
		push_warning("Hunt 3D source rejected: "+str(problems.slice(0,5)))
		candidate.free()
		return false
	if source_model!=null:
		source_model.queue_free()
	add_child(candidate)
	source_model=candidate
	animator=_find_animator(candidate)
	bound_weapon=weapon
	visual_clip=""
	confirmed_tick=-1
	return true

func reset_render_timeline() -> void:
	confirmed_tick=-1
	visual_clip=""
	if animator!=null:
		animator.stop()

func _decide_clip(fighter: Dictionary) -> String:
	var action:=str(fighter.get("act",""))
	if not action.is_empty():
		return action
	if float(fighter.get("y",436.0))<435.5:
		return "jump"
	if bool(fighter.get("crouch",false)):
		return "crouch"
	if absf(float(fighter.get("vx",0.0)))>2.0:
		return "run"
	if absf(float(fighter.get("vx",0.0)))>0.15:
		return "walk"
	return "idle"

func apply_confirmed_pose(snapshot: Dictionary,slot: int=0) -> bool:
	# The renderer never computes hits; no health/physics/inputs are changed.
	if animator==null or slot not in [0,1] or snapshot.get("rules","")!=RULESET:
		return false
	var tick: Variant=snapshot.get("tick",null)
	var players: Variant=snapshot.get("p",null)
	if typeof(tick)!=TYPE_INT or tick<0 or tick<=confirmed_tick:
		return false
	if not players is Array or players.size()!=2 or not players[slot] is Dictionary:
		return false
	var fighter: Dictionary=players[slot]
	if fighter.get("weapon","")!=bound_weapon or not is_finite(float(fighter.get("x",NAN))):
		return false
	var next_clip:=_decide_clip(fighter)
	if not required_clips(bound_weapon).has(next_clip) or not animator.has_animation(next_clip):
		return false
	if next_clip!=visual_clip:
		visual_clip=next_clip
		animator.play(next_clip,VISUAL_BLEND_SECONDS)
	if next_clip not in contract["shared"]:
		var age: int=maxi(0,int(fighter.get("age",0)))
		var clip_length: float=animator.get_animation(next_clip).length
		# Confirmed 60 Hz pose time is independent from 60/120/240/uncapped display refresh.
		animator.seek(minf(clip_length,float(age)/float(HZ)),true)
	confirmed_tick=tick
	return true
