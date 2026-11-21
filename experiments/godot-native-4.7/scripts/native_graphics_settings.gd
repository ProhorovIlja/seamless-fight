extends CanvasLayer
## Native PC renderer preferences, not mock vendor GPU features.
## Uses existing Godot API-backed graphics controller, no external SDK toggles.
const BRAND_FONT = preload("res://assets/fonts/EBGaramond.ttf")
const Graphics = preload("res://scripts/native_graphics.gd")
const SAVE_MOTION = "user://sf_native_motion_v1.json"
const GOLD := Color("#d6b67b")
const BONE := Color("#efe1c4")
const MUTED := Color("#b5a89a")
const SLATE := Color(0.06,0.065,0.08,0.985)
const BORDER := Color("#69583f")
const FPS_OPTIONS := [0,60,80,90,100,120,144,165,180,200,240,360]
const OPTION_FIELDS := {"Upscaling":"upscale","VSync":"vsync","WindowMode":"display","FpsCap":"fps_cap"}
var controller: Node
var profile: Dictionary
var upscale: OptionButton
var vsync: OptionButton
var window_mode: OptionButton
var fps_cap: OptionButton
var render_scale: HSlider
var render_scale_label: Label
var reduce_motion: CheckButton
var status: Label

func _ready() -> void:
	layer=35
	controller=Graphics.new()
	add_child(controller)
	profile=controller.load_profile()
	if not controller.apply_profile(profile):
		profile=controller.default_profile()
		controller.apply_profile(profile)
	_build()
	_apply_motion_preference(_read_motion_preference())
	visible=false

func _style(fill: Color, margin: int=9) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color=fill
	s.border_color=BORDER
	s.set_border_width_all(1)
	s.set_corner_radius_all(2)
	s.set_content_margin_all(margin)
	return s

func _label(message: String, size: int=18, ink: Color=BONE) -> Label:
	var x := Label.new()
	x.text=message
	x.add_theme_font_override("font",BRAND_FONT)
	x.add_theme_font_size_override("font_size",size)
	x.add_theme_color_override("font_color",ink)
	return x

func _button(message: String) -> Button:
	var b := Button.new()
	b.text=message
	b.custom_minimum_size=Vector2(145,40)
	b.add_theme_font_override("font",BRAND_FONT)
	b.add_theme_color_override("font_color",BONE)
	b.add_theme_color_override("font_hover_color",GOLD)
	b.add_theme_stylebox_override("normal",_style(Color("#222630")))
	b.add_theme_stylebox_override("hover",_style(Color("#343941")))
	return b

func _select(values: Array, names: Array, chosen: Variant) -> OptionButton:
	var opt := OptionButton.new()
	opt.custom_minimum_size=Vector2(310,35)
	for index in range(values.size()):
		opt.add_item(str(names[index]))
		opt.set_item_metadata(index,values[index])
		if values[index]==chosen:
			opt.select(index)
	return opt

func _line(stack: VBoxContainer, title: String, control: Control) -> void:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation",22)
	var heading := _label(title,17)
	heading.custom_minimum_size=Vector2(190,28)
	row.add_child(heading)
	control.size_flags_horizontal=Control.SIZE_EXPAND_FILL
	row.add_child(control)
	stack.add_child(row)

