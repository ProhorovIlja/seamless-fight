extends CanvasLayer
const BRAND_FONT=preload("res://assets/fonts/EBGaramond.ttf")
## Functional native Windows entry screen. Original-site colors and divider;
## no fictional ranked buttons or inaccessible engine options.
const GOLD := Color("#d6b67b")
const BONE := Color("#f1e5ca")
const MUTED := Color("#a9a196")
const DARK := Color("#0c0f15")
const PANEL := Color(0.055,0.063,0.080,0.98)
const BORDER := Color("#6c583b")
var status: Label
var practice_details: Label
var court_activity: Label
var join_code: LineEdit
var endpoint: LineEdit
var origin: LineEdit
var training: OptionButton
var moonlit: CheckButton
var invite: Label
var resume_button: Button
var clipboard_button: Button
var spectator_code: LineEdit
var gallery_button: Button
var gallery_clipboard: Button
var gallery_label: Label
var gallery_code := ""
var gallery_host_slot := -1
var active_mode := ""
var room_code := ""
var panel: PanelContainer

func _ready() -> void:
	layer=25
	_build()
	var online: Node=get_parent().get_node("Online")
	online.room_code_ready.connect(_on_room)
	online.connection_state.connect(_on_notice)
	online.gallery_ready.connect(_on_gallery)
	online.audience_changed.connect(_on_audience)
	get_parent().get_node("Practice").practice_stopped.connect(_on_practice_stopped)
	var live: Node=get_parent().get_node("CourtStatus")
	live.activity_changed.connect(_on_court_activity)
	visible=true
	if DisplayServer.get_name()!="headless":
		live.refresh()
		var polling := Timer.new()
		polling.wait_time=15.0
		polling.autostart=true
		polling.timeout.connect(_poll_court_status)
		add_child(polling)

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
	l.add_theme_font_override("font",BRAND_FONT)
	return l

