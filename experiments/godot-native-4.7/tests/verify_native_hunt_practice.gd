extends SceneTree
## Real native Godot stage uses SFHuntCombat for offline, unrated Hunt v3.
## This intentionally does not switch legacy side/1 online, matchmaking or UI.
const Stage=preload("res://scenes/stage.tscn")
func _initialize() -> void:
	call_deferred("_verify")
func fail(message: String) -> void:
	push_error("NATIVE_HUNT_V3_PRACTICE_FAIL: "+message)
	quit(1)
func _verify() -> void:
	if not ClassDB.class_exists("SFHuntCombat"):
		fail("SFHuntCombat is missing from real Godot GDExtension")
		return
	var stage:=Stage.instantiate()
	root.add_child(stage)
	await process_frame
	if stage.begin_native_hunt_practice("unknown",0,1):
		fail("Unknown training dummy was accepted")
		return
	if stage.begin_native_hunt_practice("passive",0,2):
		fail("Invalid native trick weapon was accepted")
		return
	if not stage.begin_native_hunt_practice("passive",0,1):
		fail("Native Hunt v3 practice did not initialize")
		return
	var practice: Node=stage.get_node("HuntPractice")
	practice.set_physics_process(false)
	var hud: CanvasLayer=stage.get_node("CombatHud")
	if not practice.active or practice.last_state.get("rules","")!="sf-hunt-lab/3":
		fail("Local research combat uses legacy rules or is inactive")
		return
	if practice.last_state["p"][1]["weapon"]!="thornwake":
		fail("Second original weapon not present")
		return
	if stage.get_node("Practice").start_training("passive"):
		fail("Legacy training began simultaneously with Hunt simulation")
		return
	if stage.connect_private_1v1("127.0.0.1:31314","http://127.0.0.1:31315","", "reliquary"):
		fail("Network join was allowed during incompatible local Hunt rules")
		return
	if practice.step_manual([0,0,0,1],[0,0,0,0]) or practice.last_state["tick"]!=0:
		fail("Conventional block accepted by Hunt practice")
		return
	var commands: Array=[]
	for tick in range(240):
		var act:=0
		if tick==100:act=4 # Neutral Trick transforms, no copied animations.
		if tick==141:act=1 # Legal source light attack.
		if tick==178:act=11 # HP sacrifice => 5 temporary rounds.
		if tick==219:act=5 # Firearm spends a blood round before base ammo.
		var local: Array=[0,0,act,0]
		var remote: Array=[0,0,0,0]
		commands.append({"a":local.duplicate(),"b":remote.duplicate()})
		if not practice.step_manual(local,remote):
			fail("Real Hunt tick rejected at "+str(tick))
			return
	var source: Dictionary=practice.last_state.duplicate(true)
	if source["tick"]!=240 or source["p"][0]["hp"]>=100.0 or source["p"][0]["bloodAmmo"]<1:
		fail("Real native Hunt resources were not consumed")
		return
	if not str(hud.ammo[0].text).contains("BLOOD") or hud.last_tick!=240:
		fail("Hunt native HUD did not display original resources and verified tick")
		return
	var meter: Dictionary=practice.get_frame_meter(0)
	if meter.get("rules","")!="sf-hunt-lab/3" or not meter.has("startup") or not meter.has("active") or not meter.has("recovery"):
		fail("Native Hunt C++ frame data not available in training")
		return
	if practice.available_history_frames()!=120 or not practice.rewind_frames(60):
		fail("Native Hunt 120-frame bounded history or rewind failed")
		return
	if int(practice.last_state["tick"])!=180 or not practice.paused:
		fail("Native Hunt rewind did not restore exact tick 180")
		return
	for tick in range(180,240):
		if not practice.step_manual(commands[tick]["a"],commands[tick]["b"]):
			fail("Native Hunt source input replay rejected")
			return
	if practice.last_state!=source:
		fail("Native Hunt rewind/replay diverged from same actual fight")
		return
	if not practice.reset_training() or int(practice.last_state["tick"])!=0:
		fail("Native Hunt original weapon reset failed")
		return
	if practice.last_state["p"][1]["weapon"]!="thornwake":
		fail("Native Hunt reset changed approved original weapon")
		return
	stage.end_native_hunt_practice()
	if practice.active or not practice.last_state.is_empty():
		fail("Hunt native research session did not clear")
		return
	if not stage.begin_local_practice("passive"):
		fail("Legacy training failed after returning from isolated Hunt mode")
		return
	stage.end_local_practice()
	print("NATIVE_HUNT_V3_GODOT_PRACTICE=PASS real_60hz=240 rewind=60 fields=69 blood_bullets=1 online_untouched=true")
	quit(0)
