extends Node
## Native 2.5D combat controls. Gameplay consumes actions, never raw device IDs.
## This is an opt-in user profile with bounded, fail-closed local JSON storage.
const VERSION := 1
const SAVE_PATH := "user://sf_native_controls_v1.json"
const MAX_BYTES := 16384
const DEADZONE := 0.25
const DEVICE_AUTO := -1
const DEVICE_KBM := -2
var active_device_id := DEVICE_AUTO
var active_profile: Dictionary={}
var previous_pressed: Dictionary={}
const ACTIONS := ["sf_left","sf_right","sf_jump","sf_crouch","sf_guard",
	"sf_cut","sf_hew","sf_shot","sf_step","sf_feint"]

func _ready() -> void:
	apply_profile(load_profile())
	# Prevent background gamepads or arcade sticks issuing combat commands.
	Input.ignore_joypad_on_unfocused_application=true
	Input.joy_connection_changed.connect(_device_connection_changed)

func _key(code: int) -> Dictionary:
	return {"kind":"key","code":code}

func _pad(code: int) -> Dictionary:
	return {"kind":"pad_button","code":code}

func _axis(code: int, direction: int) -> Dictionary:
	return {"kind":"pad_axis","code":code,"direction":direction}

func default_profile() -> Dictionary:
	return {"version":VERSION,"actions":{
		"sf_left":[_key(KEY_A),_key(KEY_LEFT),_pad(JOY_BUTTON_DPAD_LEFT),_axis(JOY_AXIS_LEFT_X,-1)],
		"sf_right":[_key(KEY_D),_key(KEY_RIGHT),_pad(JOY_BUTTON_DPAD_RIGHT),_axis(JOY_AXIS_LEFT_X,1)],
		"sf_jump":[_key(KEY_SPACE),_key(KEY_W),_pad(JOY_BUTTON_A)],
		"sf_crouch":[_key(KEY_S),_key(KEY_DOWN),_pad(JOY_BUTTON_DPAD_DOWN),_axis(JOY_AXIS_LEFT_Y,1)],
		"sf_guard":[_key(KEY_U),_pad(JOY_BUTTON_LEFT_SHOULDER)],
		"sf_cut":[_key(KEY_J),_pad(JOY_BUTTON_X)],
		"sf_hew":[_key(KEY_K),_pad(JOY_BUTTON_Y)],
		"sf_shot":[_key(KEY_L),_pad(JOY_BUTTON_RIGHT_SHOULDER)],
		"sf_step":[_key(KEY_SHIFT),_pad(JOY_BUTTON_B)],
		"sf_feint":[_key(KEY_I),_pad(JOY_BUTTON_RIGHT_STICK)]
	}}

func _binding_key(item: Dictionary) -> String:
	return str(item["kind"])+":"+str(item["code"])+":"+str(item.get("direction",0))

func validate_profile(profile: Variant) -> Array[String]:
	var problems: Array[String] = []
	if not profile is Dictionary:
		return ["Profile must be a dictionary"]
	if profile.size() != 2 or profile.get("version") != VERSION:
		problems.append("Unsupported controls version or unexpected top-level keys")
	var bindings: Variant = profile.get("actions")
	if not bindings is Dictionary:
		problems.append("Missing input bindings dictionary")
		return problems
	if bindings.size() != ACTIONS.size():
		problems.append("Missing or unexpected action names")
	var taken: Dictionary = {}
	for action in ACTIONS:
		if not bindings.has(action):
			problems.append("Missing required action: "+action)
			continue
		var entries: Variant = bindings[action]
		if not entries is Array or entries.is_empty() or entries.size() > 8:
			problems.append("Each action requires 1-8 inputs: "+action)
			continue
		for item in entries:
			if not item is Dictionary or not item.has("kind") or not item.has("code"):
				problems.append("Malformed binding: "+action)
				continue
			var kind := str(item["kind"])
			var code: Variant = item["code"]
			var direction: Variant = item.get("direction",0)
			if typeof(code) != TYPE_INT or typeof(direction) != TYPE_INT:
				problems.append("Device codes must be integers: "+action)
				continue
			var safe := false
			match kind:
				"key":
					safe = item.size()==2 and code>=32 and code<=4194500 and code not in [KEY_ESCAPE,KEY_ENTER,KEY_KP_ENTER]
				"mouse":
					safe = item.size()==2 and code in [MOUSE_BUTTON_LEFT,MOUSE_BUTTON_RIGHT,MOUSE_BUTTON_MIDDLE,MOUSE_BUTTON_XBUTTON1,MOUSE_BUTTON_XBUTTON2]
				"pad_button":
					safe = item.size()==2 and code>=0 and code<=22
				"pad_axis":
					safe = item.size()==3 and code in [JOY_AXIS_LEFT_X,JOY_AXIS_LEFT_Y,JOY_AXIS_RIGHT_X,JOY_AXIS_RIGHT_Y] and direction in [-1,1]
			if not safe:
				problems.append("Invalid device code or binding: "+action)
				continue
			var fingerprint := _binding_key(item)
			if taken.has(fingerprint):
				problems.append("Duplicate device input in "+str(taken[fingerprint])+" and "+action)
			taken[fingerprint] = action
	for action in bindings.keys():
		if action not in ACTIONS:
			problems.append("Unexpected input action: "+str(action))
	return problems