func _button(label_text: String) -> Button:
	var b := Button.new()
	b.text=label_text
	b.custom_minimum_size=Vector2(156,42)
	b.add_theme_color_override("font_color",BONE)
	b.add_theme_font_override("font",BRAND_FONT)
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
	var scroll := ScrollContainer.new()
	scroll.name="MenuScroll"
	scroll.custom_minimum_size=Vector2(710,770)
	scroll.size_flags_vertical=Control.SIZE_EXPAND_FILL
	panel.add_child(scroll)
	column.custom_minimum_size=Vector2(684,0)
	scroll.add_child(column)
	var title := _label("S E A M L E S S   F I G H T",32,GOLD)
	title.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER
	column.add_child(title)
	var subtitle := _label("THE HUNTER'S COURT   ·   NATIVE WINDOWS EXPERIMENT",13,MUTED)
	subtitle.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER
	column.add_child(subtitle)
	court_activity=_label("Live connections: unavailable · Friends / Ranked: not connected",14,GOLD)
	court_activity.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER
	court_activity.name="CourtActivity"
	column.add_child(court_activity)
	var disclaimer := _label("Counts show actual connections, never verified unique players. Only 1v1 is supported.",12,MUTED)
	disclaimer.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER
	column.add_child(disclaimer)
	var divider := TextureRect.new()
	divider.texture=load("res://assets/site/divider.webp") as Texture2D
	divider.expand_mode=TextureRect.EXPAND_IGNORE_SIZE
	divider.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	divider.custom_minimum_size=Vector2(650,28)
	column.add_child(divider)

	column.add_child(_label("HUNT V3 · ORIGINAL COMBAT RESEARCH",18,GOLD))
	column.add_child(_label("Offline only · 60 Hz C++ · No ranked or online Hunt yet",14,MUTED))
	var hunt_start:=_button("Begin Hunt v3 practice")
	hunt_start.name="BeginHuntPractice"
	hunt_start.pressed.connect(_start_hunt)
	var hunt_controls:=_button("Hunt v3 keybinds")
	hunt_controls.name="HuntBindings"
	hunt_controls.pressed.connect(func(): get_parent().get_node("HuntInputSettings").open_settings())
	_action_row(column,[hunt_start,hunt_controls])
	column.add_child(_label("SOLO TRAINING · LEGACY SIDE/1",18,GOLD))
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
	var rewind := _button("Rewind 60 frames")
	rewind.pressed.connect(_rewind_training)
	var forward := _button("Advance 1 frame")
	forward.pressed.connect(_advance_training)
	var restart := _button("Restart training")
	restart.pressed.connect(_restart_training)
	_action_row(column,[rewind,forward,restart])
	column.add_child(_label("TRAINING DUMMY RECORDING",18,GOLD))
	var record := _button("Record my inputs")
	record.pressed.connect(_record_dummy)
	var finish := _button("Finish recording")
	finish.pressed.connect(_finish_dummy)
	var replay := _button("Replay dummy loop")
	replay.pressed.connect(_play_dummy)
	_action_row(column,[record,finish,replay])
	var inspect_frames := _button("Frame data / input log")
	inspect_frames.name="InspectTrainingFrames"
	inspect_frames.pressed.connect(_inspect_training)
	_action_row(column,[inspect_frames])
	practice_details=_label("Training frame information appears here after a native match starts.",14,MUTED)
	practice_details.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	column.add_child(practice_details)
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
	column.add_child(_label("PUBLIC 1V1 SPECTATOR GALLERY",18,GOLD))
	gallery_button=_button("Open public spectator gallery")
	gallery_button.name="ToggleGallery"
	gallery_button.disabled=true
	gallery_button.pressed.connect(_toggle_gallery)
	gallery_clipboard=_button("Copy public watch link")
	gallery_clipboard.name="CopyWatchLink"
	gallery_clipboard.disabled=true
	gallery_clipboard.pressed.connect(_copy_watch_link)
	_action_row(column,[gallery_button,gallery_clipboard])
	gallery_label=_label("Host opt-in only · up to 6 read-only spectators · separate from private room invitation",13,MUTED)
	gallery_label.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	column.add_child(gallery_label)
	spectator_code=_field("12-character public spectator code")
	spectator_code.name="SpectatorCode"
	spectator_code.max_length=12
	_line(column,"Watch code",spectator_code)
	var watch := _button("Spectate live 1v1")
	watch.name="WatchDuel"
	watch.pressed.connect(_spectate_live)
	_action_row(column,[watch])
	moonlit=CheckButton.new()
	moonlit.name="SiteScenery"
	moonlit.text="Use animated Seamless Hunt moonlit city artwork"
	moonlit.add_theme_color_override("font_color",BONE)
	moonlit.toggled.connect(_toggle_scenery)
	column.add_child(moonlit)
	var sound_line := HBoxContainer.new()
	sound_line.add_theme_constant_override("separation",14)
	sound_line.add_child(_label("COMBAT FOLEY",14,GOLD))
	var sound_slider := HSlider.new()
	sound_slider.name="CombatVolume"
	sound_slider.min_value=0
	sound_slider.max_value=100
	sound_slider.step=1
	sound_slider.custom_minimum_size=Vector2(235,24)
	sound_slider.value=get_parent().get_node("NativeAudio").volume
	sound_slider.value_changed.connect(func(v: float): get_parent().get_node("NativeAudio").set_volume(int(v)))
	sound_line.add_child(sound_slider)
	var sound_mute := CheckButton.new()
	sound_mute.name="MuteCombat"
	sound_mute.text="Mute"
	sound_mute.button_pressed=get_parent().get_node("NativeAudio").muted
	sound_mute.toggled.connect(func(v: bool): get_parent().get_node("NativeAudio").set_muted(v))
	sound_line.add_child(sound_mute)
	column.add_child(sound_line)
	var bar := HSeparator.new()
	column.add_child(bar)
	var graphics := _button("Video & performance")
	graphics.pressed.connect(func(): get_parent().get_node("GraphicsSettings").open_settings())
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
	_action_row(column,[graphics,controls])
	_action_row(column,[resume_button,leave,exit])
	status=_label("Local training requires the compiled C++ combat extension. F1 toggles this menu.",14,MUTED)
	status.name="Status"
	column.add_child(status)

func _poll_court_status() -> void:
	if visible:
		get_parent().get_node("CourtStatus").refresh()

func _on_court_activity(_snapshot: Dictionary) -> void:
	if court_activity!=null:
		court_activity.text=get_parent().get_node("CourtStatus").display_text()

