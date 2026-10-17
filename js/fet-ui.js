import {el,button,figure} from './fet-dom.js';
import {fetCatalog} from './fet-content.js';
import {fetCircuitMarkup} from './fet-circuits.js';
import {createFetProgress,reduceFetProgress,getRoundOutcome,loadFetProgress,saveFetProgress,resetFetProgress} from './fet-progress.js';
import {mountFetQuestion} from './fet-question-ui.js';
import {mountFetDemo} from './fet-demo-ui.js';
export function mountFetLearning(container,{catalog=fetCatalog,getStorage=()=>window.localStorage}={}){
  const loaded=loadFetProgress(getStorage,catalog);let state=loaded.progress,canPersist=loaded.canPersist;const views=[];
  const root=el('section','','fet-learning');root.id='fet-learning';
  root.append(el('h3','场效应管进阶 · 六组合分析训练','subsection-title'),el('p','选择器件组合，先学例题，再完成一整轮三题检验。使用提示或解析、或任一题首次答错，该轮都不能独立通过。','model-note'));
  const notice=el('p',loaded.warning||'新增进度只保存在当前浏览器，不跨设备同步。','fet-storage-notice');notice.setAttribute('role','status');root.append(notice);
  const reset=button('明确放弃损坏记录，重新建立新记录',()=>{
    const result=resetFetProgress(getStorage);notice.textContent=result.warning||'已按你的选择重新建立新记录；旧基础模块记录保留。';
    if(result.saved){state=createFetProgress();canPersist=true;reset.hidden=true;for(const v of views)renderRound(v);refresh();}
  });reset.hidden=!loaded.quarantined;root.append(reset);
  const label=el('label','选择器件组合：');label.htmlFor='fet-combination-select';const select=el('select');select.id='fet-combination-select';
  for(const c of catalog.combinations){const option=el('option',c.title);option.value=c.id;select.append(option);}root.append(label,select);
  const totals=el('p','','fet-summary');totals.setAttribute('role','status');root.append(totals);
  const newId=prefix=>`${prefix}-${crypto.randomUUID()}`;
  const getState=()=>state;
  function dispatch(action){
    try{state=reduceFetProgress(state,{at:Date.now(),...action},catalog);
      const saved=canPersist?saveFetProgress(state,getStorage,catalog):{saved:false,warning:loaded.warning};notice.textContent=saved.warning||'进度已保存；仅当前来源和浏览器可恢复。';notice.dataset.warning=String(!saved.saved);refresh();
    }catch(error){notice.textContent=error.message;notice.dataset.warning='true';}
  }
  function refresh(){
    const passed=new Set(state.rounds.filter(r=>getRoundOutcome(state,r.id,catalog).independentPassed).map(r=>r.combinationId));
    totals.textContent=`本版本已阅读${state.readCombinationIds.length}/6组合 · 曾独立通过${passed.size}/6组合 · 历史尝试${state.attempts.length}次`;
    for(const v of views){v.read.checked=state.readCombinationIds.includes(v.c.id);const r=state.rounds.filter(r=>r.combinationId===v.c.id).at(-1);v.status.textContent=r?`当前轮：${getRoundOutcome(state,r.id,catalog).reason}`:'尚未开始三题检验。';for(const form of v.forms)form.update();}
  }
  function renderRound(v){
    v.roundArea.replaceChildren();v.forms=[];
    const r=state.rounds.filter(r=>r.combinationId===v.c.id).at(-1);
    const start=button(r?'另开完整三题检验（旧轮留档）':'开始一轮三题检验',()=>{dispatch({type:'start-round',id:newId('round'),combinationId:v.c.id});renderRound(v);refresh();},true);start.dataset.action='start-round';
    v.roundArea.append(el('h4','三题检验 · 先独立分析'),start,v.status,el('p','首次结果与重试分别保存；重试不能补成原轮独立通过。另开完整检验需要重新提交三题，未提交草稿的旧轮会记为放弃。','model-note'));
    for(const q of catalog.questions.filter(q=>q.combinationId===v.c.id))v.forms.push(mountFetQuestion(v.roundArea,{question:q,contentVersion:catalog.version,roundId:r?.id||null,getState,dispatch,newId}));
  }
  for(const c of catalog.combinations){
    const panel=el('section','','fet-combination-panel');panel.dataset.combination=c.id;panel.hidden=c.id!==catalog.combinations[0].id;
    panel.append(el('h3',c.title,'subsection-title'));
    const readLabel=el('label','','learned-label'),read=el('input');read.type='checkbox';readLabel.append(read,el('span','本组合已阅读（不等于独立通过）'));read.addEventListener('change',()=>dispatch({type:'set-read',combinationId:c.id,read:read.checked}));panel.append(readLabel);
    for(const s of c.sections){const article=el('article','','knowledge-card');article.append(el('h4',s.title),el('p',s.text));panel.append(article);}
    panel.append(el('h4','两道分步例题 · 每题都有完整题设','subsection-title'));
    for(const ex of catalog.examples.filter(ex=>ex.combinationId===c.id)){
      const details=el('details','','example-step fet-example');details.append(el('summary',ex.title));for(const line of ex.prompt.split('\n'))details.append(el('p',line,'model-note'));details.append(el('p',ex.assumptions,'model-note'));
      const drawing=figure(ex,ex.id);drawing.innerHTML=fetCircuitMarkup(ex,`example-${ex.id}`);details.append(drawing);
      for(const step of ex.steps){const d=el('details','','example-step');d.append(el('summary',step.title),el('p',step.text));details.append(d);}details.append(el('p',`来源对应：${ex.sourceRefs.join('；')}。图形与解说为原创。`,'range-hint'));panel.append(details);
    }
    mountFetDemo(panel,c);
    const roundArea=el('section','','fet-round'),status=el('p','','fet-round-status');status.setAttribute('role','status');const v={c,panel,read,roundArea,status,forms:[]};views.push(v);panel.append(roundArea);root.append(panel);renderRound(v);
  }
  select.addEventListener('change',()=>{for(const v of views)v.panel.hidden=v.c.id!==select.value;});
  container.append(root);refresh();return {dispose:()=>root.remove()};
}