func _to_event(binding: Dictionary) -> InputEvent:
	var code: int = binding["code"]
	match binding["kind"]:
		"key":
			var key := InputEventKey.new()
			key.physical_keycode = code
			return key
		"mouse":
			var mouse := InputEventMouseButton.new()
			mouse.button_index = code
			return mouse
		"pad_button":
			var button := InputEventJoypadButton.new()
			button.button_index = code
			return button
		"pad_axis":
			var axis := InputEventJoypadMotion.new()
			axis.axis = code
			axis.axis_value = float(binding["direction"])
			return axis
	return null

func apply_profile(profile: Dictionary) -> bool:
	if not validate_profile(profile).is_empty():
		return false
	active_profile=profile.duplicate(true)
	previous_pressed.clear()
	for action in ACTIONS:
		if not InputMap.has_action(action):
			InputMap.add_action(action,DEADZONE)
		InputMap.action_erase_events(action)
		InputMap.action_set_deadzone(action,DEADZONE)
		for item in profile["actions"][action]:
			InputMap.action_add_event(action,_to_event(item))
	return true

func make_binding(event: InputEvent) -> Dictionary:
	if event is InputEventKey and event.pressed and not event.echo:
		var code: int = event.physical_keycode if event.physical_keycode else event.keycode
		return _key(code)
	if event is InputEventMouseButton and event.pressed:
		return {"kind":"mouse","code":event.button_index}
	if event is InputEventJoypadButton and event.pressed:
		return _pad(event.button_index)
	if event is InputEventJoypadMotion and absf(event.axis_value) >= 0.65:
		return _axis(event.axis,-1 if event.axis_value < 0 else 1)
	return {}

func with_rebinding(profile: Dictionary,action: String,entry: Dictionary) -> Dictionary:
	if action not in ACTIONS or not validate_profile(profile).is_empty():
		return {}
	var result := profile.duplicate(true)
	var candidates: Array = result["actions"][action]
	candidates.clear()
	candidates.append(entry)
	return result if validate_profile(result).is_empty() else {}

func save_profile(profile: Dictionary) -> bool:
	if not validate_profile(profile).is_empty():
		return false
	var content := JSON.stringify(profile)
	if content.to_utf8_buffer().size() > MAX_BYTES:
		return false
	var file := FileAccess.open(SAVE_PATH,FileAccess.WRITE)
	if file == null:
		return false
	file.store_string(content)
	file.close()
	return true

func load_profile() -> Dictionary:
	if not FileAccess.file_exists(SAVE_PATH):
		return default_profile()
	var file := FileAccess.open(SAVE_PATH,FileAccess.READ)
	if file == null or file.get_length() > MAX_BYTES:
		return default_profile()
	var loaded: Variant = JSON.parse_string(file.get_as_text())
	return loaded if validate_profile(loaded).is_empty() else default_profile()

## Hardware discovery is delegated to Godot's SDL controller backend.
## A detected USB controller may expose an arcade lever, D-pad or leverless face
## buttons under the same joypad API. Never invent an exact model/layout here.
func connected_devices() -> Array[Dictionary]:
	var detected: Array[Dictionary] = []
	for device in Input.get_connected_joypads():
		detected.append({
			"id":int(device),
			"name":Input.get_joy_name(device).left(100),
			"guid":Input.get_joy_guid(device).left(128),
			"mapped":Input.is_joy_known(device)
		})
	detected.sort_custom(func(a: Dictionary,b: Dictionary)->bool: return int(a["id"])<int(b["id"]))
	return detected

func controller_diagnostics() -> Dictionary:
	var devices: Array[Dictionary]=connected_devices()
	return {"connected":devices.size(),"devices":devices,
		"mappingEngine":"Godot SDL-compatible joypad mapping",
		"leverless":"Use D-pad/buttons; opposing directions neutralize in encoded input",
		"deviceLocking":"implemented (explicit selection, disconnected-device failover to keyboard and mouse)",
		"activeDevice":active_device_id,
		"activeDeviceLabel":device_label()}

