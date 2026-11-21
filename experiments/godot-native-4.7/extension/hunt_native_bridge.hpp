// Isolated, source-validated Hunt v3 Godot 4.7 native bridge.
// Legacy SFCombat remains on seamless-side/1 until explicit migration.
// Checkpoint methods keep local value-state copies, not network persistence.
#pragma once
#include <godot_cpp/classes/ref_counted.hpp>
#include <godot_cpp/core/class_db.hpp>
#include <godot_cpp/variant/array.hpp>
#include <godot_cpp/variant/dictionary.hpp>
#include <godot_cpp/variant/string.hpp>
#include <map>
#include "../../../native/combat/hunt_state_codec.hpp"

namespace godot {
static constexpr const char* HUNT_ACTION_LABELS[]={
 "","foldedLight","foldedHeavy","foldedCharged","unfurledLight",
 "unfurledHeavy","unfurledCharged","airFoldedLight","airFoldedHeavy",
 "airUnfurledLight","airUnfurledHeavy","unfurl","refold","shiftOut",
 "shiftIn","shot","airShot","visceral","heal","blood","stagger",
 "visceralVictim","step","feint","sync","stun"
};
static constexpr const char* HUNT_INPUT_LABELS[]={
 "","light","heavy","charge","trick","shot","step","feint",
 "sync","visceral","heal","blood"
};
static constexpr const char* HUNT_WEAPON_LABELS[]={"mournweave","thornwake"};
static constexpr const char* HUNT_FORM_LABELS[]={"folded","unfurled"};
static constexpr const char* HUNT_CAUSE_LABELS[]={"","gun","chargedRear"};
class SFHuntCombat final:public RefCounted{
 GDCLASS(SFHuntCombat,RefCounted)
 sf_hunt::State current;
 std::map<int,sf_hunt::State> checkpoints;
protected:
 static void _bind_methods(){
  ClassDB::bind_method(D_METHOD("reset"),&SFHuntCombat::reset);
  ClassDB::bind_method(D_METHOD("select_weapons","left","right"),&SFHuntCombat::select_weapons);
  ClassDB::bind_method(D_METHOD("step_encoded","ax","ay","aa","ag","bx","by","ba","bg"),&SFHuntCombat::step_encoded);
  ClassDB::bind_method(D_METHOD("get_tick"),&SFHuntCombat::get_tick);
  ClassDB::bind_method(D_METHOD("get_move_frame_data","slot"),&SFHuntCombat::get_move_frame_data);
  ClassDB::bind_method(D_METHOD("save_checkpoint"),&SFHuntCombat::save_checkpoint);
  ClassDB::bind_method(D_METHOD("load_checkpoint","encoded"),&SFHuntCombat::load_checkpoint);
  ClassDB::bind_method(D_METHOD("get_state"),&SFHuntCombat::get_state);
  ClassDB::bind_method(D_METHOD("save_local_checkpoint"),&SFHuntCombat::save_local_checkpoint);
  ClassDB::bind_method(D_METHOD("restore_local_checkpoint","tick"),&SFHuntCombat::restore_local_checkpoint);
  ClassDB::bind_method(D_METHOD("get_local_checkpoint_count"),&SFHuntCombat::get_local_checkpoint_count);
 }
public:
 void reset(){
  current=sf_hunt::State(current.p[0].weapon,current.p[1].weapon);
  checkpoints.clear();
 }
 bool select_weapons(int left,int right){
  if(left<0||left>1||right<0||right>1)return false;
  current=sf_hunt::State(static_cast<sf_hunt::Weapon>(left),
                          static_cast<sf_hunt::Weapon>(right));
  checkpoints.clear();
  return true;
 }
 int get_tick() const{return current.tick;}
 Dictionary get_move_frame_data(int slot) const{
  Dictionary result;
  if(slot!=0&&slot!=1)return result;
  const sf_hunt::Fighter&p=current.p[slot];
  const sf_hunt::Spec timing=sf_hunt::spec(p.weapon,p.act);
  result["rules"]="sf-hunt-lab/3";
  result["weapon"]=HUNT_WEAPON_LABELS[p.weapon];
  result["action"]=HUNT_ACTION_LABELS[p.act];
  result["age"]=p.age;
  result["startup"]=timing.startup;
  result["active"]=timing.active;
  result["recovery"]=timing.recovery;
  result["cost"]=timing.cost;
  result["reach"]=timing.reach;
  result["damage"]=timing.damage;
  result["remaining"]=std::max(0,sf_hunt::total(timing)-p.age);
  result["phase"]=p.act==sf_hunt::NONE?"idle":
    p.age<timing.startup?"startup":
    p.age<timing.startup+timing.active?"active":"recovery";
  return result;
 }
 PackedByteArray save_checkpoint() const{
  const std::vector<uint8_t> bytes=sf_hunt::save_checkpoint(current);
  PackedByteArray result;
  if(bytes.size()!=sf_hunt::codec::CHECKPOINT_SIZE)return result;
  result.resize(static_cast<int64_t>(bytes.size()));
  std::memcpy(result.ptrw(),bytes.data(),bytes.size());
  return result;
 }
 bool load_checkpoint(PackedByteArray bytes){
  if(bytes.size()!=static_cast<int64_t>(sf_hunt::codec::CHECKPOINT_SIZE))return false;
  sf_hunt::State parsed;
  if(!sf_hunt::load_checkpoint(bytes.ptr(),static_cast<std::size_t>(bytes.size()),parsed))
   return false;
  current=parsed;
  checkpoints.clear(); // Discard speculative alternate timeline after load.
  return true;
 }
 bool step_encoded(int ax,int ay,int aa,int ag,int bx,int by,int ba,int bg){
  // This ruleset NEVER accepts conventional guard or a third fighter slot.
  const auto valid=[](int x,int y,int act,int guard){
   return x>=-1&&x<=1&&y>=-1&&y<=1&&act>=0&&act<=11&&guard==0;
  };
  if(!valid(ax,ay,aa,ag)||!valid(bx,by,ba,bg))return false;
  sf_hunt::step(current,
   sf_hunt::Input{ax,ay,static_cast<sf_hunt::Request>(aa),false},
   sf_hunt::Input{bx,by,static_cast<sf_hunt::Request>(ba),false});
  return true;
 }
 int save_local_checkpoint(){
  // Testable exact C++ value-state rollback, not canonical network bytes.
  checkpoints[current.tick]=current;
  if(checkpoints.size()>121)checkpoints.erase(checkpoints.begin()); // 120 completed frames + the pre-step state
  return current.tick;
 }
 bool restore_local_checkpoint(int tick){
  const auto it=checkpoints.find(tick);
  if(it==checkpoints.end())return false;
  current=it->second;
  // Timeline forks may not retrieve snapshots from their discarded future.
  checkpoints.erase(checkpoints.upper_bound(tick),checkpoints.end());
  return true;
 }
 int get_local_checkpoint_count() const{return static_cast<int>(checkpoints.size());}
 Dictionary get_state() const{
  Dictionary s;
  s["rules"]="sf-hunt-lab/3";s["tick"]=current.tick;
  s["clock"]=current.clock;s["ready"]=current.ready;s["end"]=current.end;
  s["round"]=current.round;s["winner"]=current.winner==-2?Variant():Variant(current.winner);
  s["over"]=current.over;
  Array score;score.append(current.score[0]);score.append(current.score[1]);s["score"]=score;
  Array players;
  for(const sf_hunt::Fighter&p:current.p){
   Dictionary f;
   f["x"]=p.x;f["y"]=p.y;f["vx"]=p.vx;f["vy"]=p.vy;
   f["dir"]=p.dir;f["weapon"]=HUNT_WEAPON_LABELS[p.weapon];
   f["hp"]=p.hp;f["st"]=p.st;f["ammo"]=p.ammo;
   f["bloodAmmo"]=p.bloodAmmo;f["vials"]=p.vials;f["focus"]=p.focus;
   f["form"]=HUNT_FORM_LABELS[p.form];f["rally"]=p.rally;
   f["rallyLife"]=p.rallyLife;f["exposed"]=p.exposed;
   f["exposeCause"]=HUNT_CAUSE_LABELS[p.exposeCause];
   f["visceralTarget"]=p.visceralTarget;
   f["act"]=HUNT_ACTION_LABELS[p.act];f["age"]=p.age;
   f["spent"]=p.spent;f["hitConfirmed"]=p.hitConfirmed;
   f["crouch"]=p.crouch;f["jumpHeld"]=p.jumpHeld;
   f["jumps"]=p.jumps;f["regen"]=p.regen;f["combo"]=p.combo;
   f["chain"]=p.chain;f["queue"]=HUNT_INPUT_LABELS[p.queue];
   f["queueLife"]=p.queueLife;
   players.append(f);
  }
  s["p"]=players;
  return s;
 }
};
} // namespace godot
