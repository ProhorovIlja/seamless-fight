extends CanvasLayer
## Functional native Windows entry screen. Original-site colors and divider;
## no fictional ranked buttons or inaccessible engine options.
const GOLD := Color("#d6b67b")
const BONE := Color("#f1e5ca")
const MUTED := Color("#a9a196")
const DARK := Color("#0c0f15")
const PANEL := Color(0.055,0.063,0.080,0.98)
const BORDER := Color("#6c583b")
var status: Label
var join_code: LineEdit
var endpoint: LineEdit
var origin: LineEdit
var training: OptionButton
var moonlit: CheckButton
var invite: Label
var resume_button: Button
var clipboard_button: Button
var active_mode := ""
var room_code := ""
var panel: PanelContainer

func _ready() -> void:
	layer=25
	_build()
	var online: Node=get_parent().get_node("Online")
	online.room_code_ready.connect(_on_room)
	online.connection_state.connect(_on_notice)
	get_parent().get_node("Practice").practice_stopped.connect(_on_practice_stopped)
	visible=true

func _style(color: Color, margin: int=12) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color=color
	s.border_color=BORDER
	s.set_border_width_all(1)
	s.set_content_margin_all(margin)
	s.set_corner_radius_all(2)
	return s

func _label(value: String,size: int=16,color: Color=BONE) -> Label:
	var l := Label.new()
	l.text=value
	l.add_theme_color_override("font_color",color)
	l.add_theme_font_size_override("font_size",size)
	return l

func _button(label_text: String) -> Button:
	var b := Button.new()
	b.text=label_text
	b.custom_minimum_size=Vector2(188,42)
	b.add_theme_color_override("font_color",BONE)
	b.add_theme_color_override("font_hover_color",GOLD)
	b.add_theme_stylebox_override("normal",_style(Color("#222630"),7))
	b.add_theme_stylebox_override("hover",_style(Color("#303540"),7))
	return b

func _field(hint: String) -> LineEdit:
	var input := LineEdit.new()
	input.placeholder_text=hint
	input.custom_minimum_size=Vector2(200,36)
	input.add_theme_stylebox_override("normal",_style(Color("#1a1d24"),8))
	input.add_theme_color_override("font_color",BONE)
	input.add_theme_color_override("font_placeholder_color",MUTED)
	input.max_length=256
	return input

func _line(root_node: VBoxContainer,title: String,control: Control) -> void:
	var line := HBoxContainer.new()
	line.add_theme_constant_override("separation",16)
	var heading := _label(title,15,MUTED)
	heading.custom_minimum_size=Vector2(178,26)
	line.add_child(heading)
	control.size_flags_horizontal=Control.SIZE_EXPAND_FILL
	line.add_child(control)
	root_node.add_child(line)

func _action_row(content: VBoxContainer, entries: Array) -> void:
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation",9)
	for entry in entries:
		h.add_child(entry)
	content.add_child(h)

func _build() -> void:
	var shade := ColorRect.new()
	shade.name="MenuShade"
	shade.color=Color(0.018,0.021,0.030,0.88)
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	shade.mouse_filter=Control.MOUSE_FILTER_STOP
	add_child(shade)
	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	shade.add_child(center)
	panel=PanelContainer.new()
	panel.name="NativeMenuPanel"
	panel.custom_minimum_size=Vector2(770,0)
	panel.add_theme_stylebox_override("panel",_style(PANEL,28))
	center.add_child(panel)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation",13)
	panel.add_child(column)
	var title := _label("S E A M L E S S   F I G H T",32,GOLD)
	title.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER
	column.add_child(title)
	var subtitle := _label("THE HUNTER'S COURT   ·   NATIVE WINDOWS EXPERIMENT",13,MUTED)
	subtitle.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER
	column.add_child(subtitle)
	var divider := TextureRect.new()
	divider.texture=load("res://assets/site/divider.webp") as Texture2D
	divider.expand_mode=TextureRect.EXPAND_IGNORE_SIZE
	divider.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	divider.custom_minimum_size=Vector2(650,28)
	column.add_child(divider)
	column.add_child(_label("SOLO TRAINING",18,GOLD))
	training=OptionButton.new()
	training.name="TrainingDifficulty"
	for difficulty in ["Passive dummy","Easy","Normal","Hard"]:
		training.add_item(difficulty)
	training.select(2)
	_line(column,"Opponent behavior",training)
	var start := _button("Begin training")
	start.name="BeginTraining"
	start.pressed.connect(_start_training)
	_action_row(column,[start])
	column.add_child(_label("PRIVATE 1V1   ·   UNRATED",18,GOLD))
	endpoint=_field("wss://host.example/fight/side/socket")
	endpoint.name="ServerEndpoint"
	_line(column,"WebSocket endpoint",endpoint)
	origin=_field("https://host.example")
	origin.name="ServerOrigin"
	_line(column,"Server origin",origin)
	join_code=_field("12-character invitation, blank to host")
	join_code.name="RoomCode"
	join_code.max_length=12
	_line(column,"Room invitation",join_code)
	var host := _button("Create private room")
	host.name="CreateRoom"
	host.pressed.connect(_host_private)
	var join := _button("Join private room")
	join.name="JoinRoom"
	join.pressed.connect(_join_private)
	_action_row(column,[host,join])
	invite=_label("Room code appears here after server acceptance.",15,GOLD)
	invite.name="Invite"
	column.add_child(invite)
	clipboard_button=_button("Copy room code")
	clipboard_button.disabled=true
	clipboard_button.pressed.connect(_copy_invite)
	column.add_child(clipboard_button)
	moonlit=CheckButton.new()
	moonlit.name="SiteScenery"
	moonlit.text="Use animated Seamless Hunt moonlit city artwork"
	moonlit.add_theme_color_override("font_color",BONE)
	moonlit.toggled.connect(_toggle_scenery)
	column.add_child(moonlit)
	var bar := HSeparator.new()
	column.add_child(bar)
	var controls := _button("Keybinds & controls")
	controls.pressed.connect(func(): get_parent().get_node("InputSettings").open_settings())
	resume_button=_button("Resume")
	resume_button.name="Resume"
	resume_button.disabled=true
	resume_button.pressed.connect(_resume)
	var leave := _button("Leave session")
	leave.name="Leave"
	leave.pressed.connect(_leave)
	var exit := _button("Quit to Desktop")
	exit.name="Exit"
	exit.pressed.connect(func(): get_tree().quit())
	_action_row(column,[controls,resume_button,leave,exit])
	status=_label("Local training requires the compiled C++ combat extension. F1 toggles this menu.",14,MUTED)
	status.name="Status"
	column.add_child(status)

