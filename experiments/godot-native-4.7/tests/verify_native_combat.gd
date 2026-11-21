extends SceneTree
## Real Godot 4.7 extension parity against a Node-generated JS golden trace.
const VECTORS := "res://tests/native_parity_vectors.json"
const MOVE_NAMES := ["", "cut", "hew", "shot", "step", "feint", "stun", "guardBreak"]
const FIELDS := ["x", "y", "vx", "vy", "dir", "hp", "st", "ammo", "act",
 "age", "spent", "crouch", "jumpHeld", "guardAge", "regen", "combo"]

func _initialize() -> void:
	call_deferred("_verify")

func _fail(message: String) -> void:
	push_error("NATIVE_COMBAT_GODOT_PARITY_FAIL: " + message)
	quit(1)

func _encode_fighter(p: Dictionary) -> Array:
	var result: Array = []
	for key in FIELDS:
		if key == "act":
			result.append(MOVE_NAMES.find(str(p[key])))
		elif p[key] is bool:
			result.append(1 if p[key] else 0)
		else:
			result.append(p[key])
	return result

func _encode(s: Dictionary) -> Array:
	var score: Array = s["score"]
	var result: Array = [s["tick"], s["clock"], s["ready"], s["end"],
	 s["round"], score[0], score[1], s["winner"] if s["winner"] != null else -2,
	 1 if s["over"] else 0]
	for player in s["p"]:
		result.append_array(_encode_fighter(player))
	return result

func _verify() -> void:
	if not ClassDB.class_exists("SFCombat"):
		_fail("Native GDExtension class SFCombat is missing")
		return
	var native: Object = ClassDB.instantiate("SFCombat")
	if native == null:
		_fail("Could not instantiate native C++ simulation")
		return
	if native.get_tick() != 0 or native.get_state().get("rules","") != "seamless-side/1":
		_fail("Native initialization or ruleset mismatch")
		return
	if native.step_encoded(0,0,6,0,0,0,0,0):
		_fail("Network input incorrectly accepted engine-only stun action")
		return
	if native.get_tick() != 0:
		_fail("Invalid input changed the combat state")
		return
	if not FileAccess.file_exists(VECTORS):
		_fail("Missing generated JS parity vectors")
		return
	var raw: Variant = JSON.parse_string(FileAccess.get_file_as_string(VECTORS))
	if not raw is Dictionary or raw.get("rules","") != "seamless-side/1":
		_fail("Invalid JavaScript reference trace")
		return
	var trace: Array = raw["ticks"]
	if trace.size() < 1200:
		_fail("Reference trace was truncated")
		return
	var fields_checked := 0
	for frame in trace:
		var input: Array = frame["i"]
		if not native.step_encoded(input[0],input[1],input[2],input[3],
		 input[4],input[5],input[6],input[7]):
			_fail("Legitimate input rejected")
			return
		var actual: Array = _encode(native.get_state())
		var expected: Array = frame["s"]
		if actual.size() != 41 or expected.size() != 41:
			_fail("Expected 41 combat fields")
			return
		for k in range(41):
			if actual[k] is float or expected[k] is float:
				if absf(float(actual[k])-float(expected[k])) > 0.00000001:
					_fail("Divergence tick " + str(native.get_tick()) + " field " + str(k) + " native " + str(actual[k]) + " expected " + str(expected[k]))
					return
			elif actual[k] != expected[k]:
				_fail("Mismatch tick " + str(native.get_tick()) + " field " + str(k))
				return
			fields_checked += 1
	native.reset()
	if native.get_tick() != 0 or native.get_state()["p"][0]["hp"] != 100.0:
		_fail("Reset did not restore initial simulation state")
		return
	print("NATIVE_GODOT_CPP_JS_60HZ_PARITY_PASSED ticks=",trace.size()," checkedFields=",fields_checked)
	quit(0)
