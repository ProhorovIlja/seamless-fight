extends RefCounted
## JSON number decoder for the Godot native side-view network boundary.
## JSON.parse_string may deserialize integer-looking numbers as floats.
## Accept only exact, finite, bounded integers without truncating fractions.
static func checked_nonnegative(value: Variant, ceiling: int=100000000) -> int:
	if typeof(value) not in [TYPE_INT,TYPE_FLOAT]:
		return -1
	var number: float=float(value)
	if not is_finite(number) or number<0.0 or number>float(ceiling):
		return -1
	if number!=floor(number):
		return -1
	return int(number)

static func checked_direction(value: Variant) -> int:
	if typeof(value) not in [TYPE_INT,TYPE_FLOAT]:
		return 0
	var number: float=float(value)
	if not is_finite(number):
		return 0
	if number==1.0:
		return 1
	if number==-1.0:
		return -1
	return 0
