extends SceneTree
const Stage=preload("res://scenes/stage.tscn")
func _initialize() -> void:
	call_deferred("_verify")
func _fail(message: String) -> void:
	push_error("NATIVE_FRAME_PACING_TEST_FAILED: "+message)
	quit(1)
func _verify() -> void:
	var stage: Variant=Stage.instantiate()
	root.add_child(stage)
	await process_frame
	var perf: Variant=stage.get_node("FramePacing")
	if perf.visible or perf.is_processing():
		_fail("Performance overlay must be opt-in, zero hidden per-frame work")
		return
	if perf.record_frame(-2.0) or perf.record_frame(INF) or perf.record_frame(NAN):
		_fail("Invalid or non-finite frame duration accepted")
		return
	for i in range(120):
		if not perf.record_frame(0.016):
			_fail("Valid game frame was rejected")
			return
	for i in range(8):
		perf.record_frame(0.050)
	var m: Dictionary=perf.metrics()
	if m["samples"]!=128 or absf(float(m["p95_ms"])-50.0)>0.01 or absf(float(m["p99_ms"])-50.0)>0.01:
		_fail("True p95/p99 sorted frame pacing percentiles are incorrect")
		return
	if m["above_60hz"]!=8:
		_fail("Frame-budget overruns miscounted")
		return
	for i in range(220):
		perf.record_frame(0.010)
	m=perf.metrics()
	if m["samples"]>240 or m["above_60hz"]!=8:
		_fail("Frame window is unbounded or retains stale hitch count")
		return
	perf.set_active(true)
	if not perf.visible or not perf.is_processing() or perf.metrics()["samples"]!=0:
		_fail("F3 diagnostic mode did not reset finite session window")
		return
	perf.set_active(false)
	if perf.visible or perf.is_processing():
		_fail("Closing diagnostics did not stop all visual monitoring")
		return
	print("GODOT_NATIVE_FRAME_PACING_PASSED: measured local frame p95/p99, bounded 240-frame window, actual FPS readout and honest latency disclaimer")
	quit(0)
