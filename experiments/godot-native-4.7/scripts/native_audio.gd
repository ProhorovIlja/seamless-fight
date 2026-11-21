extends Node
## Deterministic-event-indexed, presentation-only native foley.
## Uses the same three provenanced Kenney CC0 Ogg files as the browser game.
## No borrowed music, voice performances or invented premium recordings.
const PROFILE := "user://sf_native_sound_v1.json"
const FILE_LIMIT := 1024
const SOURCES := {
	"foot":"res://assets/audio/footstep_concrete_000.ogg",
	"light":"res://assets/audio/impactMetal_light_000.ogg",
	"heavy":"res://assets/audio/impactMetal_heavy_000.ogg"
}
const POLYPHONY := 2
const MAX_EVENTS := 32
var channels: Dictionary={}
var cursor: Dictionary={}
var volume := 80
var muted := false
var last_event_tick := -1
var last_local_tick := -1

func _ready() -> void:
	for kind in SOURCES.keys():
		var stream := load(SOURCES[kind]) as AudioStream
		if stream==null:
			push_error("Original CC0 foley missing: "+SOURCES[kind])
			continue
		var pool: Array[AudioStreamPlayer]=[]
		for slot in range(POLYPHONY):
			var player := AudioStreamPlayer.new()
			player.name=str(kind)+"_"+str(slot)
			player.stream=stream
			player.bus="Master"
			add_child(player)
			pool.append(player)
		channels[kind]=pool
		cursor[kind]=0
	_restore()
	_refresh_gains()

func _refresh_gains() -> void:
	var linear := 0.0 if muted else float(volume)/100.0
	var db := -80.0 if linear<=0.0 else linear_to_db(linear)
	for pool in channels.values():
		for player in pool:
			player.volume_db=db
			if muted:
				player.stop()

func _restore() -> void:
	if not FileAccess.file_exists(PROFILE):
		return
	var file := FileAccess.open(PROFILE,FileAccess.READ)
	if file==null or file.get_length()>FILE_LIMIT:
		return
	var obj: Variant=JSON.parse_string(file.get_as_text())
	if not obj is Dictionary or obj.get("version")!=1:
		return
	if typeof(obj.get("volume"))!=TYPE_INT or typeof(obj.get("muted"))!=TYPE_BOOL:
		return
	var level: int=int(obj["volume"])
	if level<0 or level>100:
		return
	volume=level
	muted=obj["muted"]

func _save() -> bool:
	var file := FileAccess.open(PROFILE,FileAccess.WRITE)
	if file==null:
		return false
	file.store_string(JSON.stringify({"version":1,"volume":volume,"muted":muted}))
	file.close()
	return true

func set_volume(level: int) -> bool:
	if level<0 or level>100:
		return false
	volume=level
	_refresh_gains()
	return _save()

func set_muted(yes: bool) -> bool:
	muted=yes
	_refresh_gains()
	return _save()

func reset_timeline() -> void:
	last_event_tick=-1
	last_local_tick=-1
	for pool in channels.values():
		for player in pool:
			player.stop()

func _play(kind: String) -> void:
	if muted or volume==0 or not channels.has(kind):
		return
	var pool: Array=channels[kind]
	var n: int=cursor[kind]
	var player: AudioStreamPlayer=pool[n]
	cursor[kind]=(n+1)%pool.size()
	player.stop()
	player.play()

func accept_events(events: Array, confirmed_tick: int) -> int:
	if confirmed_tick<0 or confirmed_tick<last_event_tick:
		return 0
	var count := 0
	var newest := last_event_tick
	for entry in events.slice(0,MAX_EVENTS):
		if not entry is Dictionary or typeof(entry.get("tick"))!=TYPE_INT:
			continue
		var tick: int=entry["tick"]
		if tick<=last_event_tick or tick>confirmed_tick or tick<0:
			continue
		var kind: String=str(entry.get("kind",""))
		match kind:
			"hit","parry":
				_play("heavy")
				count+=1
			"block":
				_play("light")
				count+=1
			"action":
				if entry.get("move","")=="step":
					_play("foot")
					count+=1
		newest=maxi(newest,tick)
	last_event_tick=newest
	return count

func accept_local_transition(previous: Dictionary,current: Dictionary) -> int:
	if current.get("rules","")!="seamless-side/1" or not current.get("p") is Array:
		return 0
	var tick: int=int(current.get("tick",-1))
	if tick<=last_local_tick:
		return 0
	last_local_tick=tick
	if previous.is_empty() or not previous.get("p") is Array:
		return 0
	var before: Array=previous["p"]
	var after: Array=current["p"]
	if before.size()!=2 or after.size()!=2:
		return 0
	var played := 0
	for side in range(2):
		var current_p: Dictionary=after[side]
		var old_p: Dictionary=before[side]
		if float(current_p["hp"])<float(old_p["hp"]):
			_play("heavy")
			played+=1
		elif current_p["act"]=="stun" and old_p["act"]!="stun":
			_play("light")
			played+=1
		elif current_p["act"]=="step" and old_p["act"]!="step":
			_play("foot")
			played+=1
	return played
