// Seamless Fight — independent portable C++17 Hunt v3 fixed-tick research core.
// Source of truth: public/side-hunt-lab.mjs. Not connected to legacy side/1,
// Godot GDExtension, server, ranked or matchmaking until cross-language tests pass.
// This file is original code; no proprietary Bloodborne data or assets.
#pragma once
#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <iomanip>
#include <ostream>

namespace sf_hunt {
constexpr int HZ=60, FLOOR=436, WIDTH=960;
enum Weapon{MOURNWEAVE,THORNWAKE};
enum Form{FOLDED,UNFURLED};
enum Cause{NO_CAUSE,GUN,CHARGED_REAR};
enum Request{NOTHING,LIGHT,HEAVY,CHARGE,TRICK,FIRE,QUICKSTEP,FEINT_INPUT,
             SYNC_INPUT,VISCERAL_INPUT,HEAL_INPUT,BLOOD_INPUT};
enum Action{NONE,FOLDED_LIGHT,FOLDED_HEAVY,FOLDED_CHARGED,UNFURLED_LIGHT,
 UNFURLED_HEAVY,UNFURLED_CHARGED,AIR_FOLDED_LIGHT,AIR_FOLDED_HEAVY,
 AIR_UNFURLED_LIGHT,AIR_UNFURLED_HEAVY,UNFURL,REFOLD,SHIFT_OUT,SHIFT_IN,
 SHOT,AIR_SHOT,VISCERAL,HEAL,BLOOD,STAGGER,VISCERAL_VICTIM,STEP,FEINT,SYNC,STUN,BACKSTEP,FOLDED_BACKSTEP_LIGHT,UNFURLED_BACKSTEP_LIGHT,COUNT};
struct Spec {int startup,active,recovery,cost,reach,damage,top,bottom;};
constexpr std::array<Spec,COUNT> BASE={{
 {0,0,0,0,0,0,0,0},
 {7,4,13,10,88,15,-103,-26},  {17,6,23,24,113,29,-123,-34},
 {35,5,33,32,125,32,-125,-30},{11,6,17,14,160,17,-122,-22},
 {23,8,26,29,193,30,-130,-23},{43,7,37,37,210,38,-133,-20},
 {9,5,18,12,98,15,-108,-7},  {18,6,24,25,120,27,-123,-12},
 {12,6,21,15,173,18,-112,-2},{22,7,27,29,192,29,-121,-7},
 {10,6,17,18,142,21,-120,-26},{10,6,17,18,113,23,-108,-29},
 {6,0,13,6,0,0,-105,-26},{6,0,13,6,0,0,-105,-26},
 {9,1,25,9,275,4,-111,-77},{10,1,27,11,265,4,-93,30},
 {6,2,29,0,75,42,-117,-21},{21,1,25,0,0,0,-105,-26},
 {16,1,23,0,0,0,-105,-26},{0,0,42,0,0,0,-105,-26},
 {0,0,46,0,0,0,-105,-26},{0,9,12,19,0,0,-105,-26},
 {0,0,12,9,0,0,-105,-26},{0,0,5,0,0,0,-105,-26},
 {0,0,22,0,0,0,-105,-26},
 {0,8,9,10,0,0,-105,-26},{9,4,17,11,104,18,-110,-24},
 {14,6,21,16,180,20,-122,-25}
}};
constexpr std::array<Spec,14> THORN={{
 {0,0,0,0,0,0,0,0},
 {5,3,15,9,82,12,-96,-24},{16,4,24,21,124,25,-114,-31},
 {37,6,32,32,139,32,-118,-30},{14,5,19,16,182,16,-122,-25},
 {24,8,29,34,222,31,-129,-23},{45,7,39,40,236,40,-132,-21},
 {8,4,18,12,99,13,-103,-8},{19,6,24,24,136,25,-127,-9},
 {13,5,21,17,190,17,-120,-5},{25,7,28,33,224,28,-130,-6},
 {13,6,19,20,188,17,-117,-24},{8,5,16,16,108,18,-103,-27},
 {8,0,13,7,0,0,-105,-26}
}};
constexpr Spec THORN_SHIFT_IN={4,0,11,5,0,0,-105,-26};
constexpr Spec THORN_FOLDED_BACKSTEP_LIGHT={7,4,18,10,107,16,-99,-24};
constexpr Spec THORN_UNFURLED_BACKSTEP_LIGHT={15,6,22,18,199,19,-121,-25};
inline Spec spec(Weapon w,Action a){
 const int n=static_cast<int>(a);
 // Godot's official GDExtension toolchain disables C++ exceptions.
 // No invalid enum can cause an out-of-bounds table access.
 if(n<0||n>=COUNT)return BASE[NONE];
 if(w==THORNWAKE && n<static_cast<int>(THORN.size()))return THORN[n];
 if(w==THORNWAKE && a==SHIFT_IN)return THORN_SHIFT_IN;
 if(w==THORNWAKE && a==FOLDED_BACKSTEP_LIGHT)return THORN_FOLDED_BACKSTEP_LIGHT;
 if(w==THORNWAKE && a==UNFURLED_BACKSTEP_LIGHT)return THORN_UNFURLED_BACKSTEP_LIGHT;
 return BASE[n];
}
inline int total(Spec m){return m.startup+m.active+m.recovery;}
template<class T> inline T clamp(T x,T lo,T hi){return std::max(lo,std::min(hi,x));}
struct Input{int x=0,y=0; Request act=NOTHING; bool guard=false;};
struct Fighter {
 double x=255,y=FLOOR,vx=0,vy=0;
 int dir=1;Weapon weapon=MOURNWEAVE;
 double hp=100,st=100;int ammo=7,bloodAmmo=0,vials=2,focus=0;
 Form form=FOLDED;double rally=0;int rallyLife=0,exposed=0;
 Cause exposeCause=NO_CAUSE;int visceralTarget=-1;
 Action act=NONE;int age=0;bool spent=false,hitConfirmed=false;
 bool crouch=false,jumpHeld=false;int jumps=0,regen=0,combo=0,chain=0;
 Request queue=NOTHING;int queueLife=0;
};
inline Fighter fighter(int slot,Weapon weapon){
 Fighter p;p.x=slot?705:255;p.dir=slot?-1:1;p.weapon=weapon;return p;
}
struct State{
 int tick=0,clock=65*HZ,ready=90,end=0,round=1,winner=-2;
 bool over=false;int score[2]={0,0};
 Fighter p[2];
 explicit State(Weapon a=MOURNWEAVE,Weapon b=MOURNWEAVE){
  p[0]=fighter(0,a);p[1]=fighter(1,b);
 }
};
inline bool ordinary(Action a){
 return (a>=FOLDED_LIGHT&&a<=UNFURLED_CHARGED)||
   (a>=AIR_FOLDED_LIGHT&&a<=AIR_UNFURLED_HEAVY)||
   a==FOLDED_BACKSTEP_LIGHT||a==UNFURLED_BACKSTEP_LIGHT;
}
inline bool transform(Action a){return a==UNFURL||a==REFOLD;}
inline bool heavy(Action a){
 return a==FOLDED_HEAVY||a==UNFURLED_HEAVY||
   a==AIR_FOLDED_HEAVY||a==AIR_UNFURLED_HEAVY;
}
inline bool charged(Action a){return a==FOLDED_CHARGED||a==UNFURLED_CHARGED;}
inline bool can_act(const Fighter&p){return p.act==NONE||p.age>=total(spec(p.weapon,p.act));}
inline Action requested(const Fighter&p,Request r,const Input&i){
 const bool air=p.y<FLOOR;
 switch(r){
 case LIGHT: return p.act==BACKSTEP&&!air?
                         (p.form==FOLDED?FOLDED_BACKSTEP_LIGHT:UNFURLED_BACKSTEP_LIGHT):
                        air?(p.form==FOLDED?AIR_FOLDED_LIGHT:AIR_UNFURLED_LIGHT):
                         (p.form==FOLDED?FOLDED_LIGHT:UNFURLED_LIGHT);
 case HEAVY: return air?(p.form==FOLDED?AIR_FOLDED_HEAVY:AIR_UNFURLED_HEAVY):
                         (p.form==FOLDED?FOLDED_HEAVY:UNFURLED_HEAVY);
 case CHARGE: return air?NONE:(p.form==FOLDED?FOLDED_CHARGED:UNFURLED_CHARGED);
 case TRICK: return p.act==NONE?(p.form==FOLDED?SHIFT_OUT:SHIFT_IN):
                                 (p.form==FOLDED?UNFURL:REFOLD);
 case FIRE: return air?AIR_SHOT:SHOT;
 case QUICKSTEP: return air?NONE:(i.x==0?BACKSTEP:STEP);
 case FEINT_INPUT:return FEINT;case SYNC_INPUT:return SYNC;
 case VISCERAL_INPUT:return VISCERAL;case HEAL_INPUT:return HEAL;
 case BLOOD_INPUT:return BLOOD;
 default:return NONE;
 }
}
inline void buffer(Fighter&p,Request r){
 if(r!=NOTHING){p.queue=r;p.queueLife=6;}
 else if(p.queueLife>0){--p.queueLife;if(p.queueLife==0)p.queue=NOTHING;}
}
inline bool start(Fighter&p,Fighter&q,Action r,const Input&i){
 if(r==NONE)return false;
 const Spec m=spec(p.weapon,r),old=spec(p.weapon,p.act);
 const bool escaping=p.act==STUN&&r==STEP;
 const int extra=escaping?6:0;
 if(p.st<m.cost+extra)return false;
 if((r==SHOT||r==AIR_SHOT)&&!p.ammo&&!p.bloodAmmo)return false;
 if(r==AIR_SHOT&&p.y>=FLOOR)return false;
 if((r==BLOOD||r==HEAL)&&p.y<FLOOR)return false;
 if(r==BLOOD&&(p.hp<=30||p.bloodAmmo))return false;
 if(r==HEAL&&(!p.vials||p.hp>=100))return false;
 if(r==VISCERAL&&(!q.exposed||p.y<FLOOR||std::abs(p.x-q.x)>76||
                   p.dir*(q.x-p.x)<0))return false;
 if((r==HEAL||r==BLOOD||r==VISCERAL)&&p.act!=NONE&&!can_act(p))return false;
 if((r==SHIFT_OUT||r==SHIFT_IN)&&p.y<FLOOR)return false;
 const bool was_attack=spec(p.weapon,p.act).damage>0&&p.act!=SHOT&&p.act!=VISCERAL;
 bool chained=false;
 if(p.act==NONE||can_act(p)){
  if(r==FEINT||r==SYNC)return false;
  p.chain=0;
 }else if(escaping&&p.age>=8&&p.age<total(old)-5&&p.y>=FLOOR){
  chained=false;
 }else if(p.act==BACKSTEP&&
           (r==FOLDED_BACKSTEP_LIGHT||r==UNFURLED_BACKSTEP_LIGHT)&&
           p.age>=5&&p.age<total(old)-3){
  chained=true;
 }else if(r==FEINT&&heavy(p.act)&&p.age>=5&&p.age<old.startup-3){
  chained=true;
 }else if(transform(r)&&(ordinary(p.act)||p.act==STEP)&&
           p.age>=old.startup+1&&p.age<total(old)-6&&p.chain<4){
  chained=true;
 }else if(was_attack&&ordinary(r)&&
           // Prevent generic heavy-to-heavy hit-cancels. R2 can be repeated
           // only after actual recovery; light/trick conversions remain.
           !((heavy(p.act)||charged(p.act))&&(heavy(r)||charged(r)))&&
           p.hitConfirmed&&
           p.age>=old.startup+old.active-1&&p.age<total(old)-6&&p.chain<4){
  chained=true;
 }else if(r==STEP&&was_attack&&p.hitConfirmed&&p.focus>=25&&p.chain<4&&
           p.age>=old.startup+old.active-1&&p.age<total(old)-5){
  chained=true;
 }else if(r==SYNC&&p.focus>=60&&was_attack&&
           p.age>=old.startup+old.active&&p.age<total(old)-3){
  chained=true;
 }else return false;
 if(r==SYNC)p.focus-=60;
 if(chained&&r==STEP)p.focus-=25;
 p.act=r;p.age=0;p.spent=false;p.hitConfirmed=false;
 p.chain=chained?p.chain+1:1;
 p.st=clamp(p.st-m.cost-extra,0.0,100.0);p.regen=27;p.crouch=false;
 if(r==SHOT||r==AIR_SHOT){if(p.bloodAmmo)--p.bloodAmmo;else --p.ammo;}
 if(r==HEAL)--p.vials;
 if(r==BLOOD){p.hp-=30;p.rally=std::min(100.0,p.rally+30);p.rallyLife=100;}
 if(r==VISCERAL){
  p.visceralTarget=1;q.act=VISCERAL_VICTIM;q.age=0;q.exposed=0;
  q.queue=NOTHING;q.queueLife=0;
 }
 if(r==STEP)p.vx=10.6*(i.x?i.x:p.dir);
 if(r==BACKSTEP)p.vx=-7.8*p.dir;
 return true;
}
inline void drive(Fighter&p,Fighter&q,const Input&i,double opponent_start_x){
 const bool ground=p.y>=FLOOR;
 if(p.exposed>0)--p.exposed;
 if(p.rallyLife>0)--p.rallyLife;else p.rally=0;
 if(can_act(p)){p.act=NONE;p.age=0;p.chain=0;p.hitConfirmed=false;}
 // Both slots select new-attack facing from the same pre-drive
 // snapshot, never the opponent's partially advanced frame.
 if(p.act==NONE)p.dir=opponent_start_x>=p.x?1:-1;
 const bool jump=i.y==-1;
 p.crouch=false; // Legacy snapshot slot only; no low stance or ducking.
 if(jump&&!p.jumpHeld&&p.jumps<1&&p.act==NONE&&p.st>=6){
  p.vy=-12.6;p.y-=.01;++p.jumps;p.st-=6;p.regen=15;p.crouch=false;
 }
 p.jumpHeld=jump;
 buffer(p,i.act);
 if(p.queue!=NOTHING){
  const Action req=requested(p,p.queue,i);
  if(start(p,q,req,i)){p.queue=NOTHING;p.queueLife=0;}
 }
 const Spec m=spec(p.weapon,p.act);
 if((transform(p.act)||p.act==SHIFT_OUT||p.act==SHIFT_IN)&&p.age==m.startup-1)
  p.form=p.form==FOLDED?UNFURLED:FOLDED;
 if(p.act==STEP)p.vx*=.89;
 else if(p.act==BACKSTEP)p.vx*=.83;
 else if(p.act!=NONE){
  p.vx*=.74;
  if(m.damage&&p.age==m.startup-1)p.vx+=p.dir*(heavy(p.act)?4.0:2.4);
 }else{
  const double speed=ground?3.9:3.5;
  const double acceleration=ground?.33:.14;
  p.vx+=(i.x*speed-p.vx)*acceleration;
 }
 p.x=clamp(p.x+p.vx,65.0,static_cast<double>(WIDTH-65));
 if(p.y<FLOOR||p.vy<0){
  p.vy=std::min(15.0,p.vy+.75);
  p.y=std::min(static_cast<double>(FLOOR),p.y+p.vy);
  if(p.y==FLOOR){p.vy=0;p.jumps=0;}
 }else{p.y=FLOOR;p.vy=0;}
 if(p.regen>0)--p.regen;
 else if(p.act==NONE)p.st=std::min(100.0,p.st+.69);
}
inline bool strike(const Fighter&p,const Fighter&q){
 const Spec m=spec(p.weapon,p.act);
 if(!m.damage||p.spent||p.age<m.startup||p.age>=m.startup+m.active)return false;
 if(q.act==STEP&&q.age>=1&&q.age<7)return false;
 const double left=p.dir>0?p.x+8:p.x-m.reach,right=p.dir>0?p.x+m.reach:p.x-8;
 const double top=p.y+m.top,bottom=p.y+m.bottom;
 // Match the JS source's small, facing-aware recovering melee arm
 // hurtbox. Whiff punishment must target exposed limbs, not the full
 // weapon blade; extension is only active in genuine recovery.
 const Spec target=spec(q.weapon,q.act);
 const bool arm_exposed=ordinary(q.act)&&!q.spent&&
   q.age>=target.startup+target.active&&q.age<total(target);
 const int arm=arm_exposed?std::min(24,target.reach/5):0;
 const double hleft=q.x-18-(q.dir<0?arm:0);
 const double hright=q.x+18+(q.dir>0?arm:0);
 const double htop=q.y-111,hbottom=q.y-8;
 return left<hright&&right>hleft&&top<hbottom&&bottom>htop;
}
inline bool parryable(const Fighter&p){
 if(p.act==NONE)return false;
 const Spec m=spec(p.weapon,p.act);
 if(p.act==HEAL||p.act==BLOOD)return p.age>=3&&p.age<=m.startup;
 const bool offensive=ordinary(p.act)||p.act==UNFURL||p.act==REFOLD;
 return offensive&&p.age>=std::max(2,m.startup-6)&&p.age<m.startup+m.active;
}
inline void hit(State&s,int attacker,int target,Action move,double pre_contact_rally=0){
 Fighter&a=s.p[attacker],&b=s.p[target];
 const Spec m=spec(a.weapon,move);a.spent=true;
 const double previous=b.hp;
 if(move==SHOT||move==AIR_SHOT){
  const bool counter=parryable(b);
  b.hp=std::max(0.0,b.hp-m.damage);
  b.rally=std::min(100.0,b.rally+(previous-b.hp));b.rallyLife=100;
  a.hitConfirmed=true;
  if(counter){
   b.act=STAGGER;b.age=0;b.exposed=40;b.exposeCause=GUN;b.vx=0;
   b.queue=NOTHING;b.queueLife=0;b.chain=0;b.hitConfirmed=false;
  }
  return;
 }
 if(move==VISCERAL){
  if(b.act!=VISCERAL_VICTIM)return;
  b.hp=std::max(0.0,b.hp-m.damage);
  b.rally=std::min(100.0,b.rally+(previous-b.hp));b.rallyLife=100;
  b.act=STUN;b.age=0;b.exposed=0;b.queue=NOTHING;b.queueLife=0;b.vx=0;
  a.hitConfirmed=true;a.focus=std::min(100,a.focus+15);
  return;
 }
 if(!m.damage)return;
 const int combo=b.act==STUN?b.combo+1:1;
 const double damage=std::max(5.0,std::ceil(m.damage*std::max(.45,1-.13*(combo-1))));
 // Do not recover HP earned from the opponent's earlier slot in this
 // same simulation tick. Each contender has the same pre-contact budget.
 const double regain=std::min({a.rally,damage,pre_contact_rally});
 a.hp=std::min(100.0,a.hp+regain);a.rally-=regain;
 if(!a.rally)a.rallyLife=0;
 b.hp=std::max(0.0,b.hp-damage);
 b.rally=std::min(100.0,b.rally+(previous-b.hp));b.rallyLife=100;
 b.combo=combo;b.act=STUN;b.age=0;b.crouch=false;
 b.queue=NOTHING;b.queueLife=0;b.chain=0;b.hitConfirmed=false;b.exposed=0;
 b.vx=a.dir*(m.damage>=27?6.1:4.4);
 // The source may already be stunned by the other simultaneous strike.
 // No phantom hit-confirm may remain on an interrupted action.
 a.hitConfirmed=a.act==move;
 a.focus=std::min(100,a.focus+9);
 const bool rear=(a.x-b.x)*b.dir<0;
 if(charged(move)&&rear&&b.y==FLOOR){
  b.act=STAGGER;b.age=0;b.exposed=40;b.exposeCause=CHARGED_REAR;b.vx=0;
 }
}
inline void settle(Fighter&p){
 const Spec m=spec(p.weapon,p.act);
 if(p.act==HEAL&&p.age==m.startup){
  p.hp=std::min(100.0,p.hp+35);p.rally=0;p.rallyLife=0;
 }
 if(p.act==BLOOD&&p.age==m.startup)p.bloodAmmo=5;
}
inline void step(State&s,const Input&aa,const Input&bb){
 for(const Input&i:{aa,bb}){
  if((i.x<-1||i.x>1)||(i.y<-1||i.y>1)||i.guard||
     i.act<NOTHING||i.act>BLOOD_INPUT)
   return; // Deterministic fail-closed no-op; validated GDExtension/CLI reject callers.
 }
 ++s.tick;if(s.over)return;
 if(s.end){
  if(!--s.end){
   s.p[0]=fighter(0,s.p[0].weapon);s.p[1]=fighter(1,s.p[1].weapon);
   s.clock=65*HZ;s.ready=90;++s.round;s.winner=-2;
  }
  return;
 }
 if(s.ready){--s.ready;return;}
 Fighter&a=s.p[0],&b=s.p[1];
 const double before_a=a.x,before_b=b.x;
 drive(a,b,aa,before_b);drive(b,a,bb,before_a);
 // Only forward quickstep i-frames allow body crossing; recovery is solid.
 const auto forward_step=[](const Fighter&p){
  return p.act==STEP&&p.age>=1&&p.age<7&&p.vx*p.dir>0;
 };
 if(!forward_step(a)&&!forward_step(b)&&
    std::abs(a.y-b.y)<55&&std::abs(a.x-b.x)<38){
  // The authored body collision remains solid for neutral walking.
  // Preserve the old left/right order; resolve a full 38-unit gap even
  // against arena edges. Paid i-frame through-steps remain the exception.
  const double center=(a.x+b.x)/2;
  const double left=clamp(center-19,65.0,double(WIDTH-65-38));
  const double right=left+38;
  if(before_a<=before_b){a.x=left;b.x=right;}
  else{a.x=right;b.x=left;}
 }
 // Neutral facing must follow FINAL physical positions, not drive() slot
 // order. A committed attack/dodge retains its authored action facing.
 if(a.act==NONE)a.dir=b.x>=a.x?1:-1;
 if(b.act==NONE)b.dir=a.x>=b.x?1:-1;
 const double rally_before_contact[2]={a.rally,b.rally};
 const bool gun[2]={
  (a.act==SHOT||a.act==AIR_SHOT)&&strike(a,b),
  (b.act==SHOT||b.act==AIR_SHOT)&&strike(b,a)};
 const Action fired[2]={a.act,b.act};
 for(int i=0;i<2;i++)if(gun[i])hit(s,i,1-i,fired[i]);
 const bool melee[2]={
  a.act!=SHOT&&a.act!=AIR_SHOT&&strike(a,b),
  b.act!=SHOT&&b.act!=AIR_SHOT&&strike(b,a)};
 const Action moves[2]={a.act,b.act};
 for(int i=0;i<2;i++)if(melee[i])
  hit(s,i,1-i,moves[i],rally_before_contact[i]);
 for(Fighter&p:s.p)settle(p);
 for(Fighter&p:s.p)if(p.act!=NONE)++p.age;
 if(--s.clock<=0||a.hp<=0||b.hp<=0){
  const int victor=a.hp==b.hp?-1:a.hp>b.hp?0:1;
  s.winner=victor;if(victor!=-1)++s.score[victor];
  s.over=s.score[0]==2||s.score[1]==2||s.round>=6;
  if(s.over&&s.score[0]<2&&s.score[1]<2)
   s.winner=s.score[0]==s.score[1]?-1:s.score[0]>s.score[1]?0:1;
  s.end=s.over?0:115;
 }
}
inline void output(const State&s,std::ostream&out){
 out<<std::setprecision(17)<<s.tick<<' '<<s.clock<<' '<<s.ready<<' '<<s.end
    <<' '<<s.round<<' '<<s.winner<<' '<<int(s.over)<<' '<<s.score[0]<<' '<<s.score[1];
 for(const Fighter&p:s.p)
  out<<' '<<p.x<<' '<<p.y<<' '<<p.vx<<' '<<p.vy<<' '<<p.dir<<' '<<int(p.weapon)
    <<' '<<p.hp<<' '<<p.st<<' '<<p.ammo<<' '<<p.bloodAmmo<<' '<<p.vials
    <<' '<<p.focus<<' '<<int(p.form)<<' '<<p.rally<<' '<<p.rallyLife
    <<' '<<p.exposed<<' '<<int(p.exposeCause)<<' '<<p.visceralTarget
    <<' '<<int(p.act)<<' '<<p.age<<' '<<int(p.spent)<<' '<<int(p.hitConfirmed)
    <<' '<<int(p.crouch)<<' '<<int(p.jumpHeld)<<' '<<p.jumps<<' '<<p.regen
    <<' '<<p.combo<<' '<<p.chain<<' '<<int(p.queue)<<' '<<p.queueLife;
 out<<'\n';
}
} // namespace sf_hunt
