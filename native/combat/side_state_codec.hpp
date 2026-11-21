#pragma once
// Deterministic, pointer-free native combat checkpoint encoding.
// Canonical little-endian v1 format; never serialize a C++ struct's padding,
// std::vector capacity, compiler-specific ABI, or host byte order.
// Offline replay/rollback prerequisite ONLY, not network trust or account auth.
#include <cstdint>
#include <cstring>
#include <cmath>
#include <vector>
#include <limits>
#include <type_traits>

namespace sf {
namespace codec {
constexpr uint32_t VERSION = 1;
constexpr std::size_t CHECKPOINT_SIZE = 228;
constexpr uint64_t FNV_OFFSET = UINT64_C(14695981039346656037);
constexpr uint64_t FNV_PRIME = UINT64_C(1099511628211);
inline void put_u32(std::vector<uint8_t>& out, uint32_t v){
 for(int i=0;i<4;i++)out.push_back(uint8_t(v>>(8*i)));
}
inline void put_i32(std::vector<uint8_t>& out,int32_t v){
 put_u32(out,uint32_t(v));
}
inline void put_u64(std::vector<uint8_t>& out,uint64_t v){
 for(int i=0;i<8;i++)out.push_back(uint8_t(v>>(8*i)));
}
inline void put_f64(std::vector<uint8_t>& out,double v){
 static_assert(sizeof(double)==8&&std::numeric_limits<double>::is_iec559,
  "Native deterministic rollback checkpoint requires IEEE 754 binary64");
 uint64_t bits=0;std::memcpy(&bits,&v,sizeof(bits));put_u64(out,bits);
}
inline uint32_t get_u32(const uint8_t *p,std::size_t& off){
 uint32_t value=0;
 for(int i=0;i<4;i++)value|=uint32_t(p[off++])<<(8*i);
 return value;
}
inline int32_t get_i32(const uint8_t *p,std::size_t& off){
 return int32_t(get_u32(p,off));
}
inline uint64_t get_u64(const uint8_t *p,std::size_t& off){
 uint64_t value=0;
 for(int i=0;i<8;i++)value|=uint64_t(p[off++])<<(8*i);
 return value;
}
inline double get_f64(const uint8_t *p,std::size_t& off){
 uint64_t bits=get_u64(p,off);double out;
 std::memcpy(&out,&bits,sizeof(out));
 return out;
}
inline uint64_t hash(const uint8_t *p,std::size_t size){
 uint64_t h=FNV_OFFSET;
 for(std::size_t i=0;i<size;i++){h^=p[i];h*=FNV_PRIME;}
 return h;
}
inline bool finite_between(double value,double low,double high){
 return std::isfinite(value)&&value>=low&&value<=high;
}
inline bool valid(const sf::State &s){
 if(s.tick<0 || s.tick>100000000 || s.clock<0 || s.clock>3900 ||
    s.ready<0 || s.ready>90 || s.end<0 || s.end>115 ||
    s.round<1 || s.round>6 || s.score[0]<0 || s.score[1]<0 ||
    s.score[0]>2 || s.score[1]>2 || s.winner<-2 || s.winner>1 ||
    s.over<0 || s.over>1)return false;
 for(const sf::Fighter& p:s.p){
  if(!finite_between(p.x,65.0,895.0) ||
     !finite_between(p.y,0.0,436.0) ||
     !finite_between(p.vx,-100,100) ||
     !finite_between(p.vy,-100,100) ||
     !finite_between(p.hp,0.0,100.0) ||
     !finite_between(p.st,0.0,100.0) ||
     (p.dir!=-1 && p.dir!=1) || p.ammo<0 || p.ammo>3 ||
     p.act<0 || p.act>7 || p.age<0 || p.age>2000 ||
     p.spent<0 || p.spent>1 || p.crouch<0 || p.crouch>1 ||
     p.jumpHeld<0 || p.jumpHeld>1 || p.guardAge<0 || p.guardAge>999 ||
     p.regen<0 || p.regen>60 || p.combo<0 || p.combo>10000)return false;
 }
 return true;
}
} // namespace codec

inline std::vector<uint8_t> save_checkpoint(const sf::State &s){
 if(!codec::valid(s))return {};
 std::vector<uint8_t> data;
 data.reserve(codec::CHECKPOINT_SIZE);
 data.push_back('S');data.push_back('F');data.push_back('S');data.push_back('1');
 codec::put_u32(data,codec::VERSION);
 codec::put_i32(data,s.tick);
 codec::put_i32(data,s.clock);
 codec::put_i32(data,s.ready);
 codec::put_i32(data,s.end);
 codec::put_i32(data,s.round);
 codec::put_i32(data,s.score[0]);
 codec::put_i32(data,s.score[1]);
 codec::put_i32(data,s.winner);
 codec::put_i32(data,s.over);
 for(const sf::Fighter& p:s.p){
  codec::put_f64(data,p.x);codec::put_f64(data,p.y);
  codec::put_f64(data,p.vx);codec::put_f64(data,p.vy);
  codec::put_i32(data,p.dir);
  codec::put_f64(data,p.hp);codec::put_f64(data,p.st);
  codec::put_i32(data,p.ammo);codec::put_i32(data,p.act);
  codec::put_i32(data,p.age);codec::put_i32(data,p.spent);
  codec::put_i32(data,p.crouch);codec::put_i32(data,p.jumpHeld);
  codec::put_i32(data,p.guardAge);codec::put_i32(data,p.regen);
  codec::put_i32(data,p.combo);
 }
 if(data.size()!=codec::CHECKPOINT_SIZE-8)return {};
 codec::put_u64(data,codec::hash(data.data(),data.size()));
 return data;
}

inline bool load_checkpoint(const uint8_t* bytes,std::size_t size,sf::State& out){
 if(bytes==nullptr||size!=codec::CHECKPOINT_SIZE ||
    bytes[0]!='S'||bytes[1]!='F'||bytes[2]!='S'||bytes[3]!='1')
  return false;
 std::size_t index=4;
 if(codec::get_u32(bytes,index)!=codec::VERSION)return false;
 if(codec::hash(bytes,size-8)!=
    (uint64_t(bytes[size-8]) |
     (uint64_t(bytes[size-7])<<8) |
     (uint64_t(bytes[size-6])<<16) |
     (uint64_t(bytes[size-5])<<24) |
     (uint64_t(bytes[size-4])<<32) |
     (uint64_t(bytes[size-3])<<40) |
     (uint64_t(bytes[size-2])<<48) |
     (uint64_t(bytes[size-1])<<56)))return false;
 sf::State restored;
 restored.tick=codec::get_i32(bytes,index);
 restored.clock=codec::get_i32(bytes,index);
 restored.ready=codec::get_i32(bytes,index);
 restored.end=codec::get_i32(bytes,index);
 restored.round=codec::get_i32(bytes,index);
 restored.score[0]=codec::get_i32(bytes,index);
 restored.score[1]=codec::get_i32(bytes,index);
 restored.winner=codec::get_i32(bytes,index);
 restored.over=codec::get_i32(bytes,index);
 for(sf::Fighter& p:restored.p){
  p.x=codec::get_f64(bytes,index);p.y=codec::get_f64(bytes,index);
  p.vx=codec::get_f64(bytes,index);p.vy=codec::get_f64(bytes,index);
  p.dir=codec::get_i32(bytes,index);
  p.hp=codec::get_f64(bytes,index);p.st=codec::get_f64(bytes,index);
  p.ammo=codec::get_i32(bytes,index);p.act=codec::get_i32(bytes,index);
  p.age=codec::get_i32(bytes,index);p.spent=codec::get_i32(bytes,index);
  p.crouch=codec::get_i32(bytes,index);p.jumpHeld=codec::get_i32(bytes,index);
  p.guardAge=codec::get_i32(bytes,index);p.regen=codec::get_i32(bytes,index);
  p.combo=codec::get_i32(bytes,index);
 }
 if(index!=size-8||!codec::valid(restored))return false;
 out=restored;
 return true;
}
} // namespace sf