func _toggle_scenery(yes: bool) -> void:
	var ok: bool=get_parent().set_visual_stage("moonlit" if yes else "reliquary")
	if not ok:
		status.text="Stage artwork unavailable; original painting retained."

func _start_training() -> void:
	var profile: String=["passive","easy","normal","hard"][training.selected]
	if get_parent().get_node("Online").online:
		status.text="Leave the private room before starting local training."
		return
	if not get_parent().begin_local_practice(profile):
		status.text="Native C++ combat extension missing or failed to initialize."
		return
	active_mode="training"
	resume_button.disabled=false
	status.text="Offline "+profile+" training · F1 for menu, Esc for controls."
	visible=false

func _connect_private(code: String) -> void:
	if active_mode=="training" or get_parent().get_node("Practice").active:
		status.text="Leave training before connecting online."
		return
	if endpoint.text.strip_edges().is_empty() or origin.text.strip_edges().is_empty():
		status.text="Set both endpoint and matching origin to your actual private server."
		return
	if not get_parent().connect_private_1v1(endpoint.text.strip_edges(),origin.text.strip_edges(),code):
		status.text="Invalid endpoint, origin or room invitation."
		return
	active_mode="online"
	resume_button.disabled=false
	status.text="Connecting to private room. Waiting for the server response."

func _host_private() -> void:
	_connect_private("")

func _join_private() -> void:
	if join_code.text.strip_edges().length()!=12:
		status.text="Joining requires an existing 12-character room invitation."
		return
	_connect_private(join_code.text.strip_edges())

func _on_room(code: String,slot: int) -> void:
	room_code=code
	invite.text="Invitation: "+code+"   ·   Player "+str(slot+1)
	clipboard_button.disabled=false
	status.text="Share the invitation privately. Game begins when both hunters join."

func _on_notice(message: String) -> void:
	status.text=message.left(140)

func _copy_invite() -> void:
	if room_code.length()==12:
		DisplayServer.clipboard_set(room_code)
		status.text="Room invitation copied. It is not an account credential."

func _resume() -> void:
	if active_mode=="training":
		var practice: Node=get_parent().get_node("Practice")
		if practice.active:
			practice.set_physics_process(true)
	elif active_mode=="online":
		if not get_parent().get_node("Online").online:
			status.text="Private room has disconnected."
			return
	else:
		return
	visible=false

func _leave() -> void:
	get_parent().end_local_practice()
	get_parent().disconnect_private_1v1()
	active_mode=""
	room_code=""
	resume_button.disabled=true
	clipboard_button.disabled=true
	invite.text="No active room. Create one or enter an invitation."
	status.text="Session ended. No rated progress is recorded."
	visible=true

func _on_practice_stopped() -> void:
	if active_mode=="training":
		active_mode=""
		resume_button.disabled=true

func _input(event: InputEvent) -> void:
	if not event is InputEventKey or not event.pressed or event.echo or event.keycode!=KEY_F1:
		return
	var settings: CanvasLayer=get_parent().get_node("InputSettings")
	if settings.visible:
		return
	if visible:
		_resume()
	else:
		visible=true
		if active_mode=="training":
			get_parent().get_node("Practice").set_physics_process(false)
	get_viewport().set_input_as_handled()
