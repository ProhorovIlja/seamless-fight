extends Node3D
## Rendering-engine spike. Godot is a read-only visual client for authoritative
## 960x540 world snapshots; game rules and collision remain on the JS server.
## No placeholder boxes or low-poly human models are shown as final art.

const WORLD_WIDTH := 960.0
const WORLD_HEIGHT := 540.0
const FLOOR_PX := 436.0
const RULESET := "seamless-side/1"
const BACKDROP := "res://assets/reliquary-painted.webp"

@onready var camera: Camera3D = $CombatCamera
@onready var left_visual: Node3D = $Veil
@onready var right_visual: Node3D = $Cinder
@onready var site_backdrop: Node3D = $SiteBackdrop
var active_visual_stage := "reliquary"

var backdrop: MeshInstance3D
var last_confirmed_tick: int = -1

func _ready() -> void:
	camera.current = true
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.size = 9.0
	camera.position = Vector3(0.0, 0.0, 12.0)
	camera.rotation = Vector3.ZERO
	_make_original_backdrop()
	left_visual.position = world_position(255.0, FLOOR_PX)
	right_visual.position = world_position(705.0, FLOOR_PX)

func _make_original_backdrop() -> void:
	var painting := load(BACKDROP) as Texture2D
	if painting == null:
		push_error("Original painted cathedral artwork is missing; no private assets can be substituted")
		return
	backdrop = MeshInstance3D.new()
	backdrop.name = "OriginalPaintedReliquary"
	var quad := QuadMesh.new()
	quad.size = Vector2(16.0, 9.0)
	backdrop.mesh = quad
	backdrop.position = Vector3(0.0, 0.0, -8.0)
	backdrop.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.albedo_texture = painting
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	backdrop.set_surface_override_material(0, mat)
	add_child(backdrop)

func world_position(x: float, y: float) -> Vector3:
	# Pure affine projection: precise world-floor anchor, no Z gameplay lane.
	return Vector3((x - WORLD_WIDTH * 0.5) / 60.0,
		(WORLD_HEIGHT * 0.5 - y) / 60.0, 0.0)

func _valid_fighter(data: Variant) -> bool:
	if not data is Dictionary:
		return false
	for key in ["x", "y", "dir"]:
		if not data.has(key):
			return false
	var x := float(data["x"])
	var y := float(data["y"])
	var direction := int(data["dir"])
	return is_finite(x) and is_finite(y) and x >= 0.0 and x <= WORLD_WIDTH and 		y >= -500.0 and y <= FLOOR_PX and abs(direction) == 1

func apply_authoritative_state(snapshot: Dictionary) -> bool:
	if snapshot.get("rules", "") != RULESET:
		return false
	if typeof(snapshot.get("tick")) != TYPE_INT:
		return false
	var tick: int = snapshot["tick"]
	if tick <= last_confirmed_tick or tick < 0:
		return false
	var players: Variant = snapshot.get("p")
	if not players is Array or players.size() != 2:
		return false
	if not _valid_fighter(players[0]) or not _valid_fighter(players[1]):
		return false
	for i in range(2):
		var visual: Node3D = left_visual if i == 0 else right_visual
		var fighter: Dictionary = players[i]
		visual.position = world_position(float(fighter["x"]), float(fighter["y"]))
		visual.rotation.y = PI if int(fighter["dir"]) < 0 else 0.0
	last_confirmed_tick = tick
	if $CombatHud.visible:
		$CombatHud.apply_snapshot(snapshot)
	return true

func set_visual_stage(requested: String) -> bool:
	if requested not in ["reliquary","moonlit"] or backdrop == null:
		return false
	active_visual_stage=requested
	backdrop.visible=requested=="reliquary"
	site_backdrop.set_active(requested=="moonlit")
	return true

func begin_local_practice(bot_profile: String = "normal") -> bool:
	return $Practice.start_training(bot_profile)

func reset_local_practice() -> bool:
	return $Practice.reset_rounds()

func end_local_practice() -> void:
	$Practice.stop_training()


func connect_private_1v1(endpoint: String, origin: String, code: String="", arena: String="reliquary") -> bool:
	# Native fixed 2.5D renderer can display actual authoritative 1v1 matches.
	# Never enable rated matchmaking or network rollback in this prototype.
	if $Practice.active:
		return false
	return $Online.open_room(endpoint,origin,code,arena)

func disconnect_private_1v1() -> void:
	$Online.close_room()

func current_invitation_code() -> String:
	return $Online.transport.room_code

func rewind_local_practice(frames: int=60) -> bool:
	return $Practice.rewind_frames(frames)

func advance_local_practice() -> bool:
	return $Practice.advance_one_frame()
