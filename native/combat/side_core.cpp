#include <array>
#include <algorithm>
#include <cmath>
#include <iomanip>
#include <iostream>
#include <string>
#include <sstream>

namespace sf {
constexpr int W=960, FLOOR=436, HZ=60;
enum Move{NONE=0,CUT=1,HEW=2,SHOT=3,STEP=4,FEINT=5,STUN=6,GUARD_BREAK=7};
struct Spec {int startup,active,recovery,cost,reach,damage,top,bottom;};
constexpr Spec MOVES[8]={{0,0,0,0,0,0,0,0},{9,5,15,16,97,19,-104,-29},
 {21,7,24,31,126,34,-119,-32},{9,1,25,24,268,10,-112,-72},
 {0,9,12,20,0,0,0,0},{0,0,14,0,0,0,0,0},
 {0,0,22,0,0,0,0,0},{0,0,28,0,0,0,0,0}};
struct Input {int x=0,y=0,act=NONE,guard=0;};
struct Fighter {
 double x=0,y=FLOOR,vx=0,vy=0,hp=100,st=100;
 int dir=1,ammo=3,act=NONE,age=0,spent=0,crouch=0,jumpHeld=0,guardAge=0,regen=0,combo=0;
};
struct State {
 int tick=0,clock=65*HZ,ready=90,end=0,round=1,score[2]={0,0},winner=-2,over=0;
 Fighter p[2];
 State(){p[0].x=255;p[1].x=705;p[1].dir=-1;}
};
template<class T> T clamp(T n,T low,T high){return std::min(high,std::max(low,n));}
bool canAct(const Fighter&p){return p.act==NONE || p.age>=MOVES[p.act].startup+MOVES[p.act].active+MOVES[p.act].recovery;}
bool canFeint(const Fighter&p){return p.act==HEW && p.age>=5 && p.age<15 && p.st>=8;}
void drive(Fighter&p,const Fighter&q,const Input&i){
 const int x=(i.x==1?1:i.x==-1?-1:0);
 const bool jump=i.y==-1,crouch=i.y==1,ground=p.y>=FLOOR;
 const int act=i.act>=CUT && i.act<=GUARD_BREAK?i.act:NONE;
 if(canAct(p)){p.act=NONE;p.age=0;}
 if(act==FEINT && canFeint(p)){p.act=FEINT;p.age=0;p.st-=8;p.regen=28;p.spent=0;}
 if(p.act==NONE)p.dir=q.x>=p.x?1:-1;
 p.crouch=ground&&crouch&&p.act==NONE;
 if(p.act==NONE && jump && !p.jumpHeld && ground){p.vy=-12.6;p.y-=.01;p.crouch=0;}
 p.jumpHeld=jump;
 const bool guarding=i.guard && ground && p.act==NONE && !jump && !p.crouch && p.st>=3;
 p.guardAge=guarding?std::min(p.guardAge+1,999):0;
 if(guarding){p.st=std::max(0.0,p.st-.18);p.regen=8;}
 if(p.act==NONE && !guarding && act>=CUT && act<=GUARD_BREAK &&
    act!=FEINT && act!=STUN && act!=GUARD_BREAK && p.st>=MOVES[act].cost &&
    (act!=SHOT || p.ammo>0)){
  p.act=act;p.age=0;p.spent=0;p.crouch=0;p.guardAge=0;
  p.st-=MOVES[act].cost;p.regen=30;
  if(act==SHOT)p.ammo--;
  if(act==STEP)p.vx=(x?x:-p.dir)*10.1;
 }
 if(p.act==STEP)p.vx*=.89;
 else if(p.act!=NONE){
  p.vx*=.65;
  const Spec&m=MOVES[p.act];
  if(m.damage && p.age==m.startup-1)p.vx=p.dir*(p.act==HEW?5.2:3.2);
 }else{
  const double speed=guarding?0:p.crouch?1.05:ground?3.7:3;
  p.vx+=(x*speed-p.vx)*(ground?.33:.15);
 }
 p.x=clamp(p.x+p.vx,65.0,double(W-65));
 if(p.y<FLOOR || p.vy<0){
  p.vy=std::min(15.0,p.vy+.75);
  p.y=std::min(double(FLOOR),p.y+p.vy);
  if(p.y==FLOOR)p.vy=0;
 }else{p.y=FLOOR;p.vy=0;}
 if(p.regen)p.regen--;
 else if(p.act==NONE && !guarding)p.st=std::min(100.0,p.st+.67);
}
bool strike(const Fighter&p,const Fighter&q){
 const Spec&m=MOVES[p.act];
 if(!m.damage||p.spent||p.age<m.startup||p.age>=m.startup+m.active)return false;
 if(q.act==STEP && q.age>=1 && q.age<8)return false;
 double left=p.dir>0?p.x+8:p.x-m.reach,right=p.dir>0?p.x+m.reach:p.x-8;
 double top=p.y+m.top,bottom=p.y+m.bottom;
 double hleft=q.x-18,hright=q.x+18,htop=q.y-(q.crouch?58:111),hbottom=q.y-8;
 return left<hright && right>hleft && top<hbottom && bottom>htop;
}
void hit(State&s,int attacker,int target,int move){
 Fighter&a=s.p[attacker],&b=s.p[target];const Spec&m=MOVES[move];
 a.spent=1;
 const bool guarding=b.guardAge>0 && b.dir==-a.dir && b.y==FLOOR;
 const bool parry=guarding && b.guardAge<=4 && b.st>=10;
 if(parry){a.act=STUN;a.age=0;a.vx=-a.dir*4.5;b.st=std::min(100.0,b.st+6);b.regen=15;return;}
 double damage=m.damage;
 if(guarding){
  damage=std::min(4.0,std::ceil(damage*.1));
  b.st=std::max(0.0,b.st-(m.damage>=30?22:13));b.regen=22;
  if(b.st==0){b.act=GUARD_BREAK;b.age=0;b.guardAge=0;}
 }else{
  const int combo=b.act==STUN?b.combo+1:1;
  damage=std::max(5.0,std::ceil(damage*std::max(.55,1-.12*(combo-1))));
  b.combo=combo;b.act=STUN;b.age=0;b.crouch=0;b.guardAge=0;
  b.vx=a.dir*(move==HEW?6.8:4.5);
 }
 b.hp=std::max(0.0,b.hp-damage);
}
void step(State&s,const Input&in0,const Input&in1){
 s.tick++;
 if(s.over)return;
 if(s.end){
  if(!--s.end){s.p[0]=Fighter{};s.p[1]=Fighter{};s.p[0].x=255;s.p[1].x=705;s.p[1].dir=-1;
   s.clock=65*HZ;s.ready=90;s.round++;s.winner=-2;}
  return;
 }
 if(s.ready){s.ready--;return;}
 Fighter&a=s.p[0],&b=s.p[1];
 drive(a,b,in0);drive(b,a,in1);
 if(std::abs(a.y-b.y)<55 && std::abs(a.x-b.x)<38){
  const int dir=a.x<=b.x?-1:1;
  const double d=(38-std::abs(a.x-b.x))/2;
  a.x=clamp(a.x+dir*d,65.0,double(W-65));
  b.x=clamp(b.x-dir*d,65.0,double(W-65));
 }
 // Both strikes are decided before any stun or guard break mutates either fighter.
 const bool hits[2]={strike(a,b),strike(b,a)};
 const int names[2]={a.act,b.act};
 for(int i=0;i<2;i++)if(hits[i])hit(s,i,1-i,names[i]);
 for(Fighter&p:s.p)if(p.act!=NONE)p.age++;
 if(--s.clock<=0 || a.hp==0 || b.hp==0){
  const int winner=a.hp==b.hp?-1:a.hp>b.hp?0:1;
  s.winner=winner;if(winner!=-1)s.score[winner]++;
  s.over=s.score[0]==2 || s.score[1]==2 || s.round>=6;
  if(s.over && s.score[0]<2 && s.score[1]<2)
   s.winner=s.score[0]==s.score[1]?-1:s.score[0]>s.score[1]?0:1;
  s.end=s.over?0:115;
 }
}
void output(const State&s){
 std::cout<<std::setprecision(17)<<s.tick<<' '<<s.clock<<' '<<s.ready<<' '<<s.end<<' '<<s.round<<' '
  <<s.score[0]<<' '<<s.score[1]<<' '<<s.winner<<' '<<s.over;
 for(const Fighter&p:s.p)
  std::cout<<' '<<p.x<<' '<<p.y<<' '<<p.vx<<' '<<p.vy<<' '<<p.dir<<' '<<p.hp<<' '<<p.st<<' '
   <<p.ammo<<' '<<p.act<<' '<<p.age<<' '<<p.spent<<' '<<p.crouch<<' '<<p.jumpHeld<<' '
   <<p.guardAge<<' '<<p.regen<<' '<<p.combo;
 std::cout<<'\n';
}
}
int main(){
 using namespace sf;
 State s;
 Input a,b;
 while(std::cin>>a.x>>a.y>>a.act>>a.guard>>b.x>>b.y>>b.act>>b.guard){
  step(s,a,b);output(s);
 }
 return std::cin.eof()?0:2;
}
