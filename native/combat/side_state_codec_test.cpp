// Portable self-contained native checkpoint verification; no Godot runtime.
#define SF_NO_CLI_MAIN 1
#include "side_core.cpp"
#include "side_state_codec.hpp"
#include <iostream>
#include <array>
#include <vector>
#include <cstring>

int main(){
 using namespace sf;
 State s;
 const auto init=save_checkpoint(s);
 if(init.size()!=codec::CHECKPOINT_SIZE){
  std::cerr<<"INITIAL_SNAPSHOT_NOT_CANONICAL\n";return 1;
 }
 State recovered;
 if(!load_checkpoint(init.data(),init.size(),recovered) || !sameState(s,recovered)){
  std::cerr<<"INITIAL_CHECKPOINT_ROUND_TRIP_FAILED\n";return 2;
 }
 // Seeded, deterministic move history exercises parries, feints, stamina,
 // rounds, jump and timer behavior without requiring wall-clock networking.
 uint32_t seed=0x72a44b51;
 const auto random=[&seed](){
  seed=seed*1664525u+1013904223u;
  return seed;
 };
 std::vector<std::array<Input,2>> history;
 std::vector<uint8_t> saved;
 State canonical_checkpoint;
 const int total=3600;
 for(int n=0;n<total;n++){
  std::array<Input,2> inputs;
  for(int side=0;side<2;side++){
   Input& i=inputs[side];
   uint32_t a=random(),b=random();
   i.x=(a%5)==0?-1:(a%5)==1?1:0;
   i.y=(b%40)==0?-1:(b%40)==1?1:0;
   i.guard=(random()%11)==0;
   i.act=(random()%29)==0?CUT:(random()%29)==1?HEW:
    (random()%29)==2?SHOT:(random()%29)==3?STEP:
    (random()%29)==4?FEINT:NONE;
  }
  history.push_back(inputs);
  step(s,inputs[0],inputs[1]);
  const auto bytes=save_checkpoint(s);
  if(bytes.size()!=codec::CHECKPOINT_SIZE){
   std::cerr<<"FAILED_NATIVE_STATE_VALIDATION tick="<<s.tick<<'\n';return 3;
  }
  State round_trip;
  if(!load_checkpoint(bytes.data(),bytes.size(),round_trip)||
     !sameState(s,round_trip)){
   std::cerr<<"CHECKPOINT_DIVERGENCE tick="<<s.tick<<'\n';return 4;
  }
  if(n==1800){saved=bytes;canonical_checkpoint=s;}
 }
 // Replay the exact historical frame inputs after a 1,799-frame seek.
 State replay;
 if(!load_checkpoint(saved.data(),saved.size(),replay)||
    !sameState(replay,canonical_checkpoint))return 5;
 for(int i=1801;i<total;i++)
  step(replay,history[i][0],history[i][1]);
 if(!sameState(s,replay)){
  std::cerr<<"CHECKPOINT_REPLAY_DIVERGENCE\n";return 6;
 }
 auto corruption=saved;
 corruption[60]^=0x20;
 State untouched=s;
 if(load_checkpoint(corruption.data(),corruption.size(),untouched)||
    !sameState(s,untouched)){
  std::cerr<<"CHECKSUM_BYPASS_OR_MUTATED_FAILURE\n";return 7;
 }
 corruption=saved;
 corruption[0]='X';
 if(load_checkpoint(corruption.data(),corruption.size(),untouched)){
  std::cerr<<"MAGIC_BYPASS\n";return 8;
 }
 corruption=saved;
 corruption[4]=2; // unsupported codec version
 if(load_checkpoint(corruption.data(),corruption.size(),untouched)){
  std::cerr<<"UNKNOWN_VERSION_ACCEPTED\n";return 9;
 }
 if(load_checkpoint(saved.data(),saved.size()-1,untouched)){
  std::cerr<<"TRUNCATION_ACCEPTED\n";return 10;
 }
 if(load_checkpoint(nullptr,codec::CHECKPOINT_SIZE,untouched)){
  std::cerr<<"NULL_BUFFER_ACCEPTED\n";return 11;
 }
 State nan_state=s;
 nan_state.p[0].vx=std::numeric_limits<double>::quiet_NaN();
 if(!save_checkpoint(nan_state).empty()){
  std::cerr<<"NONFINITE_SNAPSHOT_ACCEPTED\n";return 12;
 }
 State bad=s;
 bad.p[0].act=99;
 if(!save_checkpoint(bad).empty()){
  std::cerr<<"ENGINE_ENUM_OUT_OF_RANGE_ACCEPTED\n";return 13;
 }
 std::cout<<"CANONICAL_CPP_CHECKPOINT_PASSED ticks="<<total
  <<" checkpointBytes="<<saved.size()
  <<" replayFrames="<<total-1801
  <<" validation=magic/version/hash/length/nonfinite/enum\n";
 return 0;
}
