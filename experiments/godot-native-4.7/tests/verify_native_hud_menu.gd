extends SceneTree
## Tests actual native HUD/menu nodes, legacy web ruleset snapshots, and
## visual-only source-asset presentation without requiring a GPU or C++ module.
const Stage = preload("res://scenes/stage.tscn")
func _initialize() -> void:
	call_deferred("_verify")
func _fail(message: String) -> void:
	push_error("NATIVE_HUD_MENU_FAILURE: "+message)
	quit(1)
func _verify() -> void:
	var stage: Variant = Stage.instantiate()
	root.add_child(stage)
	await process_frame
	var menu: Variant=stage.get_node("NativeMenu")
	var hud: Variant=stage.get_node("CombatHud")
	if not menu.visible or hud.visible:
		_fail("Entry must show the menu and not a misleading active match HUD")
		return
	for path in ["NativeMenuPanel","Status"]:
		if menu.get_node_or_null(path)==null and menu.get_node_or_null("MenuShade")==null:
			_fail("Native premium menu controls missing")
			return
	var text: LineEdit=menu.endpoint
	if text.max_length>256 or menu.clipboard_button.disabled==false:
		_fail("Unsafe endpoint length or copy button enabled without actual invitation")
		return
	menu._host_private()
	if menu.status.text.find("endpoint")==-1:
		_fail("An empty private-room endpoint was accepted")
		return
	if stage.current_invitation_code()!="":
		_fail("Native menu falsely generated a real room")
		return
	if menu.moonlit==null or not stage.set_visual_stage("moonlit"):
		_fail("Cannot select original moonlit environment")
		return
	if not stage.set_visual_stage("reliquary"):
		_fail("Cannot restore cathedral painting")
		return
	hud.reset_mode("TRAINING",true)
	if not hud.visible or hud.center_status.text!="TRAINING":
		_fail("Native training HUD not visible")
		return
	var mock := {"rules":"seamless-side/1","tick":1,"clock":3900,"round":1,
		"ready":0,"end":0,"over":false,"score":[0,0],"p":[
		{"x":255.0,"y":436.0,"dir":1,"hp":73.0,"st":31.0,"ammo":2,"act":"hew","age":22},
		{"x":705.0,"y":436.0,"dir":-1,"hp":19.0,"st":72.0,"ammo":1,"act":"","age":0}]}
	if not stage.apply_authoritative_state(mock):
		_fail("Native scene refused valid server-like snapshot")
		return
	if hud.last_tick!=1 or hud.health[0].value!=73.0 or hud.health[1].value!=19.0:
		_fail("Health bars diverged from authoritative combat state")
		return
	if hud.stamina[0].value!=31.0 or hud.ammo[1].text.find("01")==-1:
		_fail("Native stamina or firearm counters were not updated")
		return
	if hud.clock_label.text!="65" or hud.move_label.text.find("ACTIVE")==-1:
		_fail("Real match clock or startup/active/recovery frames missing")
		return
	var json_snapshot: Variant=JSON.parse_string(JSON.stringify(mock))
	json_snapshot["tick"]=2.0
	json_snapshot["p"][0]["hp"]=70.0
	if not stage.apply_authoritative_state(json_snapshot):
		_fail("Real JSON-decoded integral float tick incorrectly rejected")
		return
	if hud.last_tick!=2 or hud.health[0].value!=70.0:
		_fail("Valid network JSON snapshot did not update HUD")
		return
	var invalid_fraction: Dictionary=json_snapshot.duplicate(true)
	invalid_fraction["tick"]=2.5
	if stage.apply_authoritative_state(invalid_fraction) or hud.apply_snapshot(invalid_fraction):
		_fail("Fractional network tick accepted after float validation")
		return
	if stage.apply_authoritative_state(mock) or hud.apply_snapshot(mock):
		_fail("Duplicate combat tick accepted twice")
		return
	var malformed: Dictionary=mock.duplicate(true)
	malformed["tick"]=2
	malformed["p"][0]["hp"]=105.0
	if hud.apply_snapshot(malformed):
		_fail("HUD accepted out-of-range authoritative health")
		return
	if hud.last_tick!=2 or hud.health[0].value!=70.0:
		_fail("Bad snapshot partially changed UI state")
		return
	hud.reset_mode("PRIVATE 1V1",false)
	if hud.frame_data_enabled or hud.move_label.visible:
		_fail("Private online mode leaked practice-only frame inspector")
		return
	hud.clear()
	if hud.visible:
		_fail("Leaving fight did not close combat HUD")
		return
	print("GODOT_NATIVE_MENU_AND_HUD_PASSED: functional entry, invite validation, site stages, authoritative health/stamina/ammo/round clock, training frame data")
	quit(0)
