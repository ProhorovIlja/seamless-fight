extends Node
## Dedicated source-compatible Hunt v3 input profile. Does not overwrite
## legacy side/1 controls, multiplayer input packet or saved user settings.
## No macros, one-shot autofire, guard inputs, or device-id persistence.
const VERSION := 1
const FILE := "user://sf_hunt_controls_v1.json"
const MAX_BYTES := 32768
const DEADZONE := 0.25
const DEVICE_AUTO := -1
const DEVICE_KBM := -2
const ACTIONS := ["move_left","move_right","jump","crouch",
 "light","heavy","charge","trick","shot","step","feint","sync",
 "visceral","heal","blood"]
const VERBS := ["light","heavy","charge","trick","shot","step","feint",
 "sync","visceral","heal","blood"]
var selected_device := DEVICE_AUTO
var active_profile: Dictionary={}
var previous_pressed: Dictionary={}

func _ready() -> void:
	apply_profile(load_profile())
	Input.joy_connection_changed.connect(_device_changed)

func _key(code: int) -> Dictionary:
	return {"kind":"key","code":code}
func _button(code: int) -> Dictionary:
	return {"kind":"pad_button","code":code}
func _axis(code: int,dir: int) -> Dictionary:
	return {"kind":"pad_axis","code":code,"direction":dir}

func default_profile() -> Dictionary:
	return {"version":VERSION,"actions":{
	"move_left":[_key(KEY_A),_key(KEY_LEFT),_button(JOY_BUTTON_DPAD_LEFT),_axis(JOY_AXIS_LEFT_X,-1)],
	"move_right":[_key(KEY_D),_key(KEY_RIGHT),_button(JOY_BUTTON_DPAD_RIGHT),_axis(JOY_AXIS_LEFT_X,1)],
	"jump":[_key(KEY_SPACE),_key(KEY_W),_button(JOY_BUTTON_A)],
	"crouch":[_key(KEY_S),_key(KEY_DOWN),_button(JOY_BUTTON_DPAD_DOWN),_axis(JOY_AXIS_LEFT_Y,1)],
	"light":[_key(KEY_J),_button(JOY_BUTTON_X)],
	"heavy":[_key(KEY_K),_button(JOY_BUTTON_Y)],
	"charge":[_key(KEY_U)],
	"trick":[_key(KEY_Q),_button(JOY_BUTTON_LEFT_SHOULDER)],
	"shot":[_key(KEY_L),_button(JOY_BUTTON_RIGHT_SHOULDER)],
	"step":[_key(KEY_SHIFT),_button(JOY_BUTTON_B)],
	"feint":[_key(KEY_I),_button(JOY_BUTTON_LEFT_STICK)],
	"sync":[_key(KEY_O),_button(JOY_BUTTON_BACK)],
	"visceral":[_key(KEY_V),_axis(JOY_AXIS_TRIGGER_RIGHT,1)],
	"heal":[_key(KEY_E),_axis(JOY_AXIS_TRIGGER_LEFT,1)],
	"blood":[_key(KEY_R),_button(JOY_BUTTON_RIGHT_STICK)]
	}}

func _fingerprint(binding: Dictionary) -> String:
	return str(binding.get("kind",""))+":"+str(binding.get("code",""))+":"+str(binding.get("direction",0))

