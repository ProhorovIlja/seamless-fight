extends Node3D
## Render-only alternate 2.5D scene using the actual uploaded Seamless Hunt
## moon/city/mist art. Absolutely no simulation, hitbox or timing mutations.
const ROOT := "res://assets/site/"
const PBR_GOTHIC_STATUE := "res://assets/pbr/gothic_statue.glb"
var photogrammetry_loaded := false
var _fog: MeshInstance3D
var _near: MeshInstance3D
var _rays: MeshInstance3D
var _ray_mat: ShaderMaterial
var _night_air: MeshInstance3D
var _air_mat: ShaderMaterial
var _clock := 0.0
var reduce_motion := false

func _ready() -> void:
	_make_gradient()
	_make_alpha_layer("Moon", "moon.webp", Vector2(2.7,2.7),Vector3(4.5,1.75,-9.0),0.8)
	_make_alpha_layer("FarCity", "skyline-far.webp",Vector2(18.0,5.016),Vector3(0,-2.1,-8.0),0.76)
	_near=_make_alpha_layer("NearCity","skyline-near.webp",Vector2(18.5,5.155),Vector3(0,-2.15,-7.0),0.98)
	_fog=_make_alpha_layer("Mist","fog.webp",Vector2(20.5,4.46),Vector3(0,-3.35,-6.0),0.47)
	_make_moonbeams()
	_make_night_air()
	_install_optional_photogrammetry()
	set_active(false)

func _make_gradient() -> void:
	var mesh := MeshInstance3D.new()
	mesh.name="NightSky"
	var plane := QuadMesh.new()
	plane.size=Vector2(16,9)
	mesh.mesh=plane
	mesh.position=Vector3(0,0,-12)
	mesh.cast_shadow=GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var material := ShaderMaterial.new()
	var shader := Shader.new()
	shader.code = "shader_type spatial;\nrender_mode unshaded, cull_disabled, fog_disabled;\nvoid fragment(){ ALBEDO=mix(vec3(0.18,0.17,0.21),vec3(0.027,0.037,0.065),UV.y); }\n"
	material.shader=shader
	mesh.material_override=material
	add_child(mesh)

func _make_alpha_layer(label: String,source: String,size: Vector2,point: Vector3,opacity: float) -> MeshInstance3D:
	var texture := load(ROOT+source) as Texture2D
	if texture==null:
		push_error("Missing original site visual layer: "+source)
		return null
	var mesh := MeshInstance3D.new()
	mesh.name=label
	var plane := QuadMesh.new()
	plane.size=size
	mesh.mesh=plane
	mesh.position=point
	mesh.cast_shadow=GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var material := StandardMaterial3D.new()
	material.shading_mode=BaseMaterial3D.SHADING_MODE_UNSHADED
	material.transparency=BaseMaterial3D.TRANSPARENCY_ALPHA
	material.albedo_texture=texture
	material.albedo_color=Color(1,1,1,opacity)
	material.cull_mode=BaseMaterial3D.CULL_DISABLED
	mesh.material_override=material
	add_child(mesh)
	return mesh


func _make_moonbeams() -> void:
	# One draw call, unlit and presentation-only. Low-alpha moving moon shafts
	# stay BEHIND the fighter plane; input/physics never reads shader time.
	_rays=MeshInstance3D.new()
	_rays.name="Moonbeams"
	var quad := QuadMesh.new()
	quad.size=Vector2(17.0,9.0)
	_rays.mesh=quad
	_rays.position=Vector3(0.0,0.0,-5.85)
	_rays.cast_shadow=GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var shader := Shader.new()
	shader.code="""shader_type spatial;
render_mode unshaded, cull_disabled, depth_draw_never, fog_disabled;
uniform float phase = 0.0;
void fragment() {
    float y = UV.y;
    float x = UV.x;
    float shaft_a = exp(-pow((x - (0.72 - 0.21 * y + 0.022 * sin(phase * 0.14))) * 13.0, 2.0));
    float shaft_b = exp(-pow((x - (0.42 - 0.15 * y + 0.016 * sin(phase * 0.11 + 2.0))) * 18.0, 2.0));
    float mist = 0.62 + 0.38 * sin(phase * 0.16 + x * 2.0);
    ALBEDO = vec3(0.54, 0.64, 0.78);
    ALPHA = clamp((shaft_a * 0.085 + shaft_b * 0.048) * mist * (1.0 - y * 0.45), 0.0, 0.14);
}
"""
	_ray_mat=ShaderMaterial.new()
	_ray_mat.shader=shader
	_rays.material_override=_ray_mat
	add_child(_rays)

