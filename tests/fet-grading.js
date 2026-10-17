import {test,assert,assertEqual,assertNear} from './test-harness.js';
import {parseQuantity,gradeFetQuestion} from '../js/fet-grading.js';
import {fetCatalog} from '../js/fet-content.js';
test('等价单位、指数、正负号和μA/uA解析',()=>{
  for(const [text,unit,value] of [[' 2e-3 ','A',.002],['2','mA',.002],['2000','μA',.002],['2000','uA',.002],['-2','mA',-.002],['−2','mA',-.002]]){const r=parseQuantity(text,unit,'current');assert(r.valid);assertNear(r.valueSI,value,1e-15);}
});
test('无效数值和维度不匹配不默认为零',()=>{
  for(const text of ['','  ','+','-','NaN','Infinity','2 mA','1e999','1,2','0x10'])assertEqual(parseQuantity(text,'mA','current').valid,false);
  assertEqual(parseQuantity('2','V','current').valid,false);assertEqual(parseQuantity('2','unknown','current').valid,false);
});
const q={steps:[{id:'n',type:'numeric',dimension:'current',expectedSI:.002,allowedUnits:['mA','A'],relativeTolerance:.01,absoluteToleranceSI:1e-6},{id:'c',type:'choice',options:[{id:'yes'},{id:'no'}],correctOptionId:'yes',feedbackByOption:{no:'检查模型区域。'}}]};
test('数值容差以内/以外与整题所有步骤',()=>{
  assertEqual(gradeFetQuestion(q,{n:{text:'2.019',unit:'mA'},c:'yes'}).correct,true);
  assertEqual(gradeFetQuestion(q,{n:{text:'2.021',unit:'mA'},c:'yes'}).correct,false);
  const wrong=gradeFetQuestion(q,{n:{text:'2',unit:'mA'},c:'no'});assert(wrong.valid);assertEqual(wrong.correct,false);assert(wrong.steps.some(s=>s.stepId==='c'&&s.status==='incorrect'));
  assertEqual(gradeFetQuestion(q,{c:'yes'}).valid,false);assertEqual(gradeFetQuestion(q,{n:{text:'2',unit:'V'},c:'yes'}).valid,false);
});
test('零值绝对容差包含边界，负期望误差正确',()=>{
  const z={steps:[{...q.steps[0],dimension:'voltage',expectedSI:0,allowedUnits:['V'],absoluteToleranceSI:.001}]};
  assertEqual(gradeFetQuestion(z,{n:{text:'.001',unit:'V'}}).correct,true);
  assertEqual(gradeFetQuestion(z,{n:{text:'.0011',unit:'V'}}).correct,false);
  const negative={steps:[{...q.steps[0],expectedSI:-.002}]};assertEqual(gradeFetQuestion(negative,{n:{text:'-2',unit:'mA'}}).correct,true);
});
test('18道题完整手算答案可提交、任一缺填不产生有效答卷',()=>{
  for(const question of fetCatalog.questions){
    const answers=Object.fromEntries(question.steps.map(s=>[s.id,s.type==='choice'?s.correctOptionId:{text:String(s.expectedSI),unit:{voltage:'V',current:'A',resistance:'Ω',conductance:'S',gain:'1'}[s.dimension]}]));
    assert(gradeFetQuestion(question,answers).correct,question.id);delete answers[question.steps[0].id];assertEqual(gradeFetQuestion(question,answers).valid,false);
  }
});
test('反馈区分半系数、BJT模型、极性和gm错误且不默认给完整解析',()=>{
  const original=fetCatalog.questions[0],step=original.steps.find(s=>s.id==='model');
  const half=gradeFetQuestion({steps:[step]},{model:'half'}),bjt=gradeFetQuestion({steps:[step]},{model:'bjt'});
  assert(half.steps[0].feedback.includes('1/2'));assert(bjt.steps[0].feedback.includes('BJT'));assert(half.steps[0].feedback!==bjt.steps[0].feedback);
  const p=fetCatalog.questions.find(q=>q.id==='emos-p-q1'),id=p.steps.find(s=>s.id==='id');
  const sign=gradeFetQuestion({steps:[id]},{id:{text:'2',unit:'mA'}});assert(sign.steps[0].feedback.includes('符号'));
  const ac=fetCatalog.questions.find(q=>q.id==='emos-n-q3'),gm=ac.steps.find(s=>s.id==='gm');
  const dc=gradeFetQuestion({steps:[gm]},{gm:{text:'0.5',unit:'mS'}});assert(dc.steps[0].feedback.includes('导数'));assert(dc.steps[0].feedback.includes('ID/UGS'));
});
