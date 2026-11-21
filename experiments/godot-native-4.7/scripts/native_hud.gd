extends CanvasLayer
const BRAND_FONT=preload("res://assets/fonts/EBGaramond.ttf")
const WireNumbers=preload("res://scripts/native_wire_numbers.gd")
## Display-only combat HUD in the website's charcoal/bone/old-gold language.
## Only consumes validated, complete 60Hz local or server-authoritative states.
## Never feeds gameplay decisions or changes the input tick.
const GOLD := Color("#d7b478")
const BONE := Color("#f0e3c6")
const DIM := Color("#a9a095")
const PANEL := Color(0.045,0.048,0.064,0.94)
const FRAME := Color("#67543d")
const HIT := Color("#b23941")
const STAMINA := Color("#a6b28e")
const DATA := {"cut":[9,5,15],"hew":[21,7,24],"shot":[9,1,25],
	"step":[0,9,12],"feint":[0,0,14]}
var health: Array[ProgressBar] = []
var stamina: Array[ProgressBar] = []
var ammo: Array[Label] = []
var names: Array[Label] = []
var center_status: Label
var clock_label: Label
var phase_label: Label
var move_label: Label
var server_latency: Label
var last_tick := -1
var mode := "TRAINING"
var frame_data_enabled := false

func _ready() -> void:
	layer=11
	_build()
	visible=false

func _surface() -> StyleBoxFlat:
	var box := StyleBoxFlat.new()
	box.bg_color=PANEL
	box.border_color=FRAME
	box.set_border_width_all(1)
	box.set_content_margin_all(10)
	return box

func _fill(color: Color) -> StyleBoxFlat:
	var box := StyleBoxFlat.new()
	box.bg_color=color
	box.set_corner_radius_all(1)
	return box

func _text(value: String, points: int, tint: Color=BONE) -> Label:
	var label := Label.new()
	label.text=value
	label.add_theme_color_override("font_color",tint)
	label.add_theme_font_size_override("font_size",points)
	label.add_theme_font_override("font",BRAND_FONT)
	return label

func _bar(kind: String,side: int) -> ProgressBar:
	var bar := ProgressBar.new()
	bar.name=kind+str(side)
	bar.max_value=100.0
	bar.value=100.0
	bar.show_percentage=false
	bar.custom_minimum_size=Vector2(210,18 if kind=="Health" else 8)
	bar.size_flags_horizontal=Control.SIZE_EXPAND_FILL
	bar.add_theme_stylebox_override("background",_fill(Color("#2b2a2b")))
	bar.add_theme_stylebox_override("fill",_fill(HIT if kind=="Health" else STAMINA))
	return bar

func _fighter_panel(side: int) -> Control:
	var frame := PanelContainer.new()
	frame.name="HunterPanel"+str(side)
	frame.add_theme_stylebox_override("panel",_surface())
	frame.custom_minimum_size=Vector2(270,104)
	var stack := VBoxContainer.new()
	stack.add_theme_constant_override("separation",5)
	frame.add_child(stack)
	var title := _text("VEIL" if side==0 else "CINDER",20,GOLD)
	title.name="Hunter"+str(side)
	stack.add_child(title)
	names.append(title)
	var hp := _bar("Health",side)
	stack.add_child(hp)
	health.append(hp)
	var sp := _bar("Stamina",side)
	stack.add_child(sp)
	stamina.append(sp)
	var bullets := _text("AMMO 03     ·     0 ROUNDS",12,DIM)
	bullets.name="Ammo"+str(side)
	stack.add_child(bullets)
	ammo.append(bullets)
	return frame

