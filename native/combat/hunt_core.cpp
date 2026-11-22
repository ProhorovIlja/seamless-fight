#include "hunt_core.hpp"
#include <iostream>
#include <vector>
#include <sstream>
#include <array>
#include <string>
int main(int argc,char**argv){
 using namespace sf_hunt;
 int first=0,second=0;
 if(!(std::cin>>first>>second)||first<0||first>1||second<0||second>1)return 2;
 State s(static_cast<Weapon>(first),static_cast<Weapon>(second));
 // Test harness ONLY: no network, gameplay menu or shipped match exposes
 // direct position overrides. Validated initial corner states prove
 // BOTH sides of the body-pass-through rule in the same native rules core.
 if(argc>2)return 7;
 if(argc==2){
  const std::string scenario(argv[1]);
  if(scenario=="--corner-left"){
   s.p[0].x=65;s.p[1].x=107;s.ready=0;
  }else if(scenario=="--corner-right"){
   s.p[0].x=895;s.p[1].x=853;s.ready=0;
  }else if(scenario.rfind("--morph-counter-p0-",0)==0||
           scenario.rfind("--morph-counter-p1-",0)==0){
   // No artificial hit success. A real folded R1 must physically tag
   // a missed R2/charged R2 before its early queued L1 can rescue it.
   // Both slots, forms, original weapons and R2 variants are mirrored.
   const int attacker=scenario.rfind("--morph-counter-p1-",0)==0?1:0;
   const bool unfolded=scenario.find("-unfurled-")!=std::string::npos;
   const bool charged_attack=scenario.find("-charged")!=std::string::npos;
   if(scenario.find("-heavy")==std::string::npos&&!charged_attack)return 7;
   s.ready=0;s.p[0].x=430;s.p[1].x=500;
   for(int slot=0;slot<2;slot++){
    Fighter&p=s.p[slot];p.vx=0;p.dir=slot==0?1:-1;p.st=100;
   }
   Fighter&victim=s.p[attacker],&counter=s.p[1-attacker];
   counter.act=FOLDED_LIGHT;
   counter.age=spec(counter.weapon,counter.act).startup;
   counter.form=FOLDED;counter.spent=false;
   victim.form=unfolded?UNFURLED:FOLDED;
   victim.act=unfolded?(charged_attack?UNFURLED_CHARGED:UNFURLED_HEAVY):
                        (charged_attack?FOLDED_CHARGED:FOLDED_HEAVY);
   const Spec m=spec(victim.weapon,victim.act);
   victim.age=m.startup+m.active;
   victim.spent=false;victim.hitConfirmed=false;victim.chain=1;
  }else if(scenario.rfind("--morph-p0-",0)==0||
           scenario.rfind("--morph-p1-",0)==0){
   // Directed exact JS/native parity for a MISSED heavy's vulnerable
   // recovery before a Bloodborne-like paid trick attack is allowed.
   // Both weapons are encoded in stdin; both player slots & two forms
   // are explicitly mirrored in the scenario name.
   const int slot=scenario.rfind("--morph-p1-",0)==0?1:0;
   const bool unfolded=scenario.find("-unfurled-")!=std::string::npos;
   const bool early=scenario.find("-heavy-early")!=std::string::npos;
   const bool late=scenario.find("-heavy-late")!=std::string::npos;
   const bool hit=scenario.find("-heavy-hit")!=std::string::npos;
   const bool light_whiff=scenario.find("-light-whiff")!=std::string::npos;
   if(!early&&!late&&!hit&&!light_whiff)return 7;
   s.ready=0;
   s.p[0].x=360;s.p[1].x=800;
   s.p[0].vx=0;s.p[1].vx=0;
   s.p[0].dir=1;s.p[1].dir=-1;
   Fighter&p=s.p[slot];
   p.form=unfolded?UNFURLED:FOLDED;
   p.act=light_whiff?(unfolded?UNFURLED_LIGHT:FOLDED_LIGHT):
                      (unfolded?UNFURLED_HEAVY:FOLDED_HEAVY);
   const Spec m=spec(p.weapon,p.act);
   p.age=early?m.startup+m.active+3:
         late?m.startup+m.active+WHIFF_HEAVY_TRANSFORM_RECOVERY:
         hit?m.startup+m.active-1:m.startup+1;
   p.spent=hit;p.hitConfirmed=hit;p.st=100;p.chain=1;
  }else if(scenario=="--trade"||scenario=="--trade-rally"){
   // CLI parity ONLY: both real melee hitboxes are active on the same
   // input tick. Tests both neutral HP and legitimate previous Rally.
   s.ready=0;
   s.p[0].x=430;s.p[1].x=500;
   s.p[0].dir=1;s.p[1].dir=-1;
   const bool existing_rally=scenario=="--trade-rally";
   for(Fighter&p:s.p){
    p.act=FOLDED_LIGHT;
    p.age=spec(p.weapon,p.act).startup;
    p.hp=existing_rally?80:100;
    p.rally=existing_rally?10:0;
    p.rallyLife=existing_rally?50:0;
   }
  }else if(scenario=="--limb-left"||scenario=="--limb-right"||
           scenario=="--limb-hit-left"||scenario=="--limb-hit-right"){
   // CLI parity ONLY: a light attack misses the ordinary body but tags the
   // opponent's short exposed arm in actual missed heavy recovery.
   if(first!=0)return 7; // Mournweave R1 reach is 88 in this fixture.
   const bool mirror=scenario=="--limb-right"||scenario=="--limb-hit-right";
   const bool previous_hit=scenario=="--limb-hit-left"||scenario=="--limb-hit-right";
   s.ready=0;
   s.p[0].x=mirror?580:380;
   s.p[1].x=mirror?460:500;
   s.p[0].dir=mirror?-1:1;
   s.p[1].dir=-s.p[0].dir;
   s.p[0].act=FOLDED_LIGHT;
   s.p[0].age=spec(s.p[0].weapon,FOLDED_LIGHT).startup;
   s.p[1].act=UNFURLED_HEAVY;
   const Spec victim=spec(s.p[1].weapon,UNFURLED_HEAVY);
   s.p[1].age=victim.startup+victim.active;
   s.p[1].spent=previous_hit;
  }else if(scenario.rfind("--visceral-lock-p0-",0)==0||
           scenario.rfind("--visceral-lock-p1-",0)==0){
   // A real opponent repeatedly mashes gun/step while being caught by
   // an incoming visceral. Input must never remain buffered in the
   // victim due to first/second slot update order.
   s.ready=0;
   const int attacker=scenario.rfind("--visceral-lock-p1-",0)==0?1:0;
   if(scenario.find("-shot")==std::string::npos&&
      scenario.find("-step")==std::string::npos)return 7;
   s.p[attacker].x=500;s.p[attacker].vx=0;s.p[attacker].act=NONE;
   s.p[1-attacker].x=426;s.p[1-attacker].vx=6;
   s.p[1-attacker].act=STAGGER;s.p[1-attacker].age=20;
   s.p[1-attacker].exposed=20;
   s.p[1-attacker].queue=NOTHING;s.p[1-attacker].queueLife=0;
  }else if(scenario.rfind("--visceral-p0-",0)==0||
           scenario.rfind("--visceral-p1-",0)==0){
   // Parry opening and target range are read from a shared start-of-tick
   // snapshot. Test both slots at exact in/out boundaries and final frame.
   s.ready=0;
   const int attacker=scenario.rfind("--visceral-p1-",0)==0?1:0;
   const bool outside=scenario.find("-outside")!=std::string::npos;
   const bool inside=scenario.find("-inside")!=std::string::npos;
   const bool expiry=scenario.find("-expiry")!=std::string::npos;
   const bool expired=scenario.find("-expired")!=std::string::npos;
   if(!outside&&!inside&&!expiry&&!expired)return 7;
   s.p[attacker].x=500;
   s.p[1-attacker].x=500-(outside?77:74);
   s.p[attacker].vx=0;
   s.p[1-attacker].vx=outside?6:inside?-6:0;
   s.p[attacker].act=NONE;
   s.p[1-attacker].act=STAGGER;
   s.p[1-attacker].age=1;
   s.p[1-attacker].exposed=expired?0:expiry?1:15;
  }else if(scenario=="--attack-facing-p0-left"||scenario=="--attack-facing-p0-right"||
           scenario=="--attack-facing-p1-left"||scenario=="--attack-facing-p1-right"){
   // Both inputs are simultaneous. At 1U separation the neutral walker
   // would traverse the other body's START position before its heavy R2.
   // The attack's direction must be chosen from PRE-frame positions for
   // either player slot, independent of drive() call order.
   s.ready=0;
   const bool heavy_p1=scenario.find("-p1-")!=std::string::npos;
   const bool heavy_left=scenario.find("-left")!=std::string::npos;
   const int attacker=heavy_p1?1:0;
   s.p[attacker].x=heavy_left?479.5:480.5;
   s.p[1-attacker].x=heavy_left?480.5:479.5;
   s.p[0].vx=0;s.p[1].vx=0;
  }else if(scenario=="--face-cross-p0"||scenario=="--face-cross-p1"){
   // Directed parity: at almost zero spacing a neutral hunter TRIES
   // to walk through the opponent, but the solid body solver must preserve
   // the original order and leave both facing inward, for either slot.
   s.ready=0;
   const bool moving_second_slot=scenario=="--face-cross-p1";
   s.p[0].x=moving_second_slot?480.5:479.5;
   s.p[1].x=moving_second_slot?479.5:480.5;
   s.p[0].vx=0;s.p[1].vx=0;
  }else return 7;
 }
 std::vector<State> checkpoints;
 std::vector<std::array<Input,2>> commands;
 int x0,y0,a0,g0,x1,y1,a1,g1;
 std::size_t rewinds=0;
 while(std::cin>>x0>>y0>>a0>>g0>>x1>>y1>>a1>>g1){
  const Input a{x0,y0,static_cast<Request>(a0),g0!=0},
              b{x1,y1,static_cast<Request>(a1),g1!=0};
  const auto valid=[](const Input&i){
   return i.x>=-1&&i.x<=1&&i.y>=-1&&i.y<=1&&!i.guard&&
    i.act>=NOTHING&&i.act<=BLOOD_INPUT;
  };
  if(!valid(a)||!valid(b)){
   std::cerr<<"HUNT_V3_REJECTED_INVALID_INPUT\n";return 3;
  }
  step(s,a,b);
  commands.push_back({a,b});checkpoints.push_back(s);
  const std::size_t n=checkpoints.size();
  if(n>=9&&n%157==0){
   State replay=checkpoints[n-9];
   for(std::size_t k=n-8;k<n;k++)step(replay,commands[k][0],commands[k][1]);
   if(replay.tick!=s.tick){std::cerr<<"HUNT_V3_LOCAL_ROLLBACK_TICK_MISMATCH\n";return 4;}
   // Compare complete externally observable states, including all resources,
   // action queues, hitstun/exposure, weapons and air state.
   std::ostringstream left,right;
   output(replay,left);output(s,right);
   if(left.str()!=right.str()){std::cerr<<"HUNT_V3_LOCAL_ROLLBACK_STATE_MISMATCH\n";return 5;}
   ++rewinds;
  }
  output(s,std::cout);
 }
 if(!std::cin.eof())return 6;
 std::cerr<<"HUNT_V3_NATIVE_LOCAL_REWIND_PASSED checkpoints="<<rewinds<<'\n';
 return 0;
}
