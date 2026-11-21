extends Node
## Real native launcher activity fetch. The endpoint is *not yet deployed*.
## No made-up users, friends, rank or Hunts v3 online protocol.
signal activity_changed(snapshot: Dictionary)
const ENDPOINT := "https://seamlesshunt.com/fight/status.json"
const SCHEMA := "sf-public-activity/1"
const MAX_BODY := 12288
const MAX_CLIENTS := 100000
var request_node: HTTPRequest
var pending := false
var available := false
var latest: Dictionary={}
var last_failure := "Status unavailable"

func _ready() -> void:
	request_node=HTTPRequest.new()
	request_node.timeout=6.0
	request_node.use_threads=true
	add_child(request_node)
	request_node.request_completed.connect(_request_completed)

func _safe_count(value: Variant) -> int:
	if typeof(value) not in [TYPE_INT,TYPE_FLOAT]:
		return -1
	var number: float=float(value)
	if not is_finite(number) or number<0 or number>float(MAX_CLIENTS) or floor(number)!=number:
		return -1
	return int(number)

func validate_activity(value: Variant) -> bool:
	if not value is Dictionary:
		return false
	if value.get("schema","")!=SCHEMA or value.get("language","")!="en" or value.get("gameMode","")!="1v1":
		return false
	if value.get("service","")!="legacy-duel-preview" or value.get("uniqueAuthenticatedPlayers",1)!=null:
		return false
	var ranked: Variant=value.get("ranked")
	var friends: Variant=value.get("friends")
	if not ranked is Dictionary or ranked.get("available",true)!=false or not friends is Dictionary or friends.get("available",true)!=false:
		return false
	for key in ["connectedClients","duels","spectators","publicGalleryCount"]:
		if _safe_count(value.get(key,-1))<0:
			return false
	return true

func accept_activity(value: Variant) -> bool:
	if not validate_activity(value):
		return false
	var snapshot: Dictionary=value
	latest={
		"connectedClients":_safe_count(snapshot["connectedClients"]),
		"duels":_safe_count(snapshot["duels"]),
		"spectators":_safe_count(snapshot["spectators"]),
		"publicGalleryCount":_safe_count(snapshot["publicGalleryCount"]),
		"schema":SCHEMA,"language":"en","gameMode":"1v1"
	}
	available=true
	last_failure=""
	activity_changed.emit(latest.duplicate(true))
	return true

func refresh() -> bool:
	if pending or request_node==null:
		return false
	# HTTPS only, no externally supplied redirect URL, no credentials.
	var result: Error=request_node.request(ENDPOINT,["Accept: application/json"],HTTPClient.METHOD_GET)
	if result!=OK:
		available=false
		last_failure="Court status currently unavailable"
		activity_changed.emit({})
		return false
	pending=true
	return true

func _request_completed(result: int,response_code: int,_headers: PackedStringArray,body: PackedByteArray) -> void:
	pending=false
	if result!=HTTPRequest.RESULT_SUCCESS or response_code!=200 or body.size()>MAX_BODY:
		available=false
		last_failure="Court status currently unavailable"
		activity_changed.emit({})
		return
	var payload: Variant=JSON.parse_string(body.get_string_from_utf8())
	if not accept_activity(payload):
		available=false
		last_failure="Court activity response failed validation"
		activity_changed.emit({})

func display_text() -> String:
	if not available:
		return "Live connections: unavailable · Friends / Ranked: not connected"
	return "LIVE · %d connections · %d duels · %d spectators · %d public galleries" % [
		int(latest["connectedClients"]),int(latest["duels"]),
		int(latest["spectators"]),int(latest["publicGalleryCount"])]
