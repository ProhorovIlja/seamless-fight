extends SceneTree
## Actual Godot 4.7 sound resources, real site menu settings and event sequencing.
const Stage=preload("res://scenes/stage.tscn")
func _initialize() -> void:
	call_deferred("_verify")
func _fail(message: String) -> void:
	push_error("NATIVE_AUDIO_TEST_FAILED: "+message)
	quit(1)
func _verify() -> void:
	var stage: Variant=Stage.instantiate()
	root.add_child(stage)
	await process_frame
	var sound: Variant=stage.get_node("NativeAudio")
	var menu: Variant=stage.get_node("NativeMenu")
	if sound.channels.size()!=3:
		_fail("Three original Kenney CC0 audio streams did not load")
		return
	for kind in ["foot","light","heavy"]:
		if not sound.channels.has(kind) or sound.channels[kind].size()!=2:
			_fail("No bounded polyphony pool for "+kind)
			return
	if menu.panel.find_child("CombatVolume",true,false)==null or menu.panel.find_child("MuteCombat",true,false)==null:
		_fail("Native audio volume and mute controls missing from accessible menu")
		return
	var before: int=sound.volume
	if sound.set_volume(-1) or sound.set_volume(101) or sound.volume!=before:
		_fail("Native audio accepted invalid volume")
		return
	if not sound.set_volume(65) or not sound.set_muted(true):
		_fail("Cannot persist local volume and mute settings")
		return
	sound.reset_timeline()
	var events := [
	 {"tick":8,"kind":"hit","actor":0,"target":1},
	 {"tick":8,"kind":"block","actor":1,"target":0},
	 {"tick":9,"kind":"action","actor":0,"move":"step"},
	 {"tick":14,"kind":"hit","actor":1,"target":0}
	]
	if sound.accept_events(events,9)!=3:
		_fail("Valid authoritative foley was not consumed at server time")
		return
	if sound.accept_events(events,9)!=0:
		_fail("Repeated authoritative packet duplicated combat foley")
		return
	if sound.accept_events([{"tick":10,"kind":"hit"}],9)!=0:
		_fail("Future event escaped server confirmation")
		return
	var previous := {"p":[{"hp":100.0,"act":""},{"hp":100.0,"act":""}]}
	var current := {"rules":"seamless-side/1","tick":10,"p":[{"hp":100.0,"act":""},{"hp":76.0,"act":"stun"}]}
	if sound.accept_local_transition(previous,current)!=1:
		_fail("Native C++ local practice hit did not trigger foley")
		return
	if sound.accept_local_transition(previous,current)!=0:
		_fail("Native practice event replay double-played the cue")
		return
	sound.reset_timeline()
	if sound.accept_local_transition(previous,current)!=1:
		_fail("Seeking practice timeline did not reset audio deduplication")
		return
	sound.set_volume(before)
	sound.set_muted(false)
	print("NATIVE_GODOT_CC0_AUDIO_PASSED: actual Ogg streams, bounded channels, event ticks, local hits and persisted mixer controls")
	quit(0)
