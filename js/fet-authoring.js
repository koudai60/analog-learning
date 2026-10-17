// 仅用于组织原创题目数据；期望答案是逐题手算常量，不由求解器生成。
import { fetCombinations } from './fet-lessons.js';
export const VERSION='fet-2026-10-v1';
export const fixed=(voltageV)=>({kind:'fixed',voltageV});
export const circuit=(gate,rd=1000,rs=0,high=12,low=0)=>({drainRailV:high,sourceRailV:low,drainOhm:rd,sourceOhm:rs,gateBias:fixed(gate)});
export const pCircuit=(gate,rd=1000,rs=0,source=12,drain=0)=>circuit(gate,rd,rs,drain,source);
export const acConfig=(rd,rs,load=null,gates=[1e6],rsi=0)=>({drainOhm:rd,sourceAcOhm:rs,loadOhm:load,gateOhms:gates,signalSourceOhm:rsi});
export const formatV=x=>`${Number(x.toFixed(6))} V`;
export const formatI=x=>`${Number((x*1000).toFixed(6))} mA`;
export function circuitText(c){
  const b=c.gateBias;
  const gate=b.kind==='fixed'?`G经${(b.resistanceOhm||1e6)/1000}kΩ偏置等效电阻接${formatV(b.voltageV)}`:`G由${formatV(b.upperV)}与${formatV(b.lowerV)}之间的${b.upperOhm/1000}kΩ上电阻、${b.lowerOhm/1000}kΩ下电阻分压偏置`;
  return `D经RD=${c.drainOhm/1000}kΩ接${formatV(c.drainRailV)}；S${c.sourceOhm?`经RS=${c.sourceOhm/1000}kΩ`: '直接'}接${formatV(c.sourceRailV)}；${gate}。所有电源负参考端接题目公共地。`;
}
export function activity(combinationId,suffix,title,prompt,c,expectedQ,extra={}){
  if(extra.ac&&c.gateBias.kind==='fixed')c={...c,gateBias:{...c.gateBias,resistanceOhm:1/extra.ac.gateOhms.reduce((s,r)=>s+1/r,0)}};
  const combo=fetCombinations.find(c=>c.id===combinationId);
  const mos=combo.device.kind!=='jfet';
  const params=mos?`UT=${combo.device.thresholdV}V，K=${combo.device.coefficientAperV2*1000}mA/V²（已含半系数）`:`VP=${combo.device.cutoffV}V，IDSS大小=${combo.device.idssA*1000}mA`;
  const assumptions=`定义UGS=VG−VS、UDS=VD−VS、ID参考D→S；电位均对公共地。${mos?'MOS衬底与S相连、忽略栅电流':'JFET须检查栅源和栅漏结不正偏'}。忽略沟道长度调制、温度和内部电容。`;
  const a={id:`${combinationId}-${suffix}`,contentVersion:VERSION,combinationId,title,device:combo.device,circuit:c,expectedQ,
    prompt:`${prompt}\n${circuitText(c)}${params}。`,assumptions,sourceRefs:[mos?'康华光等，第7版，4.1、4.4节，纸质页94—97、111—115':'康华光等，第7版，4.8节，纸质页138—140'],...extra};
  if(a.ac){const x=a.ac;a.prompt+=`\n中频交流：输入ui为G对地小信号、输出uo为D经输出耦合电容后的对地信号。耦合电容短路；源极${x.sourceAcOhm===0?'完全旁路':`保留${x.sourceAcOhm/1000}kΩ不旁路`}。RL=${x.loadOhm===null?'不接':x.loadOhm/1000+'kΩ'}，栅偏置交流等效为${x.gateOhms.map(r=>r/1000+'kΩ').join('∥')}，Rsi=${x.signalSourceOhm/1000}kΩ。忽略ro；直流时所有电容开路，RL不参与Q点。`;
    if(x.gateOhms.length===2){a.prompt+='图中RG为题设直流偏置网络的等效表示；交流Ri按明确给出的两支路并联求取。';}
  }
  return a;
}
const dimensions={voltage:['V','mV'],current:['mA','A','μA','uA'],resistance:['kΩ','Ω','MΩ'],conductance:['mS','S','μS'],gain:['1']};
const absolute={voltage:0.001,current:1e-6,resistance:1,conductance:1e-6,gain:0.01};
const numericFeedback={
  id:'检查器件类型和工作区，并把候选电流代回源极电阻与负载线；平方后的数学根不一定满足导通条件。',
  ugs:'UGS必须由VG−VS求得；源极串电阻或接高端电源时，不能把VG直接当UGS。',
  uds:'UDS由VD−VS求得；先分别计算两节点电位，不把漏极对地电位当漏源电压。',
  'candidate-ugs':'把题给候选电流代入源极压降，再用VG−VS求UGS，最后与阈值/夹断范围比较。',
  'candidate-uds':'本步骤问的是题给候选电流对应的UDS，不是实际工作点；先算电阻压降和两节点电位。',
  'gate-voltage':'分压网络下端不是地时，应从下端电位起算分压增量；忽略栅电流不等于栅极一定接地。',
  gm:'gm是Q点处电流对栅源电压的导数，不是直流ID/UGS；先核对Q点，再对题设恒流区特性求导。',
  av:'Av以栅极小信号为输入。检查RD与RL并联、源极未旁路电阻的负反馈，勿把直流电位比当增益。',
  avs:'Avs还包含信号源内阻与Ri的分压；不要直接把栅输入增益Av当成源到输出增益。',
  ri:'器件栅电流近似为零，不等于整个输入电阻无穷大；输入电阻由交流接地的栅偏置电阻网络决定。',
  ro:'求Ro先移除RL并将输入独立源置零；忽略ro时不要再把RL并入输出电阻。'
};
export const numeric=(id,label,dimension,expectedSI,overrides={})=>({id,label,type:'numeric',dimension,expectedSI,allowedUnits:dimensions[dimension],relativeTolerance:0.01,absoluteToleranceSI:absolute[dimension],feedback:numericFeedback[id]||`核对${label}的单位和题设条件。`,feedbackByKind:{oppositeSign:'数值大小接近，但符号与题目参考方向不符；区分带符号量与大小。'},...overrides});
const optionFeedback={
  half:'本题K已经包含1/2，不能再乘一次1/2；先核对参数定义再使用平方律。',
  bjt:'IC=βIB属于BJT的放大区模型，不是本题场效应管的栅压控制模型。',
  mos:'JFET有栅PN结，必须检查反偏范围；不能使用MOS绝缘栅允许任意栅压的假设。',
  dcgain:'gm是Q点处特性曲线的导数，直流ID/UGS不是小信号跨导。',
  positive:'按D→S定义电流时，P沟道正常实际电流S→D；电流大小与带符号ID要分开。',
  negative:'N沟道正常电流与D→S参考一致，不能因为栅压为负就给ID负号。',
  'always-zero':'忽略的是栅电流，不是漏电流；是否截止应由阈值/夹断条件判断。',
  'constant-current':'恒流区须同时满足导通、漏源电压与器件适用条件；把候选Q点代回各条件，不只看平方式成立。',
  ohmic:'可变电阻区与恒流区由漏源电压和过驱动共同区分；请比较两者，不能只凭电流有变化就判可变电阻区。',
  cutoff:'截止由栅源电压相对阈值/夹断电压决定；耗尽MOS和JFET零栅偏并不一定截止。',
  boundary:'只有漏源电压恰在分界条件时才标区域边界；边界不能用来笼统代指所有导通状态。',
  unsupported:'先区分栅结正偏/漏源反向超出模型，与仅恒流区假设错误；二者不是同一原因。',
  accept:'平方表达式可能对域外根也成立；仍须代回UGS与负载条件，不能只凭数学等式选根。',
  reverse:'先根据N/P沟道及VG−VS判断PN结偏置；N沟道JFET正UGS会使栅源结正偏。',
  insulated:'JFET栅极与沟道构成PN结，不是MOS绝缘栅；正偏时不能忽略栅电流。',
  source:'以理想发生器源电压为输入的是Avs；本题Av定义为漏输出对栅输入的比值。',
  dc:'交流增益描述小信号变化，不以直流栅偏置作为输入信号。'
};
export const choice=(id,label,options,correctOptionId,overrides={})=>({id,label,type:'choice',options:options.map(([id,text])=>({id,text})),correctOptionId,feedbackByOption:{...Object.fromEntries(options.map(([id])=>[id,optionFeedback[id]||`重新检查“${label}”所需的物理条件。`])),...overrides}});
export const regionStep=(correct='constant-current')=>choice('region','判断实际工作区域/模型适用性',[['constant-current','恒流区内部，可考虑小信号放大'],['ohmic','可变电阻区，恒流区假设不成立'],['cutoff','截止（或零电流开启边界）'],['boundary','恒流区/可变电阻区边界，不作线性放大Q点'],['unsupported','栅结或参考方向超出本模型']],correct);
export const signStep=p=>choice('direction','按D→S定义，正常导通ID应取什么符号？',[['positive','正值'],['negative','负值'],['always-zero','始终为零']],p?'negative':'positive');
export const modelStep=(kind='mos')=>choice('model','选择本题恒流区计算依据（先检查区域）',kind==='jfet'?[['square','|ID|=IDSS(1−UGS/VP)²，需同时满足栅结与恒流区条件'],['mos','任意栅压都使用绝缘栅MOS公式'],['dcgain','把直流ID/UGS当成gm']]:[['square','|ID|=K×过驱动电压²，K已含半系数'],['half','再乘1/2'],['bjt','使用IC=βIB']], 'square');
