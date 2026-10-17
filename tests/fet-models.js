import { test, assert, assertEqual, assertNear } from './test-harness.js';
import { classifyFet } from '../js/fet-models.js';

export const devices = [
  {kind:'emos',channel:'n',thresholdV:2,coefficientAperV2:0.0005},
  {kind:'emos',channel:'p',thresholdV:-2,coefficientAperV2:0.0005},
  {kind:'dmos',channel:'n',thresholdV:-2,coefficientAperV2:0.0005},
  {kind:'dmos',channel:'p',thresholdV:2,coefficientAperV2:0.0005},
  {kind:'jfet',channel:'n',cutoffV:-4,idssA:0.008},
  {kind:'jfet',channel:'p',cutoffV:4,idssA:0.008}
];
for (const d of devices) {
  const s=d.channel==='n'?1:-1;
  const gate=d.kind==='emos'?4:d.kind==='dmos'?0:-2;
  test(`${d.kind}-${d.channel} 恒流区带符号电流与跨导`,()=>{
    const r=classifyFet(d,{gateSourceV:s*gate,drainSourceV:s*8});
    assert(r.valid);assertEqual(r.region,'constant-current');
    assertNear(r.currentA,s*0.002,1e-12);assertNear(r.currentMagnitudeA,0.002,1e-12);assertNear(r.gmS,0.002,1e-12);
  });
  test(`${d.kind}-${d.channel} 截止、开启和恒流区边界`,()=>{
    const t=d.kind==='emos'?2:d.kind==='dmos'?-2:-4;
    const cutoff=classifyFet(d,{gateSourceV:s*t,drainSourceV:s*8});
    assertEqual(cutoff.region,'cutoff');assertEqual(cutoff.currentA,0);assert(cutoff.boundary);
    const b=classifyFet(d,{gateSourceV:s*gate,drainSourceV:s*2});
    assertEqual(b.region,'constant-current');assert(b.boundary);
    const below=classifyFet(d,{gateSourceV:s*gate,drainSourceV:s*(2-1e-6)});
    assertEqual(below.region,'ohmic');assertNear(below.currentMagnitudeA,0.002,1e-9);assertEqual(below.gmS,null);
  });
  test(`${d.kind}-${d.channel} 可变电阻区与反向漏源限制`,()=>{
    const r=classifyFet(d,{gateSourceV:s*gate,drainSourceV:s});
    assertEqual(r.region,'ohmic');assertNear(r.currentA,s*0.0015,1e-12);
    assertEqual(classifyFet(d,{gateSourceV:s*gate,drainSourceV:-s}).valid,false);
    assertNear(classifyFet(d,{gateSourceV:s*gate,drainSourceV:0}).currentA,0,1e-12);
  });
}
test('JFET 零栅偏是 IDSS、正向栅偏超出模型',()=>{
  assertNear(classifyFet(devices[4],{gateSourceV:0,drainSourceV:8}).currentA,0.008,1e-12);
  assertEqual(classifyFet(devices[4],{gateSourceV:0.1,drainSourceV:8}).valid,false);
  assertEqual(classifyFet(devices[5],{gateSourceV:-0.1,drainSourceV:-8}).valid,false);
});
test('模型参数、结构及有限电压校验',()=>{
  for(const [d,v] of [[{...devices[0],thresholdV:-2},{gateSourceV:4,drainSourceV:8}],[{...devices[0],coefficientAperV2:0},{gateSourceV:4,drainSourceV:8}],[{...devices[4],idssA:NaN},{gateSourceV:0,drainSourceV:8}],[devices[0],{gateSourceV:Infinity,drainSourceV:8}],[{kind:'unknown',channel:'n'},{}]]){
    let e;try{classifyFet(d,v)}catch(x){e=x}assert(e instanceof RangeError);
  }
});