func _build() -> void:
	var shade := ColorRect.new()
	shade.color=Color(0.012,0.014,0.018,0.93)
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	shade.mouse_filter=Control.MOUSE_FILTER_STOP
	add_child(shade)
	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	shade.add_child(center)
	var panel := PanelContainer.new()
	panel.name="GraphicsPanel"
	panel.custom_minimum_size=Vector2(720,0)
	panel.add_theme_stylebox_override("panel",_style(SLATE,24))
	center.add_child(panel)
	var scroll := ScrollContainer.new()
	scroll.custom_minimum_size=Vector2(670,520)
	scroll.size_flags_vertical=Control.SIZE_EXPAND_FILL
	panel.add_child(scroll)
	var stack := VBoxContainer.new()
	stack.custom_minimum_size=Vector2(646,0)
	stack.add_theme_constant_override("separation",16)
	scroll.add_child(stack)
	stack.add_child(_label("VIDEO & RESPONSIVENESS",29,GOLD))
	stack.add_child(_label("Native 2.5D renderer · real Godot settings",14,MUTED))
	var divider := TextureRect.new()
	divider.texture=load("res://assets/site/divider.webp")
	divider.expand_mode=TextureRect.EXPAND_IGNORE_SIZE
	divider.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	divider.custom_minimum_size=Vector2(0,28)
	stack.add_child(divider)
	var available: Dictionary=controller.available_features()
	var upscale_ids: Array=["native","fsr1"]
	var upscale_labels: Array=["Native rendering","FSR 1 spatial"]
	if available.get("fsr2_2",false):
		upscale_ids.append("fsr2")
		upscale_labels.append("Godot FSR 2.2 temporal")
	upscale=_select(upscale_ids,upscale_labels,profile["upscale"])
	upscale.name="Upscaling"
	_line(stack,"Upscaling",upscale)
	render_scale=HSlider.new()
	render_scale.name="RenderScale"
	render_scale.min_value=50
	render_scale.max_value=100
	render_scale.step=5
	render_scale.custom_minimum_size=Vector2(250,28)
	render_scale.value=roundi(float(profile["scale"])*100.0)
	render_scale_label=_label("%d%% internal 3D resolution" % [roundi(render_scale.value)],15,MUTED)
	render_scale.value_changed.connect(func(value: float): render_scale_label.text="%d%% internal 3D resolution" % [roundi(value)])
	_line(stack,"3D resolution",render_scale)
	stack.add_child(render_scale_label)
	vsync=_select(["off","on","adaptive"],["Off (tearing possible)","On","Adaptive"],profile["vsync"])
	vsync.name="VSync"
	_line(stack,"Vertical sync",vsync)
	window_mode=_select(["windowed","borderless","fullscreen"],["Windowed","Borderless fullscreen","Exclusive fullscreen"],profile["display"])
	window_mode.name="WindowMode"
	_line(stack,"Display mode",window_mode)
	var cap_labels: Array=[]
	for limit in FPS_OPTIONS:
		cap_labels.append("Uncapped" if limit==0 else str(limit)+" FPS")
	fps_cap=_select(FPS_OPTIONS,cap_labels,profile["fps_cap"])
	fps_cap.name="FpsCap"
	_line(stack,"Maximum FPS",fps_cap)
	reduce_motion=CheckButton.new()
	reduce_motion.name="ReducedMotion"
	reduce_motion.text="Reduce decorative environment motion"
	reduce_motion.add_theme_color_override("font_color",BONE)
	stack.add_child(reduce_motion)
	var notice := _label("Vendor SDKs unavailable: DLSS 5, FSR 4, XeSS, Reflex, frame generation.",14,MUTED)
	notice.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	stack.add_child(notice)
	stack.add_child(_label("FPS caps and scaling affect rendering, not 60 Hz combat timing.",14,MUTED))
	var action_row := HBoxContainer.new()
	action_row.add_theme_constant_override("separation",12)
	var apply_button := _button("Apply & save")
	apply_button.name="Apply"
	apply_button.pressed.connect(apply_settings)
	action_row.add_child(apply_button)
	var reset_button := _button("Reset defaults")
	reset_button.name="Defaults"
	reset_button.pressed.connect(_restore_defaults)
	action_row.add_child(reset_button)
	var close_button := _button("Back")
	close_button.name="Back"
	close_button.pressed.connect(close_settings)
	action_row.add_child(close_button)
	stack.add_child(action_row)
	status=_label("No vendor GPU features are enabled without a real integration.",14,MUTED)
	status.name="Status"
	stack.add_child(status)

func _read_motion_preference() -> bool:
	if not FileAccess.file_exists(SAVE_MOTION):
		return false
	var f:=FileAccess.open(SAVE_MOTION,FileAccess.READ)
	if f==null or f.get_length()>256:
		return false
	var value: Variant=JSON.parse_string(f.get_as_text())
	return value is Dictionary and value.get("version")==1 and value.get("reduce_motion") is bool and value["reduce_motion"]

func _apply_motion_preference(value: bool) -> void:
	reduce_motion.button_pressed=value
	get_parent().get_node("SiteBackdrop").set_reduce_motion(value)

func _save_motion(value: bool) -> bool:
	var file:=FileAccess.open(SAVE_MOTION,FileAccess.WRITE)
	if file==null:
		return false
	file.store_string(JSON.stringify({"version":1,"reduce_motion":value}))
	file.close()
	return true

func _chosen(opt: OptionButton) -> Variant:
	return opt.get_item_metadata(opt.selected) if opt.selected>=0 else null

func apply_settings() -> bool:
	var chosen: Dictionary={
		"version":profile["version"],
		"upscale":_chosen(upscale),
		"scale":float(render_scale.value)/100.0,
		"vsync":_chosen(vsync),
		"display":_chosen(window_mode),
		"fps_cap":_chosen(fps_cap)
	}
	var errors: Array[String]=controller.validate_profile(chosen)
	if not errors.is_empty() or not controller.apply_profile(chosen):
		status.text="Unsupported renderer profile; nothing was saved."
		return false
	profile=chosen.duplicate(true)
	var saved: bool=controller.save_profile(profile)
	var motion_saved: bool=_save_motion(reduce_motion.button_pressed)
	_apply_motion_preference(reduce_motion.button_pressed)
	status.text="Saved real renderer settings." if saved and motion_saved else "Applied, but could not persist all preferences."
	return saved and motion_saved

func _restore_defaults() -> void:
	profile=controller.default_profile()
	if not controller.apply_profile(profile):
		status.text="Could not restore native renderer defaults."
		return
	controller.save_profile(profile)
	for opt in [upscale,vsync,window_mode,fps_cap]:
		for i in range(opt.item_count):
			if opt.get_item_metadata(i)==profile[OPTION_FIELDS[opt.name]]:
				opt.select(i)
				break
	render_scale.value=100.0
	_apply_motion_preference(false)
	_save_motion(false)
	status.text="Native renderer defaults restored."

func open_settings() -> void:
	visible=true

func close_settings() -> void:
	visible=false

func _unhandled_key_input(event: InputEvent) -> void:
	if not visible or not event is InputEventKey or not event.pressed or event.echo:
		return
	if event.keycode==KEY_ESCAPE or event.physical_keycode==KEY_ESCAPE:
		close_settings()
		get_viewport().set_input_as_handled()
