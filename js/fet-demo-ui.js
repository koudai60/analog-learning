import {el,figure} from './fet-dom.js';
import {fetCircuitMarkup} from './fet-circuits.js';
import {solveFetBias} from './fet-models.js';
export function mountFetDemo(container,combination){
  const d=combination.device,s=d.channel==='n'?1:-1;
  const normal=d.kind==='emos'?{min:0,max:5,initial:4}:d.kind==='dmos'?{min:-3,max:2,initial:0}:{min:-4,max:0,initial:-2};
  const section=el('section','','demo-card'),label=el('label','实际栅源电压UGS：'),slider=el('input'),value=el('output'),output=el('p','','model-explanation');
  slider.type='range';slider.id=`${combination.id}-demo-gate`;slider.min=Math.min(s*normal.min,s*normal.max);slider.max=Math.max(s*normal.min,s*normal.max);slider.step=.1;slider.value=s*normal.initial;label.htmlFor=slider.id;value.htmlFor=slider.id;
  const draw=figure(null,null);section.append(el('h4','受限教学演示 · 改栅压，核对负载'),el('p',`漏电源${s*12}V、RD=1kΩ、S接地；器件参数见上方。本演示与例题偏置可不同；JFET滑块始终在栅结允许范围。`,'model-note'),label,value,slider,draw,output);
  function update(){
    const voltage=slider.valueAsNumber,c={drainRailV:s*12,sourceRailV:0,drainOhm:1000,sourceOhm:0,gateBias:{kind:'fixed',voltageV:voltage}};
    const q=solveFetBias(d,c);value.textContent=` ${voltage.toFixed(1)} V`;
    draw.innerHTML=fetCircuitMarkup({title:`${combination.title}教学演示`,device:d,circuit:c},`demo-${combination.id}`);
    const names={cutoff:'截止',ohmic:'可变电阻区','constant-current':'恒流区（饱和区）'};
    output.textContent=q.valid?`状态：${names[q.region]}${q.boundary?'，区域边界':''}。ID=${(q.currentA*1000).toFixed(3)}mA；UDS=${q.drainSourceV.toFixed(3)}V；${q.gmS!==null?`gm=${(q.gmS*1000).toFixed(3)}mS。`:''}先满足负载线，再核对器件区域。`:q.reason;
  }
  slider.addEventListener('input',update);container.append(section);update();
}