func validate_profile(raw: Variant) -> Array[String]:
	var errors: Array[String]=[]
	if not raw is Dictionary:
		return ["Hunt input profile must be an object"]
	var value: Dictionary=raw
	if value.size()!=2 or value.get("version",-1)!=VERSION:
		errors.append("Wrong Hunt controls version")
	var bindings: Variant=value.get("actions")
	if not bindings is Dictionary:
		errors.append("Missing Hunt actions dictionary")
		return errors
	if bindings.size()!=ACTIONS.size():
		errors.append("Hunt actions list must contain all 15 controls exactly")
	var used: Dictionary={}
	for action in ACTIONS:
		if not bindings.has(action):
			errors.append("Missing Hunt action "+action)
			continue
		var entries: Variant=bindings[action]
		if not entries is Array or entries.is_empty() or entries.size()>8:
			errors.append("Hunt action requires 1-8 bindings: "+action)
			continue
		for item in entries:
			if not item is Dictionary or not item.has("kind") or not item.has("code"):
				errors.append("Malformed input mapping: "+action)
				continue
			var kind: String=str(item["kind"])
			var code: Variant=item["code"]
			var direction: Variant=item.get("direction",0)
			if typeof(code)!=TYPE_INT or typeof(direction)!=TYPE_INT:
				errors.append("Input mapping codes must be integer")
				continue
			var allowed:=false
			match kind:
				"key":
					allowed=item.size()==2 and code>=32 and code<=4194500 and code not in [KEY_ESCAPE,KEY_ENTER,KEY_KP_ENTER]
				"mouse":
					allowed=item.size()==2 and code in [MOUSE_BUTTON_LEFT,MOUSE_BUTTON_RIGHT,MOUSE_BUTTON_MIDDLE,MOUSE_BUTTON_XBUTTON1,MOUSE_BUTTON_XBUTTON2]
				"pad_button":
					allowed=item.size()==2 and code>=0 and code<=22
				"pad_axis":
					allowed=item.size()==3 and code>=0 and code<=JOY_AXIS_TRIGGER_RIGHT and direction in [-1,1]
			if not allowed:
				errors.append("Invalid Hunt input mapping: "+action)
				continue
			var key: String=_fingerprint(item)
			if used.has(key):
				errors.append("Duplicate Hunt physical input: "+str(used[key])+" and "+action)
			used[key]=action
	for action in bindings.keys():
		if action not in ACTIONS:
			errors.append("Unknown Hunt input action "+str(action))
	return errors

func _event(binding: Dictionary) -> InputEvent:
	var code: int=int(binding["code"])
	match str(binding["kind"]):
		"key":
			var event:=InputEventKey.new()
			event.physical_keycode=code
			return event
		"mouse":
			var event:=InputEventMouseButton.new()
			event.button_index=code
			return event
		"pad_button":
			var event:=InputEventJoypadButton.new()
			event.button_index=code
			return event
		"pad_axis":
			var event:=InputEventJoypadMotion.new()
			event.axis=code
			event.axis_value=float(binding["direction"])
			return event
	return null

func apply_profile(profile: Dictionary) -> bool:
	if not validate_profile(profile).is_empty():
		return false
	active_profile=profile.duplicate(true)
	previous_pressed.clear()
	for action in ACTIONS:
		var id: String="sfh_"+action
		if not InputMap.has_action(id):
			InputMap.add_action(id,DEADZONE)
		InputMap.action_erase_events(id)
		InputMap.action_set_deadzone(id,DEADZONE)
		for binding in active_profile["actions"][action]:
			InputMap.action_add_event(id,_event(binding))
	return true

func normalized_json(raw: Variant) -> Dictionary:
	# JSON.parse_string returns numeric floats in Godot; accept ONLY exact,
	# bounded integral metadata, never approximate or fractional device IDs.
	if not raw is Dictionary:
		return {}
	var data: Dictionary=raw.duplicate(true)
	var version: Variant=data.get("version",-1)
	if typeof(version) not in [TYPE_INT,TYPE_FLOAT] or not is_finite(float(version)) or float(version)!=VERSION:
		return {}
	data["version"]=VERSION
	if not data.get("actions") is Dictionary:
		return {}
	for action in data["actions"]:
		var entries: Variant=data["actions"][action]
		if not entries is Array:
			return {}
		for item in entries:
			if not item is Dictionary:
				return {}
			for key in ["code","direction"]:
				if item.has(key):
					var n: Variant=item[key]
					if typeof(n) not in [TYPE_INT,TYPE_FLOAT] or not is_finite(float(n)) or absf(float(n))>4194500.0 or float(n)!=floorf(float(n)):
						return {}
					item[key]=int(n)
	return data if validate_profile(data).is_empty() else {}

func save_profile(profile: Dictionary) -> bool:
	if not validate_profile(profile).is_empty():
		return false
	var content: String=JSON.stringify(profile)
	if content.to_utf8_buffer().size()>MAX_BYTES:
		return false
	var file:=FileAccess.open(FILE,FileAccess.WRITE)
	if file==null:
		return false
	file.store_string(content)
	file.close()
	return true

