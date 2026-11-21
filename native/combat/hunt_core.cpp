#include "hunt_core.hpp"
#include <iostream>
#include <vector>
#include <sstream>
#include <array>
int main(){
 using namespace sf_hunt;
 int first=0,second=0;
 if(!(std::cin>>first>>second)||first<0||first>1||second<0||second>1)return 2;
 State s(static_cast<Weapon>(first),static_cast<Weapon>(second));
 std::vector<State> checkpoints;
 std::vector<std::array<Input,2>> commands;
 int x0,y0,a0,g0,x1,y1,a1,g1;
 std::size_t rewinds=0;
 while(std::cin>>x0>>y0>>a0>>g0>>x1>>y1>>a1>>g1){
  const Input a{x0,y0,static_cast<Request>(a0),g0!=0},
              b{x1,y1,static_cast<Request>(a1),g1!=0};
  try{step(s,a,b);}catch(const std::exception&e){std::cerr<<e.what()<<'\n';return 3;}
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
