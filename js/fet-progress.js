import { fetCatalog } from './fet-content.js';
import { gradeFetQuestion } from './fet-grading.js';
export {loadFetProgress,saveFetProgress,resetFetProgress,FET_STORAGE_KEY} from './fet-storage.js';
export function createFetProgress(){return {version:2,readCombinationIds:[],rounds:[],attempts:[],reviewEvents:[]};}
const requireCondition=(condition,message)=>{if(!condition)throw new RangeError(message);};
const clone=value=>JSON.parse(JSON.stringify(value));
export function getRoundOutcome(state,roundId,catalog=fetCatalog){
  const r=state.rounds.find(r=>r.id===roundId);
  if(!r)return {complete:false,independentPassed:false,assisted:false,correctCount:0,reason:'没有该轮检验。'};
  const current=r.contentVersion===catalog.version;
  const submissions=r.questionIds.map(id=>state.attempts.find(a=>a.id===r.firstAttemptByQuestion[id]&&a.status==='submitted'&&a.roundId===r.id&&a.questionId===id));
  const correctCount=submissions.filter(a=>a&&current&&gradeFetQuestion(catalog.questions.find(q=>q.id===a.questionId),a.answers).correct).length;
  const assisted=!(Array.isArray(r.helpEvents)&&r.helpEvents.length===0)||submissions.some(a=>a&&(!Array.isArray(a.helpAtSubmit)||a.helpAtSubmit.length>0));
  const complete=r.status==='completed'&&submissions.length===3&&submissions.every(Boolean);
  return {complete,independentPassed:current&&complete&&correctCount===3&&!assisted,assisted,correctCount,
    reason:!current?'题库版本已变化，旧成绩仅作历史。':!complete?'本轮尚未完成三题。':assisted?'本轮使用过帮助，不计独立通过。':correctCount<3?'本轮首次提交曾答错；重试不补成独立通过。':'三题全对且无帮助，独立通过。'};
}
export function getQuestionHistory(state,questionId){
  const attempts=state.attempts.filter(a=>a.questionId===questionId);
  return {first:attempts.find(a=>a.status==='submitted')||null,attempts};
}
export function reduceFetProgress(state,action,catalog=fetCatalog){
  requireCondition(action&&typeof action.type==='string','进度动作无效。');
  const next=clone(state);
  const unique=id=>requireCondition(typeof id==='string'&&/^[a-zA-Z0-9_-]+$/.test(id)&&!next.rounds.some(r=>r.id===id)&&!next.attempts.some(a=>a.id===id),'记录ID无效或重复。');
  const time=()=>{requireCondition(Number.isFinite(action.at)&&action.at>=0,'事件时间无效。');return action.at;};
  const round=id=>{const r=next.rounds.find(r=>r.id===id);requireCondition(r,'检验轮不存在。');return r;};
  const attempt=id=>{const a=next.attempts.find(a=>a.id===id);requireCondition(a,'答题尝试不存在。');return a;};
  const abandon=r=>{r.status='abandoned';r.endedAt=time();for(const a of next.attempts.filter(a=>a.roundId===r.id&&a.status==='active'))a.status='abandoned';};
  const addAttempt=(r,questionId)=>{
    unique(action.id);requireCondition(r.contentVersion===catalog.version&&r.questionIds.includes(questionId),'题目不属于此轮或版本已变化。');
    requireCondition(!next.attempts.some(a=>a.roundId===r.id&&a.questionId===questionId&&a.status==='active'),'该题已有进行中的尝试。');
    next.attempts.push({id:action.id,roundId:r.id,questionId,contentVersion:catalog.version,status:'active',startedAt:time(),answers:{},hintLevel:0,helpEvents:[]});
  };
  switch(action.type){
    case 'start-round':{
      unique(action.id);requireCondition(catalog.combinations.some(c=>c.id===action.combinationId),'未知器件组合。');
      for(const r of next.rounds.filter(r=>r.combinationId===action.combinationId&&r.status==='active'))abandon(r);
      const questionIds=catalog.questions.filter(q=>q.combinationId===action.combinationId).map(q=>q.id);requireCondition(questionIds.length===3,'检验题组必须有三道题。');
      next.rounds.push({id:action.id,combinationId:action.combinationId,contentVersion:catalog.version,questionIds,status:'active',startedAt:time(),endedAt:null,helpEvents:[],firstAttemptByQuestion:{}});break;
    }
    case 'start-attempt':{
      const r=round(action.roundId);requireCondition(r.status==='active'&&!next.attempts.some(a=>a.roundId===r.id&&a.questionId===action.questionId),'请使用重试操作创建新的尝试。');addAttempt(r,action.questionId);break;
    }
    case 'save-draft':{
      const a=attempt(action.attemptId);requireCondition(a.status==='active'&&action.answers&&typeof action.answers==='object'&&!Array.isArray(action.answers),'仅进行中尝试可保存草稿。');a.answers=clone(action.answers);break;
    }
    case 'request-help':{
      const r=round(action.roundId);requireCondition(r.questionIds.includes(action.questionId),'帮助题目不属于此轮。');
      requireCondition(['hint','solution'].includes(action.kind),'帮助类型无效。');
      if(action.kind==='hint')requireCondition(Number.isInteger(action.level)&&action.level>=1&&action.level<=3,'提示层级无效。');
      const event={questionId:action.questionId,kind:action.kind,level:action.kind==='hint'?action.level:0,at:time()};
      if(action.attemptId){const a=attempt(action.attemptId);requireCondition(a.roundId===r.id&&a.questionId===action.questionId,'帮助与尝试不匹配。');if(a.status==='active'){a.helpEvents.push(event);a.hintLevel=Math.max(a.hintLevel,event.level);}}
      if(r.status==='active')r.helpEvents.push(event);else next.reviewEvents.push({...event,roundId:r.id});break;
    }
    case 'submit-attempt':{
      const a=attempt(action.attemptId);if(a.status==='submitted')return state;
      requireCondition(a.status==='active','已放弃尝试不能提交。');const r=round(a.roundId);
      requireCondition(r.contentVersion===catalog.version&&r.status!=='abandoned','该轮不可继续提交。');
      const result=gradeFetQuestion(catalog.questions.find(q=>q.id===a.questionId),a.answers);
      if(!result.valid)return state;
      a.result=result;a.status='submitted';a.submittedAt=time();a.helpAtSubmit=clone(a.helpEvents);
      if(r.status==='active'){
        if(!r.firstAttemptByQuestion[a.questionId])r.firstAttemptByQuestion[a.questionId]=a.id;
        if(r.questionIds.every(id=>r.firstAttemptByQuestion[id])){r.status='completed';r.endedAt=a.submittedAt;}
      }break;
    }
    case 'retry-attempt':{
      const old=attempt(action.previousAttemptId);const r=round(old.roundId);
      requireCondition(old.status==='submitted'&&r.status!=='abandoned','仅已提交且未放弃的轮可重试。');addAttempt(r,old.questionId);break;
    }
    case 'abandon-round':{const r=round(action.roundId);requireCondition(r.status==='active','只能放弃进行中的轮。');abandon(r);break;}
    case 'set-read':{
      requireCondition(catalog.combinations.some(c=>c.id===action.combinationId)&&typeof action.read==='boolean','阅读动作无效。');
      next.readCombinationIds=next.readCombinationIds.filter(id=>id!==action.combinationId);if(action.read)next.readCombinationIds.push(action.combinationId);break;
    }
    default:throw new RangeError('未知进度动作。');
  }
  return next;
}