func load_profile() -> Dictionary:
	if not FileAccess.file_exists(FILE):
		return default_profile()
	var file:=FileAccess.open(FILE,FileAccess.READ)
	if file==null or file.get_length()>MAX_BYTES:
		return default_profile()
	var next: Dictionary=normalized_json(JSON.parse_string(file.get_as_text()))
	return next if not next.is_empty() else default_profile()

func make_binding(event: InputEvent) -> Dictionary:
	if event is InputEventKey and event.pressed and not event.echo:
		var code: int=event.physical_keycode if event.physical_keycode else event.keycode
		return _key(code)
	if event is InputEventMouseButton and event.pressed:
		return {"kind":"mouse","code":event.button_index}
	if event is InputEventJoypadButton and event.pressed:
		return _button(event.button_index)
	if event is InputEventJoypadMotion and absf(event.axis_value)>=0.65:
		return _axis(event.axis,-1 if event.axis_value<0 else 1)
	return {}

func with_rebinding(profile: Dictionary,action: String,new_binding: Dictionary,family: String) -> Dictionary:
	if action not in ACTIONS or family not in ["kbm","pad"] or not validate_profile(profile).is_empty():
		return {}
	var kind: String=str(new_binding.get("kind",""))
	if (family=="kbm" and kind not in ["key","mouse"]) or (family=="pad" and kind not in ["pad_button","pad_axis"]):
		return {}
	var result: Dictionary=profile.duplicate(true)
	var bindings: Array=result["actions"][action]
	var replaced:=false
	for index in range(bindings.size()):
		var old_kind: String=str(bindings[index].get("kind",""))
		if (old_kind in ["key","mouse"])==(family=="kbm"):
			bindings[index]=new_binding
			replaced=true
			break
	if not replaced:
		bindings.append(new_binding)
	return result if validate_profile(result).is_empty() else {}

func select_device(id: int) -> bool:
	if id!=DEVICE_AUTO and id!=DEVICE_KBM and id not in Input.get_connected_joypads():
		return false
	selected_device=id
	previous_pressed.clear()
	return true

func _device_changed(id: int,connected: bool) -> void:
	if not connected and selected_device==id:
		selected_device=DEVICE_KBM
		previous_pressed.clear()

func _binding_pressed(binding: Dictionary) -> bool:
	var kind: String=str(binding["kind"])
	var code: int=int(binding["code"])
	if selected_device==DEVICE_KBM and kind=="key":
		return Input.is_physical_key_pressed(code)
	if selected_device==DEVICE_KBM and kind=="mouse":
		return Input.is_mouse_button_pressed(code)
	if selected_device>=0 and kind=="pad_button":
		return Input.is_joy_button_pressed(selected_device,code)
	if selected_device>=0 and kind=="pad_axis":
		return Input.get_joy_axis(selected_device,code)*int(binding["direction"])>=0.5
	return false

func _pressed(action: String) -> bool:
	if selected_device==DEVICE_AUTO:
		return Input.is_action_pressed("sfh_"+action)
	for binding in active_profile["actions"][action]:
		if _binding_pressed(binding):
			return true
	return false

func encode_pressed(now: Dictionary) -> Array:
	# Deliberately pure resolution of direction and button edges, not input
	# injection or macro generation. Other held buttons are not repeated.
	var horizontal: int=int(bool(now.get("move_right",false)))-int(bool(now.get("move_left",false)))
	var vertical: int=int(bool(now.get("crouch",false)))-int(bool(now.get("jump",false)))
	var move:=0
	for index in range(VERBS.size()):
		var action: String=VERBS[index]
		if bool(now.get(action,false)) and not bool(previous_pressed.get(action,false)):
			move=index+1
			break
	previous_pressed=now.duplicate(true)
	return [horizontal,vertical,move,0] # Conventional guard is forbidden.

func encoded_input() -> Array:
	if DisplayServer.get_name()!="headless" and not DisplayServer.window_is_focused():
		previous_pressed.clear()
		return [0,0,0,0]
	var now: Dictionary={}
	for action in ACTIONS:
		now[action]=_pressed(action)
	return encode_pressed(now)