func _toggle_scenery(yes: bool) -> void:
	var ok: bool=get_parent().set_visual_stage("moonlit" if yes else "reliquary")
	if not ok:
		status.text="Stage artwork unavailable; original painting retained."

func _start_hunt() -> void:
	if not get_parent().begin_native_hunt_practice("pressure",0,1):
		status.text="Hunt v3 C++ training unavailable or another session is active."
		return
	active_mode="hunt"
	resume_button.disabled=false
	status.text="Experimental Hunt v3 · 1v1 offline · All action bindings available."
	visible=false

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

func _rewind_training() -> void:
	var practice: Node=get_parent().get_node("HuntPractice") if active_mode=="hunt" else get_parent().get_node("Practice")
	if not practice.rewind_frames(60):
		status.text="Need 60 frames of native practice history. Offline only."
		return
	status.text="Rewound 60 ticks, paused. Advance one frame or resume with F1."

func _advance_training() -> void:
	var practice: Node=get_parent().get_node("HuntPractice") if active_mode=="hunt" else get_parent().get_node("Practice")
	if not practice.advance_one_frame():
		status.text="First rewind or pause active local training."
		return
	status.text="Advanced exactly one deterministic C++ simulation tick."

func _restart_training() -> void:
	if not (get_parent().get_node("HuntPractice").reset_training() if active_mode=="hunt" else get_parent().reset_local_practice()):
		status.text="Start training before restarting the round."
		return
	(get_parent().get_node("HuntPractice") if active_mode=="hunt" else get_parent().get_node("Practice")).pause_training()
	status.text="Native fight and checkpoint timeline reset to the start."

func _record_dummy() -> void:
	if not get_parent().get_node("Practice").begin_dummy_recording():
		status.text="Start offline training before recording."
		return
	status.text="Recording your real 60Hz inputs, up to ten seconds. Resume with F1."

func _finish_dummy() -> void:
	var frames: int=get_parent().get_node("Practice").finish_dummy_recording()
	status.text="Recorded %d input frames. Select Replay dummy loop." % [frames]

func _play_dummy() -> void:
	if not get_parent().get_node("Practice").play_dummy_recording():
		status.text="Record at least one active-gameplay frame first."
		return
	status.text="Dummy now repeats your input tape, horizontally mirrored. No AI learning."

func _inspect_training() -> bool:
	if get_parent().get_node("HuntPractice").active:
		var hunt: Node=get_parent().get_node("HuntPractice")
		var hero: Dictionary=hunt.get_frame_meter(0)
		var foe: Dictionary=hunt.get_frame_meter(1)
		practice_details.text="HUNT V3 · 60 Hz native" + 		  "\nHunter: %s · %s %dF, %dS %dA %dR" % [
		  str(hero.get("action","")),str(hero.get("phase","idle")),int(hero.get("age",0)),
		  int(hero.get("startup",0)),int(hero.get("active",0)),int(hero.get("recovery",0))] + 		  "\nDummy: %s · %s %dF" % [
		  str(foe.get("action","")),str(foe.get("phase","idle")),int(foe.get("age",0))]
		return true

	var practice: Node=get_parent().get_node("Practice")
	if not practice.active:
		practice_details.text="Begin offline training to inspect frame phases and 60Hz inputs."
		return false
	var actor: Dictionary=practice.get_frame_meter(0)
	var foe: Dictionary=practice.get_frame_meter(1)
	if actor.is_empty() or foe.is_empty():
		practice_details.text="Training frame data unavailable."
		return false
	var trace: Array=practice.get_input_trace(5)
	var input_text := "No recorded inputs"
	if not trace.is_empty():
		var last: Dictionary=trace.back()
		input_text="Last tick %d: player %s | dummy %s" % [int(last["tick"]),str(last["player"]),str(last["dummy"])]
	practice_details.text=("LEGACY C++ TRAINING · seamless-side/1, NOT Hunt v3" +
		"\nPlayer: %s  %s  %dF  (%dS / %dA / %dR), remaining %dF" % [
			str(actor["action"]),str(actor["phase"]),int(actor["age"]),
			int(actor["startup"]),int(actor["active"]),int(actor["recovery"]),int(actor["remaining"])] +
		"\nDummy: %s  %s  %dF  (%dS / %dA / %dR)" % [
			str(foe["action"]),str(foe["phase"]),int(foe["age"]),
			int(foe["startup"]),int(foe["active"]),int(foe["recovery"])] +
		"\n"+input_text)
	return true

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
	gallery_host_slot=slot
	gallery_button.disabled=slot!=0
	room_code=code
	invite.text="Invitation: "+code+"   ·   Player "+str(slot+1)
	clipboard_button.disabled=false
	status.text="Share the invitation privately. Game begins when both hunters join."

