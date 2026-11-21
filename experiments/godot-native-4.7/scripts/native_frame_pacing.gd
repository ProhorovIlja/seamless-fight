extends CanvasLayer
## Local render-frame pacing instrumentation, NOT input-to-photon or one-way WAN.
## F3 toggles diagnostics; hidden mode costs no per-frame sampling or sorting.
const FONT=preload("res://assets/fonts/EBGaramond.ttf")
const MAX_SAMPLES := 240
const SAFE_MIN := 0.001
const SAFE_MAX := 0.250
var samples: Array[float]=[]
var sample_count := 0
var display: Label

func _ready() -> void:
	layer=18
	var panel := PanelContainer.new()
	panel.name="FramePacing"
	panel.anchor_left=1.0
	panel.anchor_right=1.0
	panel.anchor_top=0.0
	panel.offset_left=-325
	panel.offset_right=-16
	panel.offset_top=128
	panel.offset_bottom=248
	var box := StyleBoxFlat.new()
	box.bg_color=Color(0.035,0.045,0.055,0.88)
	box.border_color=Color("#75603e")
	box.set_border_width_all(1)
	box.set_content_margin_all(14)
	panel.add_theme_stylebox_override("panel",box)
	add_child(panel)
	display=Label.new()
	display.name="FrameValues"
	display.add_theme_font_override("font",FONT)
	display.add_theme_font_size_override("font_size",17)
	display.add_theme_color_override("font_color",Color("#eed9af"))
	display.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	display.text="FRAME PACING   F3\nMonitoring local rendered frames\nNot a latency meter."
	panel.add_child(display)
	set_active(false)

func set_active(enabled: bool) -> void:
	visible=enabled
	set_process(enabled)
	if enabled:
		samples.clear()
		sample_count=0

func _unhandled_key_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo and event.keycode==KEY_F3:
		set_active(not visible)
		get_viewport().set_input_as_handled()

func record_frame(delta_seconds: float) -> bool:
	if not is_finite(delta_seconds) or delta_seconds<SAFE_MIN or delta_seconds>SAFE_MAX:
		return false
	samples.append(delta_seconds*1000.0)
	if samples.size()>MAX_SAMPLES:
		samples.pop_front()
	sample_count+=1
	return true

func metrics() -> Dictionary:
	if samples.is_empty():
		return {"samples":0,"p95_ms":0.0,"p99_ms":0.0,"above_60hz":0}
	var ordered: Array=samples.duplicate()
	ordered.sort()
	var p95: int=clampi(ceili(float(ordered.size())*.95)-1,0,ordered.size()-1)
	var p99: int=clampi(ceili(float(ordered.size())*.99)-1,0,ordered.size()-1)
	var hitches := 0
	for ms in samples:
		if ms>16.666667:
			hitches+=1
	return {"samples":ordered.size(),"p95_ms":ordered[p95],"p99_ms":ordered[p99],"above_60hz":hitches}

func _process(delta: float) -> void:
	if not record_frame(delta):
		return
	# Defer sorting/label changes until 15 actual frames have arrived.
	if sample_count%15!=0:
		return
	var result: Dictionary=metrics()
	display.text=("FRAME PACING   F3\nEngine FPS: %d\n"
		+"p95: %.2f ms     p99: %.2f ms\n"
		+"Frames >16.7 ms: %d/%d\n"
		+"Not measured input-to-photon latency.") % [
		Engine.get_frames_per_second(),result["p95_ms"],result["p99_ms"],
		result["above_60hz"],result["samples"]]
