extends SceneTree

func _initialize() -> void:
	call_deferred("_verify")

func _check(condition: bool, reason: String) -> void:
	if not condition:
		push_error(reason)
		quit(1)

func _verify() -> void:
	var packed := load("res://scenes/stage.tscn")
	_check(packed is PackedScene, "Godot stage must parse as a PackedScene")
	if not packed is PackedScene:
		return
	var stage: Node3D = packed.instantiate()
	root.add_child(stage)
	await process_frame
	var camera := stage.get_node("CombatCamera") as Camera3D
	_check(camera.projection == Camera3D.PROJECTION_ORTHOGONAL, "Camera must be orthographic")
	_check(absf(camera.size - 9.0) < 0.001, "World must fit the 16:9 2.5D camera")
	var a: Vector3 = stage.world_position(255.0, 436.0)
	var b: Vector3 = stage.world_position(705.0, 436.0)
	_check(absf(a.x + 3.75) < 0.001 and absf(b.x - 3.75) < 0.001,
		"Horizontal world projection differs from browser/server fighter positions")
	_check(absf(a.y - b.y) < 0.00001 and a.z == 0.0, "No Z combat movement")
	_check(stage.get_node("OriginalPaintedReliquary") is MeshInstance3D,
		"Original cathedral must actually load into the 3D stage")
	var initial := {"rules":"seamless-side/1","tick":20,
		"p":[{"x":255.0,"y":436.0,"dir":1},
			{"x":705.0,"y":436.0,"dir":-1}]}
	_check(stage.apply_authoritative_state(initial), "Valid authoritative snapshot rejected")
	_check(not stage.apply_authoritative_state(initial), "Duplicate server tick replayed")
	var malformed := {"rules":"seamless-side/1","tick":21,
		"p":[{"x":-12.0,"y":436.0,"dir":1},{"x":705.0,"y":436.0,"dir":-1}]}
	_check(not stage.apply_authoritative_state(malformed), "Bad network position accepted")
	_check(stage.last_confirmed_tick == 20, "Invalid packet mutated visual tick")
	var next := {"rules":"seamless-side/1","tick":21,
		"p":[{"x":255.0,"y":320.0,"dir":1},{"x":690.0,"y":436.0,"dir":-1}]}
	_check(stage.apply_authoritative_state(next), "Next confirmed server tick rejected")
	_check(stage.get_node("Veil").position.y > a.y,
		"Jump was not represented as upward stage movement")
	_check(stage.get_node("Cinder").position.z == 0.0, "Character left the combat plane")
	print("GODOT_472_VISUAL_SPIKE_OK: camera, painting, world sync, old packets, Z lock")
	quit(0)
