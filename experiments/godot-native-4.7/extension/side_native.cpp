// Native Windows/Linux Godot 4.7 fighting simulation bridge.
// Uses the exact portable seamless-side/1 C++ rules; never reimplements combat
// in a variable-frame renderer. Research only: no network or ranked authority.
#include <godot_cpp/classes/ref_counted.hpp>
#include <godot_cpp/core/class_db.hpp>
#include <godot_cpp/godot.hpp>
#include <godot_cpp/variant/array.hpp>
#include <godot_cpp/variant/dictionary.hpp>
#include <godot_cpp/variant/string.hpp>

#define SF_NO_CLI_MAIN 1
#include "../../../native/combat/side_core.cpp"

namespace godot {
static const char *MOVE_LABELS[]={"","cut","hew","shot","step","feint","stun","guardBreak"};

class SFCombat final : public RefCounted {
 GDCLASS(SFCombat, RefCounted)
 sf::State current;
protected:
 static void _bind_methods(){
  ClassDB::bind_method(D_METHOD("reset"),&SFCombat::reset);
  ClassDB::bind_method(D_METHOD("step_encoded","ax","ay","aa","ag","bx","by","ba","bg"),&SFCombat::step_encoded);
  ClassDB::bind_method(D_METHOD("get_state"),&SFCombat::get_state);
  ClassDB::bind_method(D_METHOD("get_tick"),&SFCombat::get_tick);
 }
public:
 void reset(){current=sf::State{};}
 int get_tick() const{return current.tick;}
 // This intentionally accepts the exact wire/CLI action enum. Sanitization
 // rejects engine-only actions 6/7 as player inputs.
 bool step_encoded(int ax,int ay,int aa,int ag,int bx,int by,int ba,int bg){
  const auto valid=[](int x,int y,int act,int guard){
   return x>=-1&&x<=1&&y>=-1&&y<=1&&act>=0&&act<=5&&
          (guard==0||guard==1);
  };
  if(!valid(ax,ay,aa,ag)||!valid(bx,by,ba,bg))return false;
  sf::step(current,sf::Input{ax,ay,aa,ag},sf::Input{bx,by,ba,bg});
  return true;
 }
 Dictionary get_state() const {
  Dictionary result;
  result["rules"]="seamless-side/1";
  result["tick"]=current.tick;
  result["clock"]=current.clock;
  result["ready"]=current.ready;
  result["end"]=current.end;
  result["round"]=current.round;
  Array score;
  score.append(current.score[0]);
  score.append(current.score[1]);
  result["score"]=score;
  result["winner"]=current.winner==-2?Variant():Variant(current.winner);
  result["over"]=bool(current.over);
  Array players;
  for(const sf::Fighter &p:current.p){
   Dictionary fighter;
   fighter["x"]=p.x;fighter["y"]=p.y;fighter["vx"]=p.vx;fighter["vy"]=p.vy;
   fighter["dir"]=p.dir;fighter["hp"]=p.hp;fighter["st"]=p.st;
   fighter["ammo"]=p.ammo;fighter["act"]=MOVE_LABELS[p.act];
   fighter["age"]=p.age;fighter["spent"]=bool(p.spent);
   fighter["crouch"]=bool(p.crouch);fighter["jumpHeld"]=bool(p.jumpHeld);
   fighter["guardAge"]=p.guardAge;fighter["regen"]=p.regen;fighter["combo"]=p.combo;
   players.append(fighter);
  }
  result["p"]=players;
  return result;
 }
};
void initialize_sf_combat(ModuleInitializationLevel level){
 if(level!=MODULE_INITIALIZATION_LEVEL_SCENE)return;
 GDREGISTER_CLASS(SFCombat);
}
void uninitialize_sf_combat(ModuleInitializationLevel){}
}
extern "C" GDExtensionBool GDE_EXPORT sf_combat_library_init(
 GDExtensionInterfaceGetProcAddress get_proc,
 GDExtensionClassLibraryPtr library,
 GDExtensionInitialization *initialization){
 godot::GDExtensionBinding::InitObject init(get_proc,library,initialization);
 init.register_initializer(godot::initialize_sf_combat);
 init.register_terminator(godot::uninitialize_sf_combat);
 init.set_minimum_library_initialization_level(godot::MODULE_INITIALIZATION_LEVEL_SCENE);
 return init.init();
}
