extends SceneTree
## True 4.7 GDExtension Hunt model compared against JS source states per tick.
const SOURCE := "res://tests/native_hunt_godot_vectors.json"
func _initialize() -> void:
	call_deferred("_verify")
func _fail(message: String) -> void:
	push_error("NATIVE_HUNT_GODOT_V3_FAIL: "+message)
	quit(1)
func _same(a: Variant,b: Variant) -> bool:
	if a is Dictionary:
		if not b is Dictionary or a.size()!=b.size(): return false
		for key in a.keys():
			if not b.has(key) or not _same(a[key],b[key]):return false
		return true
	if a is Array:
		if not b is Array or a.size()!=b.size():return false
		for k in range(a.size()):
			if not _same(a[k],b[k]):return false
		return true
	if (a is int or a is float) and (b is int or b is float):
		return absf(float(a)-float(b))<=0.00000001
	return typeof(a)==typeof(b) and a==b
# Diagnose the first exact field, not only the frame, so parity failures are repairable.
func _first_difference(expected: Variant, actual: Variant, path: String) -> String:
	if expected is Dictionary:
		if not actual is Dictionary:
			return path+" expected Dictionary; actual="+str(typeof(actual))
		if expected.size()!=actual.size():
			return path+" Dictionary size "+str(expected.size())+" vs "+str(actual.size())
		for key in expected.keys():
			if not actual.has(key): return path+" missing key "+str(key)
			var found: String=_first_difference(expected[key],actual[key],path+"."+str(key))
			if not found.is_empty(): return found
		return ""
	if expected is Array:
		if not actual is Array:
			return path+" expected Array; actual="+str(typeof(actual))
		if expected.size()!=actual.size():
			return path+" Array size "+str(expected.size())+" vs "+str(actual.size())
		for index in range(expected.size()):
			var found: String=_first_difference(expected[index],actual[index],path+"["+str(index)+"]")
			if not found.is_empty(): return found
		return ""
	if (expected is int or expected is float) and (actual is int or actual is float):
		if absf(float(expected)-float(actual))<=0.00000001:return ""
	elif typeof(expected)==typeof(actual) and expected==actual:
		return ""
	return path+" expected="+str(expected)+" actual="+str(actual)

func _step(game: Object, values: Array) -> bool:
	return game.step_encoded(values[0],values[1],values[2],values[3],
	 values[4],values[5],values[6],values[7])
func _verify() -> void:
	if not ClassDB.class_exists("SFCombat") or not ClassDB.class_exists("SFHuntCombat"):
		_fail("Legacy and new isolated source-native Godot classes missing")
		return
	var game: Object=ClassDB.instantiate("SFHuntCombat")
	if game==null or game.get_state().get("rules","")!="sf-hunt-lab/3":
		_fail("Wrong native Hunt v3 ruleset")
		return
	if game.step_encoded(0,0,0,1,0,0,0,0) or game.step_encoded(0,0,12,0,0,0,0,0):
		_fail("Guard or unsupported move accepted")
		return
	if game.get_tick()!=0 or not game.select_weapons(0,1) or game.select_weapons(0,2):
		_fail("Input validation or original weapon configuration failed")
		return
	if game.get_state()["p"][1]["weapon"]!="thornwake":
		_fail("Thornwake weapon missing")
		return
	if not FileAccess.file_exists(SOURCE):
		_fail("Missing generated JS source states")
		return
	var parsed: Variant=JSON.parse_string(FileAccess.get_file_as_string(SOURCE))
	if not parsed is Dictionary or parsed.get("rules","")!="sf-hunt-lab/3":
		_fail("Source vector ruleset mismatch")
		return
	var frames: Array=parsed["ticks"]
	if frames.size()!=900 or not _same(parsed["weaponPair"],[0,1]):
		_fail("Source trace truncated or weapon pair mismatch")
		return
	var checkpoint_tick: int=-1
	var checked:=0
	var final_state: Dictionary={}
	for index in range(frames.size()):
		var row: Dictionary=frames[index]
		if not _step(game,row["i"]):
			_fail("Legitimate Hunt input rejected at "+str(index))
			return
		var actual: Dictionary=game.get_state()
		if not _same(actual,row["s"]):
			_fail("JS source/native GDExtension mismatch at frame "+str(index)+\
				" "+_first_difference(row["s"],actual,"state"))
			return
		if actual["p"].size()!=2 or actual["p"][0].size()!=30:
			_fail("Expected two full Hunt fighters with 30 fields each")
			return
		if game.get_tick()==500:checkpoint_tick=game.save_local_checkpoint()
		final_state=actual
		checked+=69
	if checkpoint_tick!=500 or game.get_local_checkpoint_count()!=1:
		_fail("Native 500-tick C++ value-state checkpoint unavailable")
		return
	if game.restore_local_checkpoint(501) or not game.restore_local_checkpoint(500):
		_fail("Checkpoint restore validation failure")
		return
	for index in range(500,frames.size()):
		if not _step(game,frames[index]["i"]):
			_fail("Source replay rejected after local rollback")
			return
	if not _same(game.get_state(),final_state):
		_fail("Native Hunt state differed after rollback and resimulation")
		return
	var encoded: PackedByteArray=game.save_checkpoint()
	if encoded.size()!=348:
		_fail("Canonical Hunt v3 encoded checkpoint must be 348 bytes")
		return
	var modified: PackedByteArray=encoded.duplicate()
	modified[45]=modified[45]^1
	if game.load_checkpoint(modified) or game.get_tick()!=900:
		_fail("Corrupt Hunt v3 snapshot changed active state")
		return
	if not game.load_checkpoint(encoded) or game.get_tick()!=900:
		_fail("Valid portable native Hunt v3 snapshot was rejected")
		return
	if game.get_local_checkpoint_count()!=0:
		_fail("Canonical restore retained discarded speculative checkpoints")
		return
	game.reset()
	if game.get_tick()!=0 or game.get_state()["p"][1]["weapon"]!="thornwake":
		_fail("Reset lost original weapon selection")
		return
	print("NATIVE_HUNT_GODOT_V3_PARITY=PASS ticks=",frames.size(),
	 " checkedSourceFields=",checked," checkpoint=500")
	quit(0)
