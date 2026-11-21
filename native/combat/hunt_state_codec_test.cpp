#include "hunt_state_codec.hpp"
#include <cassert>
#include <iostream>
#include <sstream>
#include <limits>
#include <array>
#include <vector>
bool same(const sf_hunt::State&a,const sf_hunt::State&b){
 std::ostringstream x,y;sf_hunt::output(a,x);sf_hunt::output(b,y);
 return x.str()==y.str();
}
int main(){
 using namespace sf_hunt;
 static_assert(codec::CHECKPOINT_SIZE==348,"Hunt v3 v1 checkpoint ABI mismatch");
 std::size_t passes=0;
 for(int w0=0;w0<2;w0++)for(int w1=0;w1<2;w1++){
  State current(static_cast<Weapon>(w0),static_cast<Weapon>(w1));
  std::vector<std::array<Input,2>> trace;
  std::vector<uint8_t> checkpoint;
  for(int k=0;k<1800;k++){
   Input a,b;
   if(k>89){
    a.x=k%61<19?1:k%61>47?-1:0;
    b.x=k%67<19?-1:k%67>49?1:0;
    a.y=k%123==25?-1:0;b.y=k%131==22?-1:0;
    a.act=k%87==26?FIRE:k%61==17?LIGHT:k%79==42?TRICK:
          k%97==43?BLOOD_INPUT:NOTHING;
    b.act=k%73==17?HEAVY:k%101==13?QUICKSTEP:
          k%97==14?HEAL_INPUT:NOTHING;
   }
   trace.push_back({a,b});step(current,a,b);
   const auto bytes=save_checkpoint(current);
   if(bytes.size()!=348)return 1;
   State roundtrip;
   if(!load_checkpoint(bytes.data(),bytes.size(),roundtrip)||!same(current,roundtrip))return 2;
   if(k==899)checkpoint=bytes;
   if(k%257==0){
    auto flipped=bytes;flipped[35]^=1;
    State unchanged=current;
    if(load_checkpoint(flipped.data(),flipped.size(),unchanged)||
       !same(unchanged,current))return 3;
    flipped=bytes;flipped[0]='X';
    if(load_checkpoint(flipped.data(),flipped.size(),unchanged))return 4;
    flipped=bytes;flipped[4]^=1;
    if(load_checkpoint(flipped.data(),flipped.size(),unchanged))return 5;
    if(load_checkpoint(bytes.data(),bytes.size()-1,unchanged))return 6;
   }
   passes++;
  }
  State replay;
  if(!load_checkpoint(checkpoint.data(),checkpoint.size(),replay)||replay.tick!=900)return 7;
  for(int k=900;k<1800;k++)step(replay,trace[k][0],trace[k][1]);
  if(!same(replay,current))return 8;
 }
 State invalid;invalid.p[0].hp=std::numeric_limits<double>::quiet_NaN();
 if(!save_checkpoint(invalid).empty())return 9;
 State blocked;const auto old=save_checkpoint(blocked);
 step(blocked,Input{0,0,NOTHING,true},Input{});
 if(save_checkpoint(blocked)!=old)return 10;
 std::cout<<"NATIVE_HUNT_V3_CANONICAL_CODEC_PASS size=348 ticks="
  <<passes<<" weapons=4 verified_no_exception=1 codec_version=2\n";
 return 0;
}
