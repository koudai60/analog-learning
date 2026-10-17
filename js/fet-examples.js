import { activity,circuit,pCircuit,acConfig,formatV,formatI } from './fet-authoring.js';
function example(id,title,c,q,decision,notes,ac=null,expectedAc=null){
  const suffix=ac?'ex-ac':'ex-dc';
  const steps=[
    {title:'识别方向与通路',text:`${id.endsWith('-p')?'P沟道实际电流S→D，按D→S定义ID取负。':'N沟道正常ID沿D→S，取正。'}先画直流通路，所有电容开路。${notes[0]}`},
    {title:'假设区域并列式',text:notes[1]},
    {title:'求解并筛选物理根',text:`${notes[2]}得到ID=${formatI(q.currentA)}，UGSQ=${formatV(q.gateSourceV)}，UDSQ=${formatV(q.drainSourceV)}。`},
    {title:'核对区域与结偏置',text:notes[3]}
  ];
  if(ac){steps.push({title:'围绕Q点求gm',text:`直流工作点成立后，微分恒流区特性得到gm=${expectedAc.gmS*1000}mS。独立电源交流接地，忽略ro，耦合电容按中频短路处理。`},{title:'交流等效电路与结果',text:`RS交流=${ac.sourceAcOhm/1000}kΩ；Av=−gm(RD∥RL)/(1+gmRS交流)=${Number(expectedAc.gain.toFixed(6))}。Ri=${expectedAc.inputOhm/1000}kΩ；去掉RL、输入置零后Ro=${expectedAc.outputOhm/1000}kΩ。负号表示反相。`});}
  return activity(id,suffix,title,'先独立分析题设，再按步骤展开核对。本例要求确定直流Q点'+(ac?'并求gm、Av、Ri、Ro。':'及其工作区。'),c,q,{mode:ac?'ac':'dc',learningDecision:decision,steps,solution:steps.map(s=>`${s.title}：${s.text}`),ac,expectedAc});
}
const en=circuit(5,1000,500),ep=pCircuit(7,1000,500),dn=circuit(0,1000,2000),dp=pCircuit(12,1000,2000),jn=circuit(0,1000,1000),jp=pCircuit(14,1000,0);
const eq={currentA:0.002,gateSourceV:4,drainSourceV:9},pq={currentA:-0.002,gateSourceV:-4,drainSourceV:-9},dq={currentA:0.0005,gateSourceV:-1,drainSourceV:10.5},dpq={currentA:-0.0005,gateSourceV:1,drainSourceV:-10.5},jq={currentA:0.002,gateSourceV:-2,drainSourceV:8},jpq={currentA:-0.002,gateSourceV:2,drainSourceV:-10};
const enotes=['VG=5V，VS=ID×0.5kΩ，VD=12−ID×1kΩ。','先假设恒流区：以I为mA，I=0.5(5−0.5I−2)²。','数学根I=2或18mA；18mA使UGS低于UT且负载不允许，舍去。','9V>4−2=2V，Q点在恒流区内部；电阻压降与电源自洽。'];
const epnotes=['VG=7V，VS=12−|ID|×0.5kΩ，VD=|ID|×1kΩ。','以J=|ID|为mA，J=0.5[(12−0.5J)−7−2]²。','J=2mA；另一个数学根不满足UGS<−2V，不能采用。','UDS=−9V<UGS−UT=−2V，且UGS=−4V<−2V，恒流区成立。'];
const dnnotes=['栅经大电阻接地，VG=0；源电阻使VS=I×2kΩ。','以I为mA：UGS=−2I，I=0.5(2−2I)²。','根为0.5和2mA。2mA会使UGS=−4V≤−2V，违背导通假设，舍去。','UGS=−1V>−2V，UDS=10.5V>1V；零栅偏能导通，但本例因源电阻形成负偏置。'];
const dpnotes=['栅经大电阻接+12V，VS=12−J×2kΩ，VD=J×1kΩ。','J以mA计：UGS=2J，J=0.5(2−2J)²。','根0.5和2mA；2mA导致UGS=4V≥UT，舍去。ID必须写成−0.5mA。','UGS=1V<2V，UDS=−10.5V<UGS−UT=−1V，恒流区成立。'];
const jnnotes=['VG=0，VS=I×1kΩ；先核对N沟道栅结反偏。','I以mA计：UGS=−I，I=8(1−I/4)²。','根为2和8mA；8mA对应UGS=−8V，不在VP<UGS≤0范围，舍去。','−4V<UGS=−2V≤0，UGD也为负；UDS=8V>UGS−VP=2V，恒流区成立。'];
const jpnotes=['源极固定+12V，栅偏置+14V，UGS=+2V；栅结为反偏。','J=8(1−2/4)²=2mA，按参考方向ID=−J。','VD=0+2mA×1kΩ=2V，VS=12V。','0≤UGS=2V<VP=4V，UGD=12V≥0，UDS=−10V<UGS−VP=−2V。'];
export const fetExamples=[
  example('emos-n','源极负反馈：两个数学根选哪一个？',en,eq,'fixed-bias-root',enotes),
  example('emos-n','旁路源极后带负载的共源放大',en,eq,'bypassed-loaded-example',enotes,acConfig(1000,0,2000,[1e6,1e6]),{gmS:0.002,gain:-4/3,inputOhm:500000,outputOhm:1000}),
  example('emos-p','高端增强型PMOS：带负号的Q点',ep,pq,'p-high-side-example',epnotes),
  example('emos-p','高端PMOS中频反相增益',ep,pq,'p-ac-direction-example',epnotes,acConfig(1000,500,null,[1e6]),{gmS:0.002,gain:-1,inputOhm:1e6,outputOhm:1000}),
  example('dmos-n','耗尽型NMOS自偏置与物理根',dn,dq,'d-self-bias-example',dnnotes),
  example('dmos-n','未旁路源电阻降低增益',dn,dq,'d-unbypassed-example',dnnotes,acConfig(1000,2000,null,[1e6]),{gmS:0.001,gain:-1/3,inputOhm:1e6,outputOhm:1000}),
  example('dmos-p','正UGS仍导通的耗尽型PMOS',dp,dpq,'dp-positive-gate-example',dpnotes),
  example('dmos-p','耗尽型PMOS完全旁路的共源',dp,dpq,'dp-bypass-example',dpnotes,acConfig(1000,0,2000,[1e6,1e6]),{gmS:0.001,gain:-2/3,inputOhm:500000,outputOhm:1000}),
  example('jfet-n','JFET自偏置：栅结条件与筛根',jn,jq,'jn-self-example',jnnotes),
  example('jfet-n','JFET未旁路共源与负载',jn,jq,'jn-ac-example',jnnotes,acConfig(1000,1000,2000,[1e6]),{gmS:0.002,gain:-4/9,inputOhm:1e6,outputOhm:1000}),
  example('jfet-p','固定栅偏置的P沟道JFET',jp,jpq,'jp-fixed-example',jpnotes),
  example('jfet-p','P沟道JFET的gm与带负载增益',jp,jpq,'jp-fixed-ac-example',jpnotes,acConfig(1000,0,2000,[1e6,1e6]),{gmS:0.002,gain:-4/3,inputOhm:500000,outputOhm:1000})
];
