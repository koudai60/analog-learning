import {test,assert,assertEqual} from './test-harness.js';
import {loadFetProgress,saveFetProgress,FET_STORAGE_KEY} from '../js/fet-storage.js';
import {fetCatalog} from '../js/fet-content.js';
import {reduceFetProgress,getRoundOutcome} from '../js/fet-progress.js';
import {startRound,answerQuestion,rightAnswers} from './fet-progress.js';
function store(initial){const map=new Map(Object.entries(initial||{}));return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};}
test('v2草稿、帮助和首次/重试恢复，不读写v1',()=>{
  const storage=store({'analog-learning.progress.v1':'private-old-record'});let s=startRound();
  s=reduceFetProgress(s,{type:'start-attempt',id:'draft',roundId:'r1',questionId:'emos-n-q1',at:2});
  s=reduceFetProgress(s,{type:'save-draft',attemptId:'draft',answers:rightAnswers(fetCatalog.questions[0])});
  s=reduceFetProgress(s,{type:'request-help',roundId:'r1',questionId:'emos-n-q1',attemptId:'draft',kind:'hint',level:2,at:3});
  assert(saveFetProgress(s,()=>storage).saved);const r=loadFetProgress(()=>storage);assertEqual(JSON.stringify(r.progress),JSON.stringify(s));assertEqual(storage.map.get('analog-learning.progress.v1'),'private-old-record');
});
test('持久化成绩按答案重算，不信任伪造correct标记',()=>{
  let s=answerQuestion(startRound(),0,{wrong:true});s=answerQuestion(s,1);s=answerQuestion(s,2);s.attempts[0].result.correct=true;
  const r=loadFetProgress(()=>store({[FET_STORAGE_KEY]:JSON.stringify(s)}));assert(r.canPersist);assertEqual(r.progress.attempts[0].result.correct,false);assertEqual(getRoundOutcome(r.progress,'r1').independentPassed,false);
});
test('损坏JSON、缺帮助字段、重复ID与错关联隔离且不覆盖原始数据',()=>{
  let valid=startRound();for(let i=0;i<3;i++)valid=answerQuestion(valid,i);
  const missing=structuredClone(valid);delete missing.rounds[0].helpEvents;
  const duplicate=structuredClone(valid);duplicate.attempts.push(duplicate.attempts[0]);
  const foreign=structuredClone(valid);foreign.attempts[0].roundId='missing';
  const forged=structuredClone(valid);forged.rounds[0].firstAttemptByQuestion['emos-n-q1']='a1';
  for(const raw of ['{bad',JSON.stringify(missing),JSON.stringify(duplicate),JSON.stringify(foreign),JSON.stringify(forged)]){
    const storage=store({[FET_STORAGE_KEY]:raw});const r=loadFetProgress(()=>storage);assert(r.quarantined);assertEqual(r.canPersist,false);assertEqual(r.progress.rounds.length,0);assert(r.warning);
    assertEqual(saveFetProgress(startRound(),()=>storage).saved,false);assertEqual(storage.getItem(FET_STORAGE_KEY),raw);
  }
});
test('旧版本进行中轮放弃，旧成绩不计新版本通过',()=>{
  const s=startRound();s.rounds[0].contentVersion='old-version';
  const r=loadFetProgress(()=>store({[FET_STORAGE_KEY]:JSON.stringify(s)}));assertEqual(r.progress.rounds[0].status,'abandoned');assert(r.warning);assertEqual(getRoundOutcome(r.progress,'r1').independentPassed,false);
});
test('读取getter、read与write异常不阻断学习',()=>{
  for(const get of [()=>{throw Error('blocked')},()=>({getItem(){throw Error('blocked')}})]){const r=loadFetProgress(get);assert(r.warning);assertEqual(r.progress.rounds.length,0);}
  assertEqual(saveFetProgress(startRound(),()=>({getItem(){return null},setItem(){throw Error('quota')}})).saved,false);
});
