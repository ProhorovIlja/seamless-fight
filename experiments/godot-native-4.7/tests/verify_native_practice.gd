extends SceneTree
## Requires compiled SFCombat GDExtension; CI runs after 1350-frame JS parity.
const Stage = preload("res://scenes/stage.tscn")
func _initialize() -> void:
	call_deferred("_verify")
func _fail(message: String) -> void:
	push_error("NATIVE_CPP_TRAINING_FAIL: "+message)
	quit(1)
func _verify() -> void:
	if not ClassDB.class_exists("SFCombat"):
		_fail("Unloaded C++ game simulation")
		return
	var stage := Stage.instantiate()
	root.add_child(stage)
	await process_frame
	if stage.begin_local_practice("unauthorized"):
		_fail("Unknown AI profile accepted")
		return
	if not stage.begin_local_practice("passive"):
		_fail("Could not start local C++ simulation")
		return
	var practice: Node=stage.get_node("Practice")
	practice.set_physics_process(false)
	for n in range(240):
		practice._physics_process(1.0/60.0)
	var passive: Dictionary=practice.last_state
	if passive["tick"]<240 or passive["p"][0]["hp"]!=100.0 or passive["p"][1]["x"]!=705.0:
		_fail("Passive 60Hz training altered health or enemy spacing")
		return
	if not stage.reset_local_practice() or practice.last_state["tick"]!=0:
		_fail("Native training reset did not restore the exact round start")
		return
	stage.end_local_practice()
	if not stage.begin_local_practice("hard"):
		_fail("Cannot start scripted hard training profile")
		return
	practice.set_physics_process(false)
	var nearest_x := 705.0
	for n in range(580):
		practice._physics_process(1.0/60.0)
		nearest_x=minf(nearest_x,float(practice.last_state["p"][1]["x"]))
	var hard: Dictionary=practice.last_state
	# Do not assert the FINAL x: the bot can win a round and be reset to its
	# original spawn before tick 580. Assert that it really approached at least once.
	if hard["tick"]<580 or nearest_x>=690.0:
		_fail("Hard bot never approached the hunter during 580 native frames; min x="+str(nearest_x))
		return
	if hard["p"][0]["hp"]>100.0 or hard["p"][1]["hp"]>100.0:
		_fail("Native game health exceeded bounded starting values")
		return
	if not practice.pause_training() or practice.available_history_frames()<120:
		_fail("Native training history or pause missing")
		return
	if not stage.rewind_local_practice(120):
		_fail("Could not load an actual 120-tick native checkpoint")
		return
	if practice.last_state["tick"]!=460 or not practice.paused:
		_fail("Rewind did not seek to the correct historical frame and pause")
		return
	if not stage.advance_local_practice() or practice.last_state["tick"]!=461:
		_fail("Single-frame advance failed or skipped a tick")
		return
	if not practice.resume_training():
		_fail("Native trainer cannot resume from a historical checkpoint")
		return
	for n in range(119):
		practice._physics_process(1.0/60.0)
	if practice.last_state!=hard:
		_fail("Replayed native training timeline diverged from deterministic original")
		return
	if not stage.reset_local_practice():
		_fail("Cannot restart training from exact native reset")
		return
	practice.set_physics_process(false)
	for n in range(580):
		practice._physics_process(1.0/60.0)
	if practice.last_state != hard:
		_fail("Identical bot/input trace did not reproduce identical native state")
		return
	stage.end_local_practice()
	if practice.active or not practice.last_state.is_empty():
		_fail("End training did not clear native state")
		return
	print("NATIVE_WINDOWS_PC_CPP_TRAINING=PASS: 60Hz practice, passive/hard bot, exact reset, deterministic re-run")
	quit(0)
