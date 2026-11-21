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
	for n in range(580):
		practice._physics_process(1.0/60.0)
	var hard: Dictionary=practice.last_state
	if hard["tick"]<580 or hard["p"][1]["x"] >=705.0:
		_fail("Hard mode never walked toward the hunter")
		return
	if hard["p"][0]["hp"]>100.0 or hard["p"][1]["hp"]>100.0:
		_fail("Native game health exceeded bounded starting values")
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