func _build() -> void:
	var root_panel := MarginContainer.new()
	root_panel.name="HudRoot"
	root_panel.set_anchors_and_offsets_preset(Control.PRESET_TOP_WIDE)
	root_panel.add_theme_constant_override("margin_left",20)
	root_panel.add_theme_constant_override("margin_right",20)
	root_panel.add_theme_constant_override("margin_top",14)
	add_child(root_panel)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation",8)
	root_panel.add_child(column)
	var fighters := HBoxContainer.new()
	fighters.add_theme_constant_override("separation",10)
	column.add_child(fighters)
	fighters.add_child(_fighter_panel(0))
	var gap_left := Control.new()
	gap_left.size_flags_horizontal=Control.SIZE_EXPAND_FILL
	fighters.add_child(gap_left)
	var mid_panel := PanelContainer.new()
	mid_panel.add_theme_stylebox_override("panel",_surface())
	mid_panel.custom_minimum_size=Vector2(200,104)
	mid_panel.size_flags_horizontal=Control.SIZE_SHRINK_CENTER
	fighters.add_child(mid_panel)
	var mid := VBoxContainer.new()
	mid.alignment=BoxContainer.ALIGNMENT_CENTER
	mid_panel.add_child(mid)
	center_status=_text(mode,15,GOLD)
	center_status.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER
	mid.add_child(center_status)
	clock_label=_text("65",32,BONE)
	clock_label.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER
	mid.add_child(clock_label)
	phase_label=_text("ROUND 1",12,DIM)
	phase_label.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER
	mid.add_child(phase_label)
	var gap_right := Control.new()
	gap_right.size_flags_horizontal=Control.SIZE_EXPAND_FILL
	fighters.add_child(gap_right)
	fighters.add_child(_fighter_panel(1))
	move_label=_text("",13,DIM)
	move_label.name="PracticeFrameData"
	column.add_child(move_label)
	server_latency=_text("SERVER RTT: MEASURING…",12,DIM)
	server_latency.name="ServerLatency"
	server_latency.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER
	server_latency.visible=false
	column.add_child(server_latency)

func reset_mode(next_mode: String,frame_data: bool=false) -> void:
	if next_mode not in ["TRAINING","PRIVATE 1V1"]:
		return
	mode=next_mode
	last_tick=-1
	frame_data_enabled=frame_data and mode=="TRAINING"
	center_status.text=mode
	move_label.visible=frame_data_enabled
	server_latency.visible=mode=="PRIVATE 1V1"
	server_latency.text="SERVER RTT: MEASURING…"
	visible=true

func clear() -> void:
	visible=false
	frame_data_enabled=false
	server_latency.visible=false
	last_tick=-1

func show_server_latency(rtt_ms: int, variation_ms: int) -> void:
	if mode!="PRIVATE 1V1" or rtt_ms<0 or rtt_ms>4000 or variation_ms<0 or variation_ms>4000:
		return
	server_latency.text="SERVER RTT: %d ms   ·   VARIATION: %d ms" % [rtt_ms,variation_ms]

func frame_inspector_text(fighter: Dictionary) -> String:
	var action := str(fighter.get("act",""))
	if action not in DATA:
		return ""
	var frames: Array=DATA[action]
	var age := maxi(0,int(fighter.get("age",0)))
	var startup: int=frames[0]
	var active: int=frames[1]
	var recovery: int=frames[2]
	var phase := "STARTUP" if age<startup else "ACTIVE" if age<startup+active else "RECOVERY"
	return action.to_upper()+"  "+phase+"  "+str(age)+"f  |  Startup "+str(startup)+" / Active "+str(active)+" / Recovery "+str(recovery)

func apply_snapshot(snapshot: Dictionary) -> bool:
	if snapshot.get("rules","")!="seamless-side/1" or not snapshot.get("p") is Array:
		return false
	var players: Array=snapshot["p"]
	var tick: int=WireNumbers.checked_nonnegative(snapshot.get("tick",-1),100000000)
	if tick<0 or tick<=last_tick or players.size()!=2:
		return false
	for side in range(2):
		if not players[side] is Dictionary:
			return false
		for field in ["hp","st","ammo"]:
			if not players[side].has(field) or not is_finite(float(players[side][field])):
				return false
		var hp := float(players[side]["hp"])
		var sp := float(players[side]["st"])
		var a := int(players[side]["ammo"])
		if hp<0.0 or hp>100.0 or sp<0.0 or sp>100.0 or a<0 or a>3:
			return false
	var score: Variant=snapshot.get("score",[])
	if not score is Array or score.size()!=2:
		return false
	for side in range(2):
		health[side].value=float(players[side]["hp"])
		stamina[side].value=float(players[side]["st"])
		ammo[side].text="AMMO %02d     ·     %d ROUNDS" % [int(players[side]["ammo"]),int(score[side])]
	var clock: int=maxi(0,int(snapshot.get("clock",0)))
	clock_label.text=str(ceili(float(clock)/60.0))
	phase_label.text="ROUND "+str(int(snapshot.get("round",1)))
	if int(snapshot.get("ready",0))>0:
		phase_label.text="READY"
	elif int(snapshot.get("end",0))>0:
		phase_label.text="ROUND END"
	elif snapshot.get("over",false):
		phase_label.text="MATCH END"
	if frame_data_enabled:
		move_label.text=frame_inspector_text(players[0])
	last_tick=int(tick)
	return true
