#pragma once
// Stable, little-endian sf-hunt-lab/3 snapshots. Does not serialize C++ ABI,
// padding, pointers, animation/renderer state or untrusted remote identities.
// Checksum is only corruption detection, NOT cryptographic authentication.
#include "hunt_core.hpp"
#include <cstdint>
#include <cstring>
#include <cmath>
#include <limits>
#include <vector>
namespace sf_hunt {
namespace codec {
constexpr uint32_t VERSION=2; // No crouch/duck semantics; reject old snapshot version.
constexpr std::size_t CHECKPOINT_SIZE=348, PAYLOAD_END=340;
constexpr uint64_t FNV_OFFSET=UINT64_C(14695981039346656037);
constexpr uint64_t FNV_PRIME=UINT64_C(1099511628211);
inline void put_u32(std::vector<uint8_t>&v,uint32_t n){
 for(int k=0;k<4;k++)v.push_back(uint8_t(n>>(k*8)));
}
inline void put_i32(std::vector<uint8_t>&v,int32_t n){put_u32(v,uint32_t(n));}
inline void put_u64(std::vector<uint8_t>&v,uint64_t n){
 for(int k=0;k<8;k++)v.push_back(uint8_t(n>>(k*8)));
}
inline void put_f64(std::vector<uint8_t>&v,double n){
 static_assert(sizeof(double)==8&&std::numeric_limits<double>::is_iec559,
  "Hunt v3 rollback state must use IEEE 754 binary64");
 uint64_t bits=0;std::memcpy(&bits,&n,8);put_u64(v,bits);
}
inline uint32_t get_u32(const uint8_t*p,std::size_t&at){
 uint32_t n=0;for(int k=0;k<4;k++)n|=uint32_t(p[at++])<<(k*8);return n;
}
inline int32_t get_i32(const uint8_t*p,std::size_t&at){
 const uint32_t n=get_u32(p,at);
 return n<=INT32_MAX?static_cast<int32_t>(n):
   static_cast<int32_t>(static_cast<int64_t>(n)-INT64_C(4294967296));
}
inline uint64_t get_u64(const uint8_t*p,std::size_t&at){
 uint64_t n=0;for(int k=0;k<8;k++)n|=uint64_t(p[at++])<<(k*8);return n;
}
inline double get_f64(const uint8_t*p,std::size_t&at){
 const uint64_t bits=get_u64(p,at);double n=0;std::memcpy(&n,&bits,8);return n;
}
inline uint64_t hash(const uint8_t*p,std::size_t size){
 uint64_t n=FNV_OFFSET;for(std::size_t k=0;k<size;k++){n^=p[k];n*=FNV_PRIME;}return n;
}
inline bool bounded(double v,double low,double high){
 return std::isfinite(v)&&v>=low&&v<=high;
}
inline bool valid(const State&s){
 if(s.tick<0||s.tick>100000000||s.clock<0||s.clock>3900||
    s.ready<0||s.ready>90||s.end<0||s.end>115||s.round<1||s.round>6||
    s.winner<-2||s.winner>1||s.score[0]<0||s.score[0]>2||
    s.score[1]<0||s.score[1]>2)return false;
 for(const Fighter&p:s.p){
  if(!bounded(p.x,65,895)||!bounded(p.y,-500,436)||
     !bounded(p.vx,-100,100)||!bounded(p.vy,-100,100)||
     !bounded(p.hp,0,100)||!bounded(p.st,0,100)||
     !bounded(p.rally,0,100)||(p.dir!=1&&p.dir!=-1)||
     p.weapon<MOURNWEAVE||p.weapon>THORNWAKE||
     p.ammo<0||p.ammo>7||p.bloodAmmo<0||p.bloodAmmo>5||
     p.vials<0||p.vials>2||p.focus<0||p.focus>100||
     p.form<FOLDED||p.form>UNFURLED||
     p.rallyLife<0||p.rallyLife>100||p.exposed<0||p.exposed>40||
     p.exposeCause<NO_CAUSE||p.exposeCause>CHARGED_REAR||
     p.visceralTarget<-1||p.visceralTarget>1||p.act<NONE||p.act>=COUNT||
     p.age<0||p.age>2000||p.jumps<0||p.jumps>1||
     p.regen<0||p.regen>100||p.combo<0||p.combo>10000||
     p.chain<0||p.chain>5||p.crouch||p.queue<NOTHING||p.queue>BLOOD_INPUT||
     p.queueLife<0||p.queueLife>6)return false;
 }
 return true;
}
} // namespace codec

inline std::vector<uint8_t> save_checkpoint(const State&s){
 if(!codec::valid(s))return {};
 std::vector<uint8_t> v;
 v.reserve(codec::CHECKPOINT_SIZE);
 for(const char c:{'S','F','H','3'})v.push_back(uint8_t(c));
 codec::put_u32(v,codec::VERSION);
 for(const int n:{s.tick,s.clock,s.ready,s.end,s.round,s.winner,
     s.over?1:0,s.score[0],s.score[1]})codec::put_i32(v,n);
 for(const Fighter&p:s.p){
  codec::put_f64(v,p.x);codec::put_f64(v,p.y);
  codec::put_f64(v,p.vx);codec::put_f64(v,p.vy);
  codec::put_i32(v,p.dir);codec::put_i32(v,int(p.weapon));
  codec::put_f64(v,p.hp);codec::put_f64(v,p.st);
  for(const int n:{p.ammo,p.bloodAmmo,p.vials,p.focus,int(p.form)})
   codec::put_i32(v,n);
  codec::put_f64(v,p.rally);
  for(const int n:{p.rallyLife,p.exposed,int(p.exposeCause),p.visceralTarget,
      int(p.act),p.age,p.spent?1:0,p.hitConfirmed?1:0,p.crouch?1:0,
      p.jumpHeld?1:0,p.jumps,p.regen,p.combo,p.chain,int(p.queue),p.queueLife})
   codec::put_i32(v,n);
 }
 if(v.size()!=codec::PAYLOAD_END)return {};
 codec::put_u64(v,codec::hash(v.data(),v.size()));
 return v;
}
inline bool load_checkpoint(const uint8_t*p,std::size_t size,State&out){
 if(p==nullptr||size!=codec::CHECKPOINT_SIZE||
    p[0]!='S'||p[1]!='F'||p[2]!='H'||p[3]!='3')return false;
 std::size_t at=4;
 if(codec::get_u32(p,at)!=codec::VERSION)return false;
 std::size_t trailer=codec::PAYLOAD_END;
 if(codec::get_u64(p,trailer)!=codec::hash(p,codec::PAYLOAD_END))return false;
 State parsed;
 parsed.tick=codec::get_i32(p,at);parsed.clock=codec::get_i32(p,at);
 parsed.ready=codec::get_i32(p,at);parsed.end=codec::get_i32(p,at);
 parsed.round=codec::get_i32(p,at);parsed.winner=codec::get_i32(p,at);
 const int over=codec::get_i32(p,at);
 parsed.score[0]=codec::get_i32(p,at);parsed.score[1]=codec::get_i32(p,at);
 if(over!=0&&over!=1)return false;
 parsed.over=over==1;
 for(Fighter&f:parsed.p){
  f.x=codec::get_f64(p,at);f.y=codec::get_f64(p,at);
  f.vx=codec::get_f64(p,at);f.vy=codec::get_f64(p,at);
  f.dir=codec::get_i32(p,at);
  f.weapon=static_cast<Weapon>(codec::get_i32(p,at));
  f.hp=codec::get_f64(p,at);f.st=codec::get_f64(p,at);
  f.ammo=codec::get_i32(p,at);f.bloodAmmo=codec::get_i32(p,at);
  f.vials=codec::get_i32(p,at);f.focus=codec::get_i32(p,at);
  f.form=static_cast<Form>(codec::get_i32(p,at));
  f.rally=codec::get_f64(p,at);
  f.rallyLife=codec::get_i32(p,at);f.exposed=codec::get_i32(p,at);
  f.exposeCause=static_cast<Cause>(codec::get_i32(p,at));
  f.visceralTarget=codec::get_i32(p,at);
  f.act=static_cast<Action>(codec::get_i32(p,at));
  f.age=codec::get_i32(p,at);
  const int spent=codec::get_i32(p,at),confirmed=codec::get_i32(p,at),
            crouch=codec::get_i32(p,at),held=codec::get_i32(p,at);
  if((spent!=0&&spent!=1)||(confirmed!=0&&confirmed!=1)||
     (crouch!=0&&crouch!=1)||(held!=0&&held!=1))return false;
  f.spent=spent==1;f.hitConfirmed=confirmed==1;
  f.crouch=crouch==1;f.jumpHeld=held==1;
  f.jumps=codec::get_i32(p,at);f.regen=codec::get_i32(p,at);
  f.combo=codec::get_i32(p,at);f.chain=codec::get_i32(p,at);
  f.queue=static_cast<Request>(codec::get_i32(p,at));
  f.queueLife=codec::get_i32(p,at);
 }
 if(at!=codec::PAYLOAD_END||!codec::valid(parsed))return false;
 out=parsed;return true;
}
} // namespace sf_hunt
