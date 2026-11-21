extends CanvasLayer
const BRAND_FONT=preload("res://assets/fonts/EBGaramond.ttf")
## User-facing native input screen. Mirrors Seamless Hunt slate/bone/gold tokens.
## Escape toggles settings. No network requests or arbitrary file imports.
const COLORS={
	"slate":Color("#14171c"),"raised":Color("#262a31"),
	"gold":Color("#d9b878"),"bone":Color("#f0e2c2"),
	"muted":Color("#aea590"),"frame":Color("#5b5144")
}
const TITLES={
	"sf_left":"Move left","sf_right":"Move right","sf_jump":"Jump",
	"sf_crouch":"Crouch","sf_guard":"Guard / deflect",
	"sf_cut":"Light attack","sf_hew":"Heavy attack",
	"sf_shot":"Firearm","sf_step":"Quickstep","sf_feint":"Feint"
}
var controls: Node
var profile: Dictionary={}
var pending_action := ""
var pending_device := ""
var feedback: Label
var device_info: Label
var buttons: Dictionary={}

func _ready() -> void:
	layer=40
	controls=get_parent().get_node("NativeControls")
	profile=controls.load_profile()
	_build()
	Input.joy_connection_changed.connect(_on_device_connection)
	visible=false

func _panel_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color=COLORS["slate"]
	style.border_color=COLORS["frame"]
	style.set_border_width_all(1)
	style.set_content_margin_all(20)
	return style

func _button_style(color: Color) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color=color
	style.border_color=COLORS["frame"]
	style.set_border_width_all(1)
	style.set_corner_radius_all(2)
	style.set_content_margin_all(8)
	return style

func _label(message: String,size: int = 18, color: Color = COLORS["bone"]) -> Label:
	var label := Label.new()
	label.text=message
	label.add_theme_color_override("font_color",color)
	label.add_theme_font_size_override("font_size",size)
	label.add_theme_font_override("font",BRAND_FONT)
	return label

func _button(message: String) -> Button:
	var button := Button.new()
	button.text=message
	button.custom_minimum_size=Vector2(158,38)
	button.add_theme_color_override("font_color",COLORS["bone"])
	button.add_theme_font_override("font",BRAND_FONT)
	button.add_theme_color_override("font_hover_color",COLORS["gold"])
	button.add_theme_stylebox_override("normal",_button_style(COLORS["raised"]))
	button.add_theme_stylebox_override("hover",_button_style(Color("#34343b")))
	return button

func _build() -> void:
	var shade := ColorRect.new()
	shade.color=Color(0.018,0.020,0.028,0.92)
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	shade.mouse_filter=Control.MOUSE_FILTER_STOP
	add_child(shade)
	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	shade.add_child(center)
	var panel := PanelContainer.new()
	panel.custom_minimum_size=Vector2(630,690)
	panel.add_theme_stylebox_override("panel",_panel_style())
	center.add_child(panel)
	var content := VBoxContainer.new()
	content.add_theme_constant_override("separation",12)
	panel.add_child(content)
	content.add_child(_label("HUNTER CONTROLS",30,COLORS["gold"]))
	content.add_child(_label("Keyboard, mouse, gamepad, fightstick and leverless inputs",14,COLORS["muted"]))
	device_info=_label("Scanning native controller mappings...",13,COLORS["muted"])
	device_info.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	content.add_child(device_info)
	content.add_child(_label("Legacy C++ prototype bindings shown; Hunt v3 has no guard.",13,COLORS["muted"]))
	var banner := TextureRect.new()
	banner.texture=load("res://assets/site/divider.webp") as Texture2D
	banner.expand_mode=TextureRect.EXPAND_IGNORE_SIZE
	banner.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	banner.custom_minimum_size=Vector2(0,24)
	content.add_child(banner)
	var scroll := ScrollContainer.new()
	scroll.custom_minimum_size=Vector2(0,490)
	scroll.size_flags_vertical=Control.SIZE_EXPAND_FILL
	content.add_child(scroll)
	var grid := GridContainer.new()
	grid.columns=3
	grid.add_theme_constant_override("h_separation",10)
	grid.add_theme_constant_override("v_separation",9)
	scroll.add_child(grid)
	grid.add_child(_label("ACTION",14,COLORS["gold"]))
	grid.add_child(_label("KEYBOARD / MOUSE",13,COLORS["gold"]))
	grid.add_child(_label("PAD / ARCADE",13,COLORS["gold"]))
	for action in controls.ACTIONS:
		grid.add_child(_label(TITLES[action],16))
		for family in ["kbm","pad"]:
			var button := _button("")
			grid.add_child(button)
			button.pressed.connect(_request_capture.bind(action,family))
			buttons[action+":"+family]=button
	var controls_row := HBoxContainer.new()
	controls_row.add_theme_constant_override("separation",12)
	content.add_child(controls_row)
	var reset_button := _button("Restore defaults")
	reset_button.pressed.connect(_restore_defaults)
	controls_row.add_child(reset_button)
	var close_button := _button("Done")
	close_button.pressed.connect(close_settings)
	controls_row.add_child(close_button)
	feedback=_label("Changes are saved locally; fighting simulation remains 60 Hz.",14,COLORS["muted"])
	content.add_child(feedback)
	_refresh()
	_refresh_devices()