## One controller (or keyboard/mouse) drives the local fighter. Default AUTO
## retains the existing all-device InputMap behavior for backward compatibility.
## Godot joypad IDs are transient and deliberately not persisted in a profile.
func select_input_device(device: int) -> bool:
	if device!=DEVICE_AUTO and device!=DEVICE_KBM and device not in Input.get_connected_joypads():
		return false
	active_device_id=device
	previous_pressed.clear()
	return true

func _device_connection_changed(device: int, connected: bool) -> void:
	if not connected and active_device_id==device:
		# Fail closed to local keyboard/mouse, not to another unattended pad.
		active_device_id=DEVICE_KBM
		previous_pressed.clear()

func device_label() -> String:
	if active_device_id==DEVICE_AUTO:
		return "Automatic: all mapped devices"
	if active_device_id==DEVICE_KBM:
		return "Keyboard and mouse only"
	if active_device_id not in Input.get_connected_joypads():
		return "Disconnected controller"
	return Input.get_joy_name(active_device_id).left(100)+" (#"+str(active_device_id)+")"

func _locked_pressed(action: String) -> bool:
	if not active_profile.has("actions") or not active_profile["actions"].has(action):
		return false
	for binding in active_profile["actions"][action]:
		var code: int=int(binding["code"])
		match str(binding["kind"]):
			"key":
				if active_device_id==DEVICE_KBM and Input.is_physical_key_pressed(code):
					return true
			"mouse":
				if active_device_id==DEVICE_KBM and Input.is_mouse_button_pressed(code):
					return true
			"pad_button":
				if active_device_id>=0 and Input.is_joy_button_pressed(active_device_id,code):
					return true
			"pad_axis":
				if active_device_id>=0:
					var value: float=Input.get_joy_axis(active_device_id,code)
					if value*int(binding["direction"])>=0.5:
						return true
	return false

## SOCD neutral cleaning: L+R => neutral, Jump+Crouch => neutral.
## Software never introduces extra jumps, up-priority, macro actions or inputs.
func resolve_directions(left: bool,right: bool,jump: bool,crouch: bool) -> Vector2i:
	return Vector2i(int(right)-int(left),int(crouch)-int(jump))

func encoded_input() -> Array[int]:
	if DisplayServer.get_name()!="headless" and not DisplayServer.window_is_focused():
		previous_pressed.clear()
		return [0,0,0,0]
	if active_device_id==DEVICE_AUTO:
		var direction: Vector2i=resolve_directions(
			Input.is_action_pressed("sf_left"),Input.is_action_pressed("sf_right"),
			Input.is_action_pressed("sf_jump"),Input.is_action_pressed("sf_crouch"))
		var action := 0
		for index in range(5):
			if Input.is_action_just_pressed(["sf_cut","sf_hew","sf_shot","sf_step","sf_feint"][index]):
				action=index+1
				break
		return [direction.x,direction.y,action,1 if Input.is_action_pressed("sf_guard") else 0]
	var now: Dictionary={}
	for key in ACTIONS:
		now[key]=_locked_pressed(key)
	var movement: Vector2i=resolve_directions(
		bool(now["sf_left"]),bool(now["sf_right"]),bool(now["sf_jump"]),bool(now["sf_crouch"]))
	var action := 0
	for index in range(5):
		var key: String=["sf_cut","sf_hew","sf_shot","sf_step","sf_feint"][index]
		if now[key] and not previous_pressed.get(key,false):
			action=index+1
			break
	previous_pressed=now
	return [movement.x,movement.y,action,1 if now["sf_guard"] else 0]

func with_device_rebinding(profile: Dictionary, action: String, entry: Dictionary, device_family: String) -> Dictionary:
	if action not in ACTIONS or device_family not in ["kbm","pad"]:
		return {}
	if not validate_profile(profile).is_empty():
		return {}
	var kind := str(entry.get("kind",""))
	if device_family=="kbm" and kind not in ["key","mouse"]:
		return {}
	if device_family=="pad" and kind not in ["pad_button","pad_axis"]:
		return {}
	var result := profile.duplicate(true)
	var entries: Array = result["actions"][action]
	var position := -1
	for index in range(entries.size()):
		var existing_kind := str(entries[index].get("kind",""))
		if (existing_kind in ["key","mouse"]) == (device_family=="kbm"):
			position=index
			break
	if position>=0:
		entries[position]=entry
	else:
		entries.append(entry)
	return result if validate_profile(result).is_empty() else {}
