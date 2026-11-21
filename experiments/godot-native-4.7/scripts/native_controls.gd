extends Node
## Native 2.5D combat controls. Gameplay consumes actions, never raw device IDs.
## This is an opt-in user profile with bounded, fail-closed local JSON storage.
const VERSION := 1
const SAVE_PATH := "user://sf_native_controls_v1.json"
const MAX_BYTES := 16384
const DEADZONE := 0.25
const ACTIONS := ["sf_left","sf_right","sf_jump","sf_crouch","sf_guard",
	"sf_cut","sf_hew","sf_shot","sf_step","sf_feint"]

func _ready() -> void:
	apply_profile(load_profile())

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
		"deviceLocking":"not yet implemented; local multiplayer device arbitration required"}

func encoded_input() -> Array[int]:
	var x := int(Input.is_action_pressed("sf_right"))-int(Input.is_action_pressed("sf_left"))
	var y := int(Input.is_action_pressed("sf_crouch"))-int(Input.is_action_pressed("sf_jump"))
	var action := 0
	if Input.is_action_just_pressed("sf_cut"):
		action=1
	elif Input.is_action_just_pressed("sf_hew"):
		action=2
	elif Input.is_action_just_pressed("sf_shot"):
		action=3
	elif Input.is_action_just_pressed("sf_step"):
		action=4
	elif Input.is_action_just_pressed("sf_feint"):
		action=5
	return [x,y,action,1 if Input.is_action_pressed("sf_guard") else 0]

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