func _toggle_gallery() -> void:
	if gallery_host_slot!=0 or active_mode!="online":
		return
	if not get_parent().get_node("Online").open_gallery(gallery_code.is_empty()):
		status.text="Cannot change public gallery; private host connection required."

func _on_gallery(code: String) -> void:
	gallery_code=code
	gallery_button.text="Close public spectator gallery" if not code.is_empty() else "Open public spectator gallery"
	gallery_clipboard.disabled=code.is_empty()
	gallery_label.text="Spectator code: "+code+" · 0 / 6 watching" if not code.is_empty() else "Public spectator gallery closed."

func _on_audience(viewers: int) -> void:
	if gallery_code.is_empty():
		return
	gallery_label.text="Spectator code: "+gallery_code+" · "+str(viewers)+" / 6 watching"

func _copy_watch_link() -> void:
	if gallery_code.length()!=12:
		return
	var base: String=origin.text.strip_edges().trim_suffix("/")
	DisplayServer.clipboard_set(base+"/fight/side/?watch="+gallery_code)
	status.text="Public 1v1 watch URL copied; fighter invitation remains private."

func _spectate_live() -> void:
	if active_mode=="training" or get_parent().get_node("Practice").active:
		status.text="Leave training before watching a public duel."
		return
	if spectator_code.text.length()!=12:
		status.text="Enter a valid 12-character public spectator code."
		return
	if endpoint.text.strip_edges().is_empty() or origin.text.strip_edges().is_empty():
		status.text="Set a matching server endpoint and origin first."
		return
	if not get_parent().spectate_public_1v1(endpoint.text.strip_edges(),origin.text.strip_edges(),spectator_code.text.strip_edges()):
		status.text="Watch code, server origin or 1v1 endpoint rejected."
		return
	active_mode="spectate"
	resume_button.disabled=false
	status.text="Connecting to read-only 1v1 spectator gallery…"

func _on_notice(message: String) -> void:
	status.text=message.left(140)

func _copy_invite() -> void:
	if room_code.length()==12:
		DisplayServer.clipboard_set(room_code)
		status.text="Room invitation copied. It is not an account credential."

func _resume() -> void:
	if active_mode in ["training","hunt"]:
		var practice: Node=get_parent().get_node("HuntPractice") if active_mode=="hunt" else get_parent().get_node("Practice")
		if practice.active:
			practice.resume_training()
	elif active_mode in ["online","spectate"]:
		if not get_parent().get_node("Online").online:
			status.text="Private room has disconnected."
			return
	else:
		return
	visible=false

func _leave() -> void:
	get_parent().end_local_practice()
	get_parent().end_native_hunt_practice()
	get_parent().disconnect_private_1v1()
	active_mode=""
	room_code=""
	gallery_code=""
	gallery_host_slot=-1
	gallery_button.disabled=true
	gallery_clipboard.disabled=true
	gallery_button.text="Open public spectator gallery"
	gallery_label.text="No public gallery. Only a room host may open spectating."
	resume_button.disabled=true
	clipboard_button.disabled=true
	invite.text="No active room. Create one or enter an invitation."
	status.text="Session ended. No rated progress is recorded."
	visible=true

func _on_practice_stopped() -> void:
	if active_mode in ["training","hunt"]:
		active_mode=""
		resume_button.disabled=true

func _input(event: InputEvent) -> void:
	if not event is InputEventKey or not event.pressed or event.echo or event.keycode!=KEY_F1:
		return
	var settings: CanvasLayer=get_parent().get_node("InputSettings")
	if settings.visible or get_parent().get_node("GraphicsSettings").visible or get_parent().get_node("HuntInputSettings").visible:
		return
	if visible:
		_resume()
	else:
		visible=true
		if active_mode=="hunt":
			get_parent().get_node("HuntPractice").pause_training()
		elif active_mode=="training":
			get_parent().get_node("Practice").pause_training()
	get_viewport().set_input_as_handled()
