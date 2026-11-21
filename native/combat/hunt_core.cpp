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
