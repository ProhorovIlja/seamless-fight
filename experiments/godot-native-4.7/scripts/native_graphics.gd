extends Node
## Godot native PC preference controller. Never advertises absent GPU plugins.
const VERSION := 1
const UPSCALE := ["native", "fsr1", "fsr2"]
const VSYNC := ["off", "on", "adaptive"]
const DISPLAY := ["windowed", "borderless", "fullscreen"]
const CAPS := [0, 60, 90, 120, 144, 165, 240]
const SAVE_PATH := "user://sf_native_display_v1.json"

func default_profile() -> Dictionary:
	return {"version":VERSION,"upscale":"native","scale":1.0,"vsync":"on","display":"windowed","fps_cap":120}

func validate_profile(data: Variant) -> Array[String]:
	var problems: Array[String] = []
	if not data is Dictionary:
		return ["Profile must be an object"]
	if data.get("version") != VERSION:
		problems.append("Unsupported profile version")
	if not UPSCALE.has(str(data.get("upscale", ""))):
		problems.append("Unknown upscaling choice")
	var scale: Variant = data.get("scale", null)
	if typeof(scale) not in [TYPE_FLOAT, TYPE_INT] or not is_finite(float(scale)) or float(scale)<0.5 or float(scale)>1.0:
		problems.append("Invalid resolution scale")
	if not VSYNC.has(str(data.get("vsync",""))):
		problems.append("Invalid VSync")
	if not DISPLAY.has(str(data.get("display",""))):
		problems.append("Invalid window mode")
	if not CAPS.has(data.get("fps_cap",null)):
		problems.append("Invalid FPS cap")
	for key in data.keys():
		if not ["version","upscale","scale","vsync","display","fps_cap"].has(key):
			problems.append("Unexpected option: "+str(key))
	return problems

func available_features() -> Dictionary:
	var method := RenderingServer.get_current_rendering_method()
	return {"native":true,"fsr1":true,"fsr2_2":method != "gl_compatibility",
		"dlss_4_5":false,"dlss_5":false,"fsr_4_1_2":false,
		"xess_3":false,"nvidia_reflex":false,"amd_antilag2":false,
		"intel_xell":false,"frame_generation":false}

func apply_profile(profile: Dictionary) -> bool:
	if not validate_profile(profile).is_empty():
		return false
	var features := available_features()
	if profile["upscale"]=="fsr2" and not features["fsr2_2"]:
		return false
	var view: Viewport = get_tree().root
	match str(profile["upscale"]):
		"native":view.scaling_3d_mode=Viewport.SCALING_3D_MODE_BILINEAR
		"fsr1":view.scaling_3d_mode=Viewport.SCALING_3D_MODE_FSR
		"fsr2":view.scaling_3d_mode=Viewport.SCALING_3D_MODE_FSR2
	view.scaling_3d_scale=float(profile["scale"])
	Engine.max_fps=int(profile["fps_cap"])
	if DisplayServer.get_name()!="headless":
		match str(profile["vsync"]):
			"off":DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_DISABLED)
			"on":DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_ENABLED)
			"adaptive":DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_ADAPTIVE)
		match str(profile["display"]):
			"windowed":DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_WINDOWED)
			"borderless":DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN)
			"fullscreen":DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_EXCLUSIVE_FULLSCREEN)
	return true

func save_profile(profile: Dictionary) -> bool:
	if not validate_profile(profile).is_empty():
		return false
	var file := FileAccess.open(SAVE_PATH,FileAccess.WRITE)
	if file==null:
		return false
	file.store_string(JSON.stringify(profile))
	file.close()
	return true

func load_profile() -> Dictionary:
	if not FileAccess.file_exists(SAVE_PATH):
		return default_profile()
	var file := FileAccess.open(SAVE_PATH,FileAccess.READ)
	if file==null or file.get_length()>4096:
		return default_profile()
	var loaded: Variant = JSON.parse_string(file.get_as_text())
	return loaded if validate_profile(loaded).is_empty() else default_profile()
