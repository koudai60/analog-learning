import { circuitText } from './fet-authoring.js';
const esc=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function fetCircuitMarkup(activity,idPrefix){
  if(!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(idPrefix))throw new RangeError('图形ID无效。');
  const {circuit:c,device:d,ac}=activity;
  const s=d.channel==='n'?1:-1;
  const tag=d.kind==='jfet'?'JFET':d.kind==='emos'?'增强MOS':'耗尽MOS';
  const text=(x,y,t)=>`<text x="${x}" y="${y}">${esc(t)}</text>`;
  const line=path=>`<path class="wire" d="${path}"/>`;
  const ground=(x,y)=>line(`M${x} ${y}v10 m-14 0h28 m-23 6h18 m-13 6h8`);
  const resistor=(x,y,w,h)=>`<rect class="device" x="${x}" y="${y}" width="${w}" height="${h}"/>`;
  let body=line('M370 40V65 M370 110V178H345 M345 242H370V282 M320 210H270');
  body+=resistor(357,65,26,45)+text(390,92,`RD ${c.drainOhm/1000} kΩ`)+text(340,26,`${c.drainRailV} V`);
  body+=line(d.kind==='emos'?'M345 178V195 M345 203V218 M345 226V242':'M345 178V242');
  if(d.kind==='jfet')body+=line('M320 210H345')+line(s===1?'M330 203L341 210L330 217':'M338 203L327 210L338 217');
  else body+=line('M320 184V236 M345 210H405V260H370')+line(s===1?'M360 203L349 210L360 217':'M350 203L361 210L350 217');
  body+=text(298,202,'G')+text(380,174,'D')+text(380,278,'S')+text(416,215,`${d.channel.toUpperCase()} ${tag}`);
  const b=c.gateBias;
  body+=b.kind==='fixed'?line('M270 210H255 M190 210H110V242')+resistor(190,197,65,26):line('M270 210H110');
  if(b.kind==='fixed'){
    body+=`<circle class="device" cx="110" cy="266" r="24"/>`+text(104,261,'+')+text(104,280,'−');
    body+=line('M110 290V326')+ground(110,326)+text(35,370,`VG偏置 ${b.voltageV} V`)+text(168,245,`RG ${(b.resistanceOhm||1e6)/1000} kΩ`);
  }else{
    body+=line('M110 50V110 M110 155V210 M110 210V258 M110 303V380');
    body+=resistor(97,110,26,45)+resistor(97,258,26,45)+text(25,90,`${b.upperV} V`)+text(25,405,`${b.lowerV} V`);
    body+=text(18,140,`${b.upperOhm/1000} kΩ`)+text(18,290,`${b.lowerOhm/1000} kΩ`)+text(175,245,'G连分压点');
  }
  if(c.sourceOhm){body+=line('M370 282V302 M370 347V390')+resistor(357,302,26,45)+text(390,339,`RS ${c.sourceOhm/1000} kΩ`);}
  else body+=line('M370 282V390');
  body+=text(325,417,`${c.sourceRailV} V 源电源`);
  body+=line('M310 284H286V165H312')+text(202,282,'UGS=VG−VS');
  body+=line('M424 135V172 M418 164L424 172L430 164')+text(440,155,'ID: D→S');
  if(ac){
    body+=line('M370 160H508 M520 160H640 M508 146V174 M520 146V174')+text(524,133,'耦合Cout')+text(626,150,'uo');
    if(ac.loadOhm!==null)body+=line('M640 160V222 M640 282V358')+resistor(627,222,26,60)+ground(640,358)+text(665,254,`RL ${ac.loadOhm/1000} kΩ`);
    else body+=text(612,219,'无RL');
    body+=line('M220 155H270V210 M208 142V168 M220 142V168')+text(235,132,'Cin / ui');
    if(ac.signalSourceOhm>0)body+=line('M20 155H55 M125 155H208')+resistor(55,142,70,26)+text(20,182,'vs')+text(30,126,`Rsi ${ac.signalSourceOhm/1000} kΩ`);
    else body+=line('M170 155H208');
    if(c.sourceOhm&&ac.sourceAcOhm===0)body+=line('M370 282H540V305 M525 305H555 M525 316H555 M540 316V390H370')+text(557,331,'Cs完全旁路');
    else body+=text(485,379,c.sourceOhm?'RS未旁路':'S直接接电源，交流接地');
    body+=text(30,456,`中频：耦合短路，${ac.sourceAcOhm===0?'源极完全旁路':'源极未旁路'}，忽略ro`);
  }else body+=text(30,456,'直流：耦合/旁路电容开路；图示为直流通路');
  body+=text(30,486,'电位均对题目公共地；UGS=VG−VS，UDS=VD−VS')+text(30,514,'箭头是ID参考方向，P沟道正常ID为负；不是实际电流都沿箭头');
  return `<svg viewBox="0 0 880 540" role="img" aria-labelledby="${idPrefix}-title ${idPrefix}-desc"><title id="${idPrefix}-title">${esc(activity.title)}</title><desc id="${idPrefix}-desc">${esc(circuitText(c))} ID参考D到S。${ac?'交流近似见题设。':''}</desc>${body}</svg>`;
}