## One translucent 3D plane for original night-air grain / distant rain.
## Render-only, behind all playable fighters; no CPU particles, hitboxes or RNG
## in deterministic combat. This is a subtle atmosphere component, not an
## expensive final stage substitute.
func _make_night_air() -> void:
	_night_air=MeshInstance3D.new()
	_night_air.name="NightAir"
	var quad := QuadMesh.new()
	quad.size=Vector2(16.0,9.0)
	_night_air.mesh=quad
	_night_air.position=Vector3(0.0,0.0,-4.75)
	_night_air.cast_shadow=GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var shader := Shader.new()
	shader.code="""shader_type spatial;
render_mode unshaded, cull_disabled, depth_draw_never, fog_disabled;
uniform float phase = 0.0;
uniform float intensity : hint_range(0.0,1.0) = 0.55;
float hashcell(vec2 p) {
	return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);
}
void fragment() {
	vec2 grid = UV*vec2(95.0,52.0);
	vec2 cell = floor(grid);
	vec2 local = fract(grid);
	float seed = hashcell(cell);
	float pulse = 0.76 + 0.24*sin(phase*0.22 + seed*6.2831853);
	vec2 point = vec2(fract(seed*17.0),fract(seed*31.0));
	float dist = length(local-point);
	float dust = smoothstep(0.058,0.008,dist)*step(0.955,seed);
	float wisp = sin(grid.x*0.16 + phase*0.065)*sin(grid.y*0.11-phase*0.042);
	ALBEDO=vec3(0.62,0.69,0.82);
	ALPHA=clamp((dust*0.07*pulse + max(wisp,0.0)*0.002)*intensity,0.0,0.06);
}
"""
	_air_mat=ShaderMaterial.new()
	_air_mat.shader=shader
	_night_air.material_override=_air_mat
	add_child(_night_air)

func _install_optional_photogrammetry() -> void:
	# A pinned, license-audited Poly Haven CC0 glTF, downloaded at build time.
	# Optional: sources stay usable on developer machines without downloaded art.
	# Geometry is strictly decorative: no collision bodies or gameplay markers.
	if not ResourceLoader.exists(PBR_GOTHIC_STATUE):
		return
	var source := load(PBR_GOTHIC_STATUE) as PackedScene
	if source==null:
		push_warning("Licensed Gothic photogrammetry asset was not importable")
		return
	for index in range(2):
		var statue := source.instantiate() as Node3D
		if statue==null:
			push_error("Invalid Gothic photogrammetry scene")
			return
		statue.name="GothicStatueLeft" if index==0 else "GothicStatueRight"
		statue.position=Vector3(-6.05 if index==0 else 6.05,-2.1,-5.2)
		statue.rotation.y=0.25 if index==0 else -0.25
		statue.scale=Vector3.ONE*1.2
		add_child(statue)
		# Tight, static, shadowless fills for real PBR/normal-map visibility.
		# They never touch actor hitboxes and do not need CPU physics.
		var light := OmniLight3D.new()
		light.name="GothicPropFillLeft" if index==0 else "GothicPropFillRight"
		light.position=Vector3(-5.0 if index==0 else 5.0,0.6,-3.5)
		light.light_color=Color("#d8b38d")
		light.light_energy=0.8
		light.omni_range=7.0
		light.shadow_enabled=false
		add_child(light)
	photogrammetry_loaded=true

func set_active(enabled: bool) -> void:
	visible=enabled
	set_process(enabled and not reduce_motion)
	if not enabled:
		_clock=0.0
		if _fog != null:
			_fog.position.x=0.0
		if _near != null:
			_near.position.x=0.0
		if _ray_mat != null:
			_ray_mat.set_shader_parameter("phase",0.0)
		if _air_mat != null:
			_air_mat.set_shader_parameter("phase",0.0)

func set_reduce_motion(enabled: bool) -> void:
	reduce_motion=enabled
	set_process(visible and not enabled)
	if enabled:
		if _fog != null:
			_fog.position.x=0.0
		if _near != null:
			_near.position.x=0.0
		if _ray_mat != null:
			_ray_mat.set_shader_parameter("phase",0.0)
		if _air_mat != null:
			_air_mat.set_shader_parameter("phase",0.0)

func _process(delta: float) -> void:
	_clock=fmod(_clock+minf(maxf(delta,0.0),0.1),3600.0)
	if _ray_mat!=null:
		_ray_mat.set_shader_parameter("phase",_clock)
	if _air_mat!=null:
		_air_mat.set_shader_parameter("phase",_clock)
	# Tiny drift only. Source image atlases are wider than the visible camera.
	# Combat position, clock and authoritative latency are never consulted.
	if _fog != null:
		_fog.position.x=0.11*sin(_clock*0.24)
	if _near != null:
		_near.position.x=0.035*sin(_clock*0.08)
