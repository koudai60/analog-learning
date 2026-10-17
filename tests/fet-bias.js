import { test, assert, assertEqual, assertNear } from './test-harness.js';
import { solveFetBias, checkFetCandidate } from '../js/fet-models.js';
import { devices } from './fet-models.js';
const fixed=(voltageV)=>({kind:'fixed',voltageV});
const base={drainRailV:12,sourceRailV:0,drainOhm:1000,sourceOhm:500,gateBias:fixed(5)};
test('NMOS 源极负反馈2mA与18mA无效数学根',()=>{
  const q=solveFetBias(devices[0],base);assert(q.valid);assertNear(q.currentA,0.002,1e-12);assertNear(q.sourceV,1,1e-9);assertNear(q.drainV,10,1e-9);assertNear(q.gateSourceV,4,1e-9);assertNear(q.drainSourceV,9,1e-9);
  assertEqual(checkFetCandidate(devices[0],base,0.018).valid,false);
});
test('PMOS 负电源与高端正电源均按节点电位求解',()=>{
  const q=solveFetBias(devices[1],{...base,drainRailV:-12,gateBias:fixed(-5)});
  assert(q.valid);assertNear(q.currentA,-0.002,1e-12);assertNear(q.sourceV,-1,1e-9);assertNear(q.drainV,-10,1e-9);
  const high=solveFetBias(devices[1],{...base,sourceRailV:12,drainRailV:0,gateBias:fixed(7)});
  assert(high.valid);assertNear(high.sourceV,11,1e-9);assertNear(high.drainV,2,1e-9);assertNear(high.drainSourceV,-9,1e-9);
});
for(const i of [4,5])test(`JFET ${devices[i].channel} 自偏置物理根`,()=>{
  const s=i===4?1:-1;const q=solveFetBias(devices[i],{...base,drainRailV:s*12,sourceOhm:1000,gateBias:fixed(0)});
  assert(q.valid);assertNear(q.currentA,s*0.002,1e-12);assertNear(q.gateSourceV,-s*2,1e-9);assert(Math.abs(q.residualA)<=1e-12);
});
test('JFET 端点正偏不能掩盖区间内有效根',()=>{
  const q=solveFetBias(devices[4],{...base,sourceOhm:1000,gateBias:fixed(0.5)});
  assert(q.valid);assert(q.gateSourceV<0);assert(Math.abs(q.residualA)<=1e-12);assert(q.iterations<=100);
});
test('负载不足解出可变电阻区，截止与零电源边界有效',()=>{
  const q=solveFetBias(devices[0],{...base,drainRailV:1,sourceOhm:0,gateBias:fixed(4)});
  assert(q.valid);assertEqual(q.region,'ohmic');assert(q.currentA>0&&q.currentA<0.001);
  assertNear(solveFetBias(devices[0],{...base,gateBias:fixed(0)}).currentA,0,1e-12);
  const zero=solveFetBias(devices[0],{...base,drainRailV:0,gateBias:fixed(4)});assert(zero.valid);assertNear(zero.currentA,0,1e-12);
});
test('分压偏置与无有效域/非法电阻',()=>{
  const q=solveFetBias(devices[0],{...base,gateBias:{kind:'divider',upperV:10,lowerV:0,upperOhm:100000,lowerOhm:100000}});
  assert(q.valid);assertNear(q.currentA,0.002,1e-12);
  assertEqual(solveFetBias(devices[4],{...base,sourceOhm:0,gateBias:fixed(1)}).valid,false);
  for(const bad of [-1,NaN,Infinity]){let e;try{solveFetBias(devices[0],{...base,drainOhm:bad})}catch(x){e=x}assert(e instanceof RangeError);}
});
