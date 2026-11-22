extends CanvasLayer
## Real English-only all-action Hunt v3 settings, separate from side/1.
const FONT=preload("res://assets/fonts/EBGaramond.ttf")
const GOLD=Color("#d7b478")
const BONE=Color("#f0e3c6")
const MUTED=Color("#aaa196")
const NAMES={"move_left":"Move left","move_right":"Move right",
 "jump":"Jump","down":"Down · SOCD only","light":"Light attack","heavy":"Heavy attack",
 "charge":"Charged heavy","trick":"Trick transformation","shot":"Firearm",
 "step":"Quickstep","feint":"Feint","sync":"Focus cancel",
 "visceral":"Visceral","heal":"Healing vial","blood":"Create blood bullets"}
var hunt: Node
var profile: Dictionary={}
var capture_action: String=""
var capture_family: String=""
var buttons: Dictionary={}
var feedback: Label
var device_picker: OptionButton

func _ready() -> void:
	layer=42
	hunt=get_parent().get_node("HuntControls")
	profile=hunt.active_profile.duplicate(true)
	_build()
	Input.joy_connection_changed.connect(_refresh_devices.unbind(2))
	visible=false

func _skin() -> StyleBoxFlat:
	var style:=StyleBoxFlat.new()
	style.bg_color=Color("#131922")
	style.border_color=Color("#62523d")
	style.set_border_width_all(1)
	style.set_corner_radius_all(2)
	style.set_content_margin_all(9)
	return style

func _label(message: String,size: int=15,color: Color=BONE) -> Label:
	var label:=Label.new()
	label.text=message
	label.add_theme_font_override("font",FONT)
	label.add_theme_font_size_override("font_size",size)
	label.add_theme_color_override("font_color",color)
	return label

func _button(message: String) -> Button:
	var button:=Button.new()
	button.text=message
	button.custom_minimum_size=Vector2(160,35)
	button.add_theme_font_override("font",FONT)
	button.add_theme_color_override("font_color",BONE)
	button.add_theme_color_override("font_hover_color",GOLD)
	button.add_theme_stylebox_override("normal",_skin())
	return button

func _build() -> void:
	var dark:=ColorRect.new()
	dark.color=Color(0.01,0.015,0.023,0.96)
	dark.mouse_filter=Control.MOUSE_FILTER_STOP
	dark.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(dark)
	var center:=CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	dark.add_child(center)
	var panel:=PanelContainer.new()
	panel.name="HuntV3ControlsPanel"
	panel.custom_minimum_size=Vector2(815,0)
	panel.add_theme_stylebox_override("panel",_skin())
	center.add_child(panel)
	var stack:=VBoxContainer.new()
	stack.add_theme_constant_override("separation",11)
	panel.add_child(stack)
	var title:=_label("HUNT V3  ·  ALL COMBAT INPUTS",27,GOLD)
	title.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER
	stack.add_child(title)
	var subtitle:=_label("KBM · controller · arcade stick · leverless  |  No guard, macros or double-jump",14,MUTED)
	stack.add_child(subtitle)
	device_picker=OptionButton.new()
	device_picker.name="HuntDevicePicker"
	device_picker.item_selected.connect(_select_device)
	stack.add_child(device_picker)
	var scroll:=ScrollContainer.new()
	scroll.custom_minimum_size=Vector2(0,535)
	stack.add_child(scroll)
	var grid:=GridContainer.new()
	grid.columns=3
	grid.add_theme_constant_override("h_separation",10)
	grid.add_theme_constant_override("v_separation",7)
	scroll.add_child(grid)
	for label_text in ["ACTION","KEYBOARD / MOUSE","GAMEPAD / ARCADE"]:
		grid.add_child(_label(label_text,14,GOLD))
	for action in hunt.ACTIONS:
		grid.add_child(_label(NAMES[action],15))
		for family in ["kbm","pad"]:
			var button:=_button("Unassigned")
			button.name="HuntBind_"+action+"_"+family
			button.pressed.connect(_capture.bind(action,family))
			grid.add_child(button)
			buttons[action+":"+family]=button
	var row:=HBoxContainer.new()
	row.add_theme_constant_override("separation",12)
	stack.add_child(row)
	var reset:=_button("Restore defaults")
	reset.pressed.connect(_reset)
	row.add_child(reset)
	var close:=_button("Done")
	close.pressed.connect(close_settings)
	row.add_child(close)
	feedback=_label("Bindings are saved locally. Opposing directions resolve to neutral.",14,MUTED)
	feedback.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	stack.add_child(feedback)
	_refresh()
	_refresh_devices()

