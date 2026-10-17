import {el,button,figure} from './fet-dom.js';
import {fetCircuitMarkup} from './fet-circuits.js';
import {gradeFetQuestion} from './fet-grading.js';
import {getQuestionHistory} from './fet-progress.js';
export function mountFetQuestion(container,{question:q,contentVersion=q.contentVersion,roundId,getState,dispatch,newId}){
  const card=el('article','','question-card fet-question');card.dataset.questionId=q.id;
  const title=el('h4',q.title);card.append(title);
  for(const p of q.prompt.split('\n'))card.append(el('p',p,'model-note'));
  card.append(el('p',q.assumptions,'model-note'));
  const drawing=figure(q,q.id);drawing.innerHTML=fetCircuitMarkup(q,`question-${q.id}`);drawing.append(el('figcaption','图示标出实际节点与ID参考方向；交流近似及偏置等效网络见题设。'));card.append(drawing);
  const controls=el('div','','question-actions');
  const status=el('p','','answer-feedback');status.setAttribute('role','status');
  const history=el('p','','model-note');
  const form=el('form'),fields=el('fieldset');const bindings=[];let displayedAttempt=null;
  const collect=()=>Object.fromEntries(bindings.flatMap(b=>b.step.type==='choice'?(b.inputs.find(i=>i.checked)?[[b.step.id,b.inputs.find(i=>i.checked).value]]:[]):[[b.step.id,{text:b.input.value,unit:b.unit.value}]]));
  const current=()=>getState().attempts.filter(a=>a.roundId===roundId&&a.questionId===q.id&&a.contentVersion===contentVersion).at(-1)||null;
  const helpFor=(a,r,state)=>a?.status==='active'?a.helpEvents:[...(a?.helpEvents||[]),...(r?.helpEvents||[]).filter(e=>e.questionId===q.id),...state.reviewEvents.filter(e=>e.roundId===roundId&&e.questionId===q.id)];
  const drawFields=a=>{
    fields.replaceChildren();bindings.length=0;
    for(const step of q.steps){
      const group=el('fieldset','','fet-step'),legend=el('legend',step.label);group.append(legend);
      if(step.type==='choice'){
        const inputs=[];for(const option of step.options){const label=el('label','','answer-option'),input=el('input');input.type='radio';input.name=`${q.id}-${a?.id||'waiting'}-${step.id}`;input.value=option.id;input.checked=a?.answers[step.id]===option.id;label.append(input,el('span',option.text));group.append(label);inputs.push(input);}bindings.push({step,inputs});
      }else{
        const row=el('div','','fet-number-row'),input=el('input'),unit=el('select');
        input.type='text';input.inputMode='decimal';input.autocomplete='off';input.maxLength=100;input.id=`${q.id}-${step.id}-value`;input.dataset.stepId=step.id;
        unit.id=`${q.id}-${step.id}-unit`;unit.dataset.unitFor=step.id;
        const label=el('label','数值');label.htmlFor=input.id;const unitLabel=el('label','单位');unitLabel.htmlFor=unit.id;
        for(const u of step.allowedUnits){const option=el('option',u);option.value=u;unit.append(option);}
        input.value=a?.answers[step.id]?.text||'';unit.value=a?.answers[step.id]?.unit||step.allowedUnits[0];row.append(label,input,unitLabel,unit);group.append(row);
        group.append(el('p',`允许误差：相对${step.relativeTolerance*100}%或绝对${step.absoluteToleranceSI} SI单位，取较大值；期望为零只用绝对误差。`,'range-hint'));bindings.push({step,input,unit});
      }
      fields.append(group);
    }
  };
  const save=()=>{const a=current();if(a?.status==='active')dispatch({type:'save-draft',attemptId:a.id,answers:collect()});};
  fields.addEventListener('input',save);fields.addEventListener('change',save);
  const submit=el('button','提交本次答案','primary-button');submit.type='submit';
  form.append(fields,submit);form.addEventListener('submit',event=>{
    event.preventDefault();const a=current();if(!a||a.status!=='active')return;
    const answers=collect(),result=gradeFetQuestion(q,answers);
    if(!result.valid){status.textContent=result.reason;return;}
    dispatch({type:'save-draft',attemptId:a.id,answers});dispatch({type:'submit-attempt',attemptId:a.id});
  });
  const feedback=el('ol','','fet-step-feedback');feedback.setAttribute('aria-live','polite');
  const help=el('div','','fet-help-output');
  const start=button('开始本题',()=>{dispatch({type:'start-attempt',id:newId('attempt'),roundId,questionId:q.id});});
  const retry=button('另记一次重试',()=>{const a=current();dispatch({type:'retry-attempt',id:newId('attempt'),previousAttemptId:a.id});});
  const hint=button('请求第1级提示',()=>{const a=current();if(!a)return;const state=getState(),r=state.rounds.find(r=>r.id===roundId);const highest=Math.max(0,...helpFor(a,r,state).filter(e=>e.kind==='hint').map(e=>e.level));const level=Math.min(3,highest+1);dispatch({type:'request-help',roundId,questionId:q.id,attemptId:a.id,kind:'hint',level});});
  const solution=button('查看完整解析（本轮计帮助）',()=>{const a=current();if(a)dispatch({type:'request-help',roundId,questionId:q.id,attemptId:a.id,kind:'solution'});});
  controls.append(start,retry,hint,solution);card.append(controls,history,form,status,feedback,help);container.append(card);
  function update(){
    const state=getState(),a=current(),r=state.rounds.find(r=>r.id===roundId);
    if(displayedAttempt!==a?.id){drawFields(a);displayedAttempt=a?.id;}
    if(bindings.length===0)drawFields(a);
    const active=a?.status==='active'&&r?.status!=='abandoned';fields.disabled=!active;submit.disabled=!active;
    start.hidden=Boolean(a);start.disabled=!r||r.status!=='active';retry.hidden=a?.status!=='submitted';retry.disabled=r?.status==='abandoned';
    const events=helpFor(a,r,state),highest=Math.max(0,...events.filter(e=>e.kind==='hint').map(e=>e.level));
    hint.disabled=!a||r?.status==='abandoned'||highest>=3;hint.textContent=highest>=3?'三级提示已全部展开':`请求第${highest+1}级提示`;
    solution.disabled=!a;solution.textContent=r?.status==='active'?'查看完整解析（本轮计帮助）':'查看完整解析（复习）';
    const h=getQuestionHistory(state,q.id),first=h.first;
    history.textContent=`首次提交：${first?first.contentVersion!==contentVersion?`旧版存档（${first.contentVersion}，未按新版复核）`:`${first.result?.correct?'正确':'错误'}${first.helpAtSubmit?.length?'，提交前用过帮助':'，提交前无帮助'}`:'尚无'}；历史尝试${h.attempts.length}次（含草稿/放弃）。`;
    status.textContent=!r?'先点击“开始一轮三题检验”，再开始本题。':!a?'点击开始本题后作答。':a.status==='active'?'本次进行中；草稿随输入保存，完成所有步骤后提交。':a.status==='abandoned'?'本次已放弃，原记录保留。':`${a.result.correct?'本次全部正确。':'本次有错误。'}${a.helpAtSubmit.length?' 提交前使用过帮助。':''}提交已封存；修改答案请另记重试。`;
    feedback.replaceChildren();if(a?.status==='submitted')for(const result of a.result.steps){const step=q.steps.find(s=>s.id===result.stepId),li=el('li',`${step?.label||`历史步骤 ${result.stepId}`}：${result.status==='correct'?'正确':'错误'}。${result.feedback}`);li.dataset.state=result.status;feedback.append(li);}
    help.replaceChildren();const level=Math.max(0,...events.filter(e=>e.kind==='hint').map(e=>e.level));
    for(let i=0;i<level;i++)help.append(el('p',`提示${i+1}：${q.hints[i]}`));
    if(events.some(e=>e.kind==='solution')){help.append(el('h5','完整解析'));for(const line of q.solution)help.append(el('p',line));}
  }
  update();return {update,dispose:()=>card.remove()};
}
