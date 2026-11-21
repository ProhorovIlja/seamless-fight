extends SceneTree
## Uses the actual C++ 60Hz simulation and local tape only. Not learned AI.
const Stage=preload("res://scenes/stage.tscn")
func _initialize() -> void:
	call_deferred("_verify")
func _fail(message: String) -> void:
	push_error("NATIVE_DUMMY_RECORD_FAIL: "+message)
	quit(1)
func _verify() -> void:
	if not ClassDB.class_exists("SFCombat"):
		_fail("Missing compiled native C++ core")
		return
	var stage: Variant=Stage.instantiate()
	root.add_child(stage)
	await process_frame
	if not stage.begin_local_practice("passive"):
		_fail("Cannot open native local training")
		return
	var training: Variant=stage.get_node("Practice")
	training.set_physics_process(false)
	if training.play_dummy_recording():
		_fail("Replay started without a recorded input tape")
		return
	for tick in range(95):
		if not training._advance_state([0,0,0,0]):
			_fail("Native training could not pass countdown")
			return
	if not training.begin_dummy_recording():
		_fail("Recording refused active offline training")
		return
	for tick in range(40):
		if not training._advance_state([1,0,0,0]):
			_fail("Recording failed to advance C++ game")
			return
	if not training._advance_state([0,0,1,0]):
		_fail("Native attack encoding failed")
		return
	if training.finish_dummy_recording()!=41 or training.dummy_tape_frames()!=41:
		_fail("Dummy capture did not save exact canonical 60Hz command count")
		return
	if training.dummy_tape[0]!=[1,0,0,0] or training.dummy_tape[40]!=[0,0,1,0]:
		_fail("Dummy tape did not preserve raw player commands")
		return
	if not training.play_dummy_recording():
		_fail("Recorded dummy could not start replay")
		return
	var first: Array[int]=training._bot_input(training.last_state)
	if first!=[-1,0,0,0]:
		_fail("Dummy replay failed to mirror horizontal motion for the other spawn")
		return
	var previous_x: float=training.last_state["p"][1]["x"]
	for tick in range(20):
		if not training._advance_state([0,0,0,0]):
			_fail("Native dummy replay simulation failed")
			return
	if training.last_state["p"][1]["x"]>=previous_x:
		_fail("Recorded opponent did not move using captured input commands")
		return
	training.stop_dummy_replay()
	if training.dummy_replaying:
		_fail("Dummy replay could not be disabled")
		return
	stage.end_local_practice()
	if training.dummy_tape_frames()!=0 or training.dummy_recording or training.dummy_replaying:
		_fail("Private local recording was not discarded when leaving training")
		return
	print("NATIVE_CPP_LOCAL_DUMMY_RECORD_PASSED: 41 actual inputs, mirrored playback, bounded ephemeral tape, correct native movement and reset")
	quit(0)