func _display(action: String,family: String) -> String:
	for binding in profile["actions"][action]:
		var kind: String=str(binding["kind"])
		if family=="kbm" and kind=="key":
			return OS.get_keycode_string(int(binding["code"]))
		if family=="kbm" and kind=="mouse":
			return "Mouse "+str(binding["code"])
		if family=="pad" and kind=="pad_button":
			return "Button "+str(binding["code"])
		if family=="pad" and kind=="pad_axis":
			return "Axis "+str(binding["code"])+("+" if int(binding["direction"])>0 else "-")
	return "Click to assign"

func _refresh() -> void:
	for action in hunt.ACTIONS:
		for family in ["kbm","pad"]:
			var b: Button=buttons[action+":"+family]
			b.text=_display(action,family)

func _refresh_devices() -> void:
	device_picker.clear()
	device_picker.add_item("Automatic – all mapped devices")
	device_picker.set_item_metadata(0,hunt.DEVICE_AUTO)
	device_picker.add_item("Keyboard and mouse only")
	device_picker.set_item_metadata(1,hunt.DEVICE_KBM)
	for device in Input.get_connected_joypads():
		var index: int=device_picker.item_count
		device_picker.add_item(Input.get_joy_name(int(device)).left(90)+" (#"+str(device)+")")
		device_picker.set_item_metadata(index,int(device))
	for index in range(device_picker.item_count):
		if int(device_picker.get_item_metadata(index))==hunt.selected_device:
			device_picker.select(index)
			break

func _select_device(index: int) -> void:
	if index<0 or index>=device_picker.item_count:
		return
	if hunt.select_device(int(device_picker.get_item_metadata(index))):
		feedback.text="Input device selected. Device IDs are never saved to the profile."
	else:
		feedback.text="Selected controller disconnected."
		_refresh_devices()

func _capture(action: String,family: String) -> void:
	capture_action=action
	capture_family=family
	feedback.text="Press a "+("key or mouse button" if family=="kbm" else "controller button or axis")+" for "+str(NAMES[action])+". Esc cancels."

func _reset() -> void:
	var defaults: Dictionary=hunt.default_profile()
	if hunt.save_profile(defaults) and hunt.apply_profile(defaults):
		profile=defaults
		_refresh()
		feedback.text="Hunt v3 defaults restored and saved."
	else:
		feedback.text="Defaults could not be saved."

func open_settings() -> void:
	profile=hunt.active_profile.duplicate(true)
	capture_action=""
	capture_family=""
	_refresh()
	_refresh_devices()
	visible=true

func close_settings() -> void:
	capture_action=""
	capture_family=""
	visible=false

func _input(event: InputEvent) -> void:
	if not visible:
		return
	if event is InputEventKey and event.pressed and not event.echo and \
	  (event.keycode==KEY_ESCAPE or event.physical_keycode==KEY_ESCAPE):
		if capture_action!="":
			capture_action=""
			capture_family=""
			feedback.text="Binding capture cancelled."
		else:
			close_settings()
		get_viewport().set_input_as_handled()
		return
	if capture_action=="":
		return
	var binding: Dictionary=hunt.make_binding(event)
	if binding.is_empty():
		return
	var next: Dictionary=hunt.with_rebinding(profile,capture_action,binding,capture_family)
	if next.is_empty():
		feedback.text="Input conflict or unsupported input. Choose another control."
		get_viewport().set_input_as_handled()
		return
	if not hunt.save_profile(next) or not hunt.apply_profile(next):
		feedback.text="Could not save the new binding."
		get_viewport().set_input_as_handled()
		return
	profile=next
	capture_action=""
	capture_family=""
	_refresh()
	feedback.text="Binding saved. One command per fixed simulation tick."
	get_viewport().set_input_as_handled()
