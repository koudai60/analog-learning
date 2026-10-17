import { test, assert, assertEqual, assertNear } from './test-harness.js';
import { fetCatalog, fetCombinations } from '../js/fet-content.js';
import { solveFetBias, calculateCommonSource } from '../js/fet-models.js';
import { fetCircuitMarkup } from '../js/fet-circuits.js';
test('六组合有12例题18检验题且全部题目ID唯一',()=>{
  assertEqual(fetCombinations.length,6);assertEqual(fetCatalog.examples.length,12);assertEqual(fetCatalog.questions.length,18);
  assertEqual(new Set([...fetCatalog.examples,...fetCatalog.questions].map(q=>q.id)).size,30);
  for(const c of fetCombinations){const ex=fetCatalog.examples.filter(q=>q.combinationId===c.id),qs=fetCatalog.questions.filter(q=>q.combinationId===c.id);assertEqual(ex.length,2);assertEqual(qs.length,3);assert(ex.some(q=>q.mode==='dc')&&ex.some(q=>q.mode==='ac'));assert(c.sections.length>=4);assert(c.sections.every(s=>s.text.length>30));}
});
test('题设、方向、电路、解析、来源与检验分步规则完整',()=>{
  assertEqual(fetCatalog.questions.length,18);
  for(const q of [...fetCatalog.examples,...fetCatalog.questions]){assert(q.prompt.length>30);assert(q.device&&q.circuit&&q.sourceRefs.length>0);assert(q.assumptions.includes('D→S'));assert(q.solution.length>=3);assert(q.learningDecision);}
  for(const q of fetCatalog.questions){assertEqual(q.hints.length,3);assert(q.steps.length>=3);assertEqual(new Set(q.steps.map(s=>s.id)).size,q.steps.length);assert(q.steps.some(s=>s.type==='choice'));for(const s of q.steps){if(s.type==='numeric'){assert(Number.isFinite(s.expectedSI));assert(s.allowedUnits.length);assert(s.relativeTolerance===0.01);assert(s.absoluteToleranceSI>0);}else assert(s.options.some(o=>o.id===s.correctOptionId));}}
});
test('题库手算Q点与独立器件求解一致（包括不可适用情境）',()=>{
  assertEqual(fetCatalog.examples.length,12);
  for(const q of [...fetCatalog.examples,...fetCatalog.questions]){
    const actual=solveFetBias(q.device,q.circuit);
    if(q.expectedQ.valid===false){assertEqual(actual.valid,false);continue;}
    assert(actual.valid,`${q.id}无有效Q`);assertNear(actual.currentA,q.expectedQ.currentA,2e-12);assertNear(actual.drainSourceV,q.expectedQ.drainSourceV,3e-8);
    if(q.ac){const ac=calculateCommonSource(actual,q.ac);assert(ac.valid,q.id);assertNear(ac.gain,q.expectedAc.gain,1e-8);assertNear(ac.inputOhm,q.expectedAc.inputOhm,1e-6);assertNear(ac.outputOhm,q.expectedAc.outputOhm,1e-6);}
  }
});
test('检验题学习决策不同于对应例题，且P沟道不是N标签别名',()=>{
  assertEqual(fetCombinations.length,6);
  for(const c of fetCombinations){const examples=fetCatalog.examples.filter(q=>q.combinationId===c.id);for(const q of fetCatalog.questions.filter(q=>q.combinationId===c.id))assert(!examples.some(e=>e.learningDecision===q.learningDecision));}
  for(const c of fetCombinations.filter(c=>c.device.channel==='p'))assert(fetCatalog.questions.some(q=>q.combinationId===c.id&&q.circuit.sourceRailV>0));
});
test('所有原创电路具备唯一可访问ID、真实参数与旁路说明',()=>{
  for(const q of [...fetCatalog.examples,...fetCatalog.questions]){
    const a=fetCircuitMarkup(q,`a-${q.id}`),b=fetCircuitMarkup(q,`b-${q.id}`);
    assert(a.includes('<svg'));assert(a.includes(`id="a-${q.id}-title"`));assert(b.includes(`id="b-${q.id}-title"`));
    assert(a.includes('RD'));assert(a.includes('UGS'));assert(a.includes('ID: D→S'));assert(a.includes(`${q.circuit.drainOhm/1000} kΩ`));
    if(q.ac)assert(a.includes(q.ac.sourceAcOhm===0?'完全旁路':'未旁路'));
  }
  let error;try{fetCircuitMarkup(fetCatalog.examples[0],'<script>')}catch(e){error=e}assert(error instanceof RangeError);
});
test('分压偏置图只含RD、RS和两只分压电阻',()=>{
  const svg=fetCircuitMarkup(fetCatalog.questions[0],'divider-a');
  assertEqual((svg.match(/<rect /g)||[]).length,4);
});
test('耗尽NMOS筛根检验实际考分压偏置，JFET交流检验区分输入参考',()=>{
  const d=fetCatalog.questions.find(q=>q.id==='dmos-n-q2');
  assertEqual(d.circuit.gateBias.kind,'divider');assert(d.steps.some(s=>s.id==='gate-voltage'&&s.expectedSI===-1));
  const j=fetCatalog.questions.find(q=>q.id==='jfet-n-q3');
  assertEqual(j.ac.signalSourceOhm,1e6);assert(j.steps.some(s=>s.id==='input-reference'&&s.type==='choice'));
  assertNear(j.steps.find(s=>s.id==='avs').expectedSI,-1/3,1e-12);
});
