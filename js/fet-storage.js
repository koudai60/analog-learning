import {createFetProgress} from './fet-progress.js';
import {fetCatalog} from './fet-content.js';
import {gradeFetQuestion} from './fet-grading.js';
export const FET_STORAGE_KEY='analog-learning.fet.v2';
const check=(ok)=>{if(!ok)throw new TypeError('记录结构或关联不完整。');};
const string=v=>typeof v==='string'&&v.length>0&&v.length<200;
const timestamp=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
function helpEvents(events,questionIds){
  check(Array.isArray(events));for(const e of events){check(e&&questionIds.includes(e.questionId)&&['hint','solution'].includes(e.kind)&&timestamp(e.at)&&Number.isInteger(e.level));check(e.kind==='hint'?e.level>=1&&e.level<=3:e.level===0);}
}
export function normalizeFetProgress(value,catalog=fetCatalog){
  check(value&&value.version===2);
  for(const key of ['readCombinationIds','rounds','attempts','reviewEvents'])check(Array.isArray(value[key]));
  const p=JSON.parse(JSON.stringify(value));
  const comboIds=catalog.combinations.map(c=>c.id);
  check(p.readCombinationIds.every(id=>comboIds.includes(id)));p.readCombinationIds=[...new Set(p.readCombinationIds)];
  const recordIds=[...p.rounds,...p.attempts].map(x=>x?.id);check(recordIds.every(string)&&new Set(recordIds).size===recordIds.length);
  for(const r of p.rounds){
    check(comboIds.includes(r.combinationId)&&string(r.contentVersion)&&['active','completed','abandoned'].includes(r.status)&&timestamp(r.startedAt));
    check(r.endedAt===null||timestamp(r.endedAt));check(Array.isArray(r.questionIds)&&r.questionIds.length===3&&new Set(r.questionIds).size===3&&r.questionIds.every(string));
    check(r.firstAttemptByQuestion&&typeof r.firstAttemptByQuestion==='object'&&!Array.isArray(r.firstAttemptByQuestion));
    check(Object.entries(r.firstAttemptByQuestion).every(([k,v])=>r.questionIds.includes(k)&&string(v)));
    helpEvents(r.helpEvents,r.questionIds);
    if(r.contentVersion===catalog.version)check(r.questionIds.every(id=>catalog.questions.some(q=>q.id===id&&q.combinationId===r.combinationId)));
    else if(r.status==='active'){r.status='abandoned';r.endedAt=Date.now();r.endReason='题库版本已更新，原轮保留为历史。';}
  }
  for(const a of p.attempts){
    const r=p.rounds.find(r=>r.id===a.roundId);check(r&&r.questionIds.includes(a.questionId)&&a.contentVersion===r.contentVersion);
    check(['active','submitted','abandoned'].includes(a.status)&&timestamp(a.startedAt));
    check(Number.isInteger(a.hintLevel)&&a.hintLevel>=0&&a.hintLevel<=3);helpEvents(a.helpEvents,[a.questionId]);
    check(a.hintLevel===Math.max(0,...a.helpEvents.map(e=>e.level)));
    check(a.answers&&typeof a.answers==='object'&&!Array.isArray(a.answers));
    const q=catalog.questions.find(q=>q.id===a.questionId);
    if(a.contentVersion===catalog.version){
      check(Object.entries(a.answers).every(([id,v])=>{
        const step=q.steps.find(s=>s.id===id);if(!step)return false;
        return step.type==='choice'?typeof v==='string'&&step.options.some(o=>o.id===v):v&&typeof v.text==='string'&&v.text.length<=200&&step.allowedUnits.includes(v.unit);
      }));
    }
    if(a.status==='submitted'){
      check(timestamp(a.submittedAt));helpEvents(a.helpAtSubmit,[a.questionId]);
      check(JSON.stringify(a.helpAtSubmit)===JSON.stringify(a.helpEvents));
      if(a.contentVersion===catalog.version){const grade=gradeFetQuestion(q,a.answers);check(grade.valid);a.result=grade;}
    }else if(r.status==='abandoned')a.status='abandoned';
  }
  for(const r of p.rounds){
    for(const id of r.questionIds){
      const first=p.attempts.find(a=>a.roundId===r.id&&a.questionId===id&&a.status==='submitted');
      check((r.firstAttemptByQuestion[id]||null)===(first?.id||null));
      check(p.attempts.filter(a=>a.roundId===r.id&&a.questionId===id&&a.status==='active').length<=1);
    }
    if(r.status==='completed')check(r.questionIds.every(id=>r.firstAttemptByQuestion[id]));
    if(r.status==='active')check(!r.questionIds.every(id=>r.firstAttemptByQuestion[id]));
  }
  for(const id of comboIds)check(p.rounds.filter(r=>r.combinationId===id&&r.status==='active').length<=1);
  for(const e of p.reviewEvents){const r=p.rounds.find(r=>r.id===e.roundId);check(r);helpEvents([e],r.questionIds);}
  return p;
}
export function loadFetProgress(getStorage,catalog=fetCatalog){
  let raw;
  try{raw=getStorage().getItem(FET_STORAGE_KEY);}catch{return {progress:createFetProgress(),canPersist:false,quarantined:false,warning:'无法读取场效应管记录；当前可继续学习，但进度暂存内存。'};}
  if(raw===null)return {progress:createFetProgress(),canPersist:true,quarantined:false,warning:null};
  try{
    const p=normalizeFetProgress(JSON.parse(raw),catalog);
    return {progress:p,canPersist:true,quarantined:false,warning:JSON.stringify(p)!==raw?'已重新核对成绩与版本；旧版进行中检验已结束，历史仍保留。':null};
  }catch{return {progress:createFetProgress(),canPersist:false,quarantined:true,warning:'场效应管记录损坏或不完整，原始记录已保留。当前仅暂存内存；需要时可明确选择重新建立记录。'};}
}
export function saveFetProgress(progress,getStorage,catalog=fetCatalog){
  try{
    const storage=getStorage(),raw=storage.getItem(FET_STORAGE_KEY);
    if(raw!==null)normalizeFetProgress(JSON.parse(raw),catalog);
    const p=normalizeFetProgress(progress,catalog);storage.setItem(FET_STORAGE_KEY,JSON.stringify(p));
    return {saved:true,warning:null};
  }catch{return {saved:false,warning:'本次场效应管记录未保存；仍可继续学习。原始损坏记录不会自动覆盖，请检查存储权限或记录提示。'};}
}
export function resetFetProgress(getStorage){
  try{getStorage().setItem(FET_STORAGE_KEY,JSON.stringify(createFetProgress()));return {saved:true,warning:null};}
  catch{return {saved:false,warning:'无法重新建立记录，请检查浏览器存储权限。'};}
}