func _refresh_devices() -> void:
	var info: Dictionary=controls.controller_diagnostics()
	var summary := []
	for item in info["devices"]:
		summary.append("%s (#%d)" % [str(item["name"]),int(item["id"])])
	device_info.text="SDL controllers: %d  ·  %s. Arcade sticks and leverless boards use the pad column when recognized; per-device lock and Windows hardware QA are pending." % [int(info["connected"]),", ".join(summary) if not summary.is_empty() else "none detected"]

func _on_device_connection(_device: int, _connected: bool) -> void:
	if is_inside_tree():
		_refresh_devices()

func _describe(action: String,family: String) -> String:
	for entry in profile["actions"][action]:
		var kind: String=str(entry["kind"])
		if family=="kbm" and kind in ["key","mouse"]:
			return "Key "+str(entry["code"]) if kind=="key" else "Mouse "+str(entry["code"])
		if family=="pad" and kind in ["pad_button","pad_axis"]:
			return "Pad "+str(entry["code"]) if kind=="pad_button" else "Axis "+str(entry["code"])+(" −" if entry["direction"]<0 else " +")
	return "Unassigned"

func _refresh() -> void:
	for action in controls.ACTIONS:
		for family in ["kbm","pad"]:
			var button: Button=buttons[action+":"+family]
			button.text=_describe(action,family)

func _request_capture(action: String,family: String) -> void:
	pending_action=action
	pending_device=family
	feedback.text="Press a "+("keyboard/mouse" if family=="kbm" else "controller")+" input for "+TITLES[action]+". Esc cancels."
	feedback.add_theme_color_override("font_color",COLORS["gold"])

func open_settings() -> void:
	pending_action=""
	pending_device=""
	visible=true
	_refresh()
	_refresh_devices()

func close_settings() -> void:
	pending_action=""
	pending_device=""
	visible=false

func _restore_defaults() -> void:
	var next: Dictionary=controls.default_profile()
	if controls.apply_profile(next) and controls.save_profile(next):
		profile=next
		_refresh()
		feedback.text="Default keyboard and controller bindings restored."
	else:
		feedback.text="Cannot save restored bindings."

func _unhandled_key_input(event: InputEvent) -> void:
	if get_parent().has_node("GraphicsSettings") and get_parent().get_node("GraphicsSettings").visible:
		return
	if not event is InputEventKey or not event.pressed or event.echo:
		return
	if event.keycode==KEY_ESCAPE or event.physical_keycode==KEY_ESCAPE:
		if not visible:
			open_settings()
		elif pending_action!="":
			pending_action=""
			pending_device=""
			feedback.text="Input rebinding cancelled."
		else:
			close_settings()
		get_viewport().set_input_as_handled()

func _input(event: InputEvent) -> void:
	if not visible or pending_action=="":
		return
	if event is InputEventKey and (event.keycode==KEY_ESCAPE or event.physical_keycode==KEY_ESCAPE):
		return
	var entry: Dictionary=controls.make_binding(event)
	if entry.is_empty():
		return
	if pending_device=="kbm" and entry["kind"] not in ["key","mouse"]:
		return
	if pending_device=="pad" and entry["kind"] not in ["pad_button","pad_axis"]:
		return
	var candidate: Dictionary=controls.with_device_rebinding(profile,pending_action,entry,pending_device)
	if candidate.is_empty():
		feedback.text="That control is invalid or already bound to another action."
		get_viewport().set_input_as_handled()
		return
	if not controls.apply_profile(candidate) or not controls.save_profile(candidate):
		feedback.text="Failed to save the new binding."
		get_viewport().set_input_as_handled()
		return
	profile=candidate
	pending_action=""
	pending_device=""
	_refresh()
	feedback.text="Binding saved to your local Windows profile."
	get_viewport().set_input_as_handled()
