import {test,assert,assertEqual} from './test-harness.js';
import {fetCatalog} from '../js/fet-content.js';
import {createFetProgress,reduceFetProgress,getRoundOutcome,getQuestionHistory} from '../js/fet-progress.js';
export const rightAnswers=q=>Object.fromEntries(q.steps.map(s=>[s.id,s.type==='choice'?s.correctOptionId:{text:String(s.expectedSI),unit:{voltage:'V',current:'A',resistance:'Ω',conductance:'S',gain:'1'}[s.dimension]}]));
export function startRound(id='r1',state=createFetProgress()){return reduceFetProgress(state,{type:'start-round',id,combinationId:'emos-n',at:1});}
export function answerQuestion(state,index,{wrong=false,help=false,prefix='a',roundId='r1'}={}){
  const q=fetCatalog.questions.filter(q=>q.combinationId==='emos-n')[index];
  const id=`${prefix}${index}`,answers=rightAnswers(q);
  if(wrong){const step=q.steps.find(s=>s.type==='choice');answers[step.id]=step.options.find(o=>o.id!==step.correctOptionId).id;}
  state=reduceFetProgress(state,{type:'start-attempt',id,roundId,questionId:q.id,at:2});
  state=reduceFetProgress(state,{type:'save-draft',attemptId:id,answers});
  if(help)state=reduceFetProgress(state,{type:'request-help',roundId,questionId:q.id,attemptId:id,kind:'hint',level:1,at:3});
  return reduceFetProgress(state,{type:'submit-attempt',attemptId:id,at:4});
}
test('完整三题全对无帮助才独立通过，状态变换不改输入',()=>{
  const empty=createFetProgress(),before=JSON.stringify(empty);let s=startRound('r1',empty);
  assertEqual(JSON.stringify(empty),before);s=answerQuestion(s,0);s=answerQuestion(s,1);assertEqual(getRoundOutcome(s,'r1').independentPassed,false);
  s=answerQuestion(s,2);assertEqual(getRoundOutcome(s,'r1').independentPassed,true);assertEqual(getRoundOutcome(s,'r1').correctCount,3);
});
test('首错重试不覆盖首次、重复提交幂等，新轮才能重新独立检验',()=>{
  let s=answerQuestion(startRound(),0,{wrong:true});
  s=reduceFetProgress(s,{type:'retry-attempt',id:'retry',previousAttemptId:'a0',at:5});
  s=reduceFetProgress(s,{type:'save-draft',attemptId:'retry',answers:rightAnswers(fetCatalog.questions[0])});
  s=reduceFetProgress(s,{type:'submit-attempt',attemptId:'retry',at:6});
  const before=JSON.stringify(s);s=reduceFetProgress(s,{type:'submit-attempt',attemptId:'retry',at:7});assertEqual(JSON.stringify(s),before);
  assertEqual(getQuestionHistory(s,'emos-n-q1').first.result.correct,false);
  s=answerQuestion(s,1);s=answerQuestion(s,2);assertEqual(getRoundOutcome(s,'r1').independentPassed,false);
  s=startRound('r2',s);for(let i=0;i<3;i++)s=answerQuestion(s,i,{prefix:'b',roundId:'r2'});assert(getRoundOutcome(s,'r2').independentPassed);
});
test('提示、提交后解析污染进行中整轮，封存后复习不改历史',()=>{
  let s=startRound();s=answerQuestion(s,0);
  s=reduceFetProgress(s,{type:'request-help',roundId:'r1',questionId:'emos-n-q1',attemptId:'a0',kind:'solution',at:5});
  assertEqual(s.attempts[0].helpAtSubmit.length,0);
  s=answerQuestion(s,1);s=answerQuestion(s,2);assertEqual(getRoundOutcome(s,'r1').independentPassed,false);
  let clean=startRound();for(let i=0;i<3;i++)clean=answerQuestion(clean,i);
  clean=reduceFetProgress(clean,{type:'request-help',roundId:'r1',questionId:'emos-n-q1',attemptId:'a0',kind:'solution',at:8});
  assert(getRoundOutcome(clean,'r1').independentPassed);assertEqual(clean.reviewEvents.length,1);
  let assisted=answerQuestion(startRound(),0,{help:true});assisted=answerQuestion(assisted,1);assisted=answerQuestion(assisted,2);assertEqual(getRoundOutcome(assisted,'r1').independentPassed,false);
});
test('不完整提交不封存、放弃不制造首次结果，跨轮不能拼分',()=>{
  let s=startRound();s=reduceFetProgress(s,{type:'start-attempt',id:'draft',roundId:'r1',questionId:'emos-n-q1',at:2});
  s=reduceFetProgress(s,{type:'submit-attempt',attemptId:'draft',at:3});assertEqual(s.attempts[0].status,'active');assertEqual(getQuestionHistory(s,'emos-n-q1').first,null);
  s=startRound('r2',s);assertEqual(s.rounds[0].status,'abandoned');assertEqual(s.attempts[0].status,'abandoned');
  s=answerQuestion(s,1,{roundId:'r2'});s=answerQuestion(s,2,{roundId:'r2'});assertEqual(getRoundOutcome(s,'r2').independentPassed,false);
});
test('重复题目新建、非法ID/动作与封存后草稿修改被拒绝',()=>{
  const s=answerQuestion(startRound(),0);
  for(const action of [{type:'save-draft',attemptId:'a0',answers:{}},{type:'start-attempt',id:'evil',roundId:'r1',questionId:'jfet-p-q1',at:5},{type:'bogus'},{type:'start-round',id:'r1',combinationId:'emos-n',at:6}]){let e;try{reduceFetProgress(s,action)}catch(x){e=x}assert(e instanceof RangeError);}
});
