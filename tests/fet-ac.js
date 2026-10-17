import { test, assert, assertEqual, assertNear } from './test-harness.js';
import { calculateCommonSource } from '../js/fet-models.js';
const q={valid:true,region:'constant-current',boundary:false,gmS:0.002};
const ac={drainOhm:2000,loadOhm:2000,gateOhms:[1e6,1e6],sourceAcOhm:0,signalSourceOhm:0};
test('共源旁路增益、输入和去负载输出电阻',()=>{
  const r=calculateCommonSource(q,ac);assert(r.valid);assertNear(r.gain,-2,1e-12);assertNear(r.inputOhm,500000,1e-9);assertNear(r.outputOhm,2000,1e-9);
});
test('未旁路负反馈、无RL与信号源增益不混用',()=>{
  assertNear(calculateCommonSource(q,{...ac,sourceAcOhm:500}).gain,-1,1e-12);
  assertNear(calculateCommonSource(q,{...ac,loadOhm:null}).gain,-4,1e-12);
  assertNear(calculateCommonSource(q,{...ac,signalSourceOhm:500000}).sourceGain,-1,1e-12);
});
test('非恒流区/边界/无效Q拒绝小信号公式',()=>{
  for(const invalid of [{...q,valid:false},{...q,region:'cutoff'},{...q,region:'ohmic'},{...q,boundary:true}])assertEqual(calculateCommonSource(invalid,ac).valid,false);
});
test('非法交流电阻不可参与计算',()=>{
  for(const bad of [{...ac,loadOhm:0},{...ac,sourceAcOhm:-1},{...ac,gateOhms:[]},{...ac,drainOhm:Infinity}]){let e;try{calculateCommonSource(q,bad)}catch(x){e=x}assert(e instanceof RangeError);}
});
