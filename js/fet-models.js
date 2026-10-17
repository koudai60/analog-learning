// K 已包含教材中的半系数；内部归一化只用于计算，返回量仍带实际参考方向。
function finite(value, name) {
  if(typeof value!=='number'||!Number.isFinite(value)) throw new RangeError(`${name} 必须是有限数值。`);
  return value;
}
function model(device) {
  if(!device||!['emos','dmos','jfet'].includes(device.kind)||!['n','p'].includes(device.channel)) throw new RangeError('未知器件组合。');
  const s=device.channel==='n'?1:-1;
  const t=s*finite(device.kind==='jfet'?device.cutoffV:device.thresholdV,'阈值/夹断电压');
  const k=device.kind==='jfet'?finite(device.idssA,'IDSS')/(t*t):finite(device.coefficientAperV2,'K');
  if(!(k>0)||!Number.isFinite(k)||(device.kind==='emos'?t<=0:t>=0)) throw new RangeError('器件阈值方向或电导参数不符合模型。');
  return {s,t,k};
}
export function classifyFet(device, voltages) {
  const {s,t,k}=model(device);
  const v=s*finite(voltages?.gateSourceV,'UGS'),w=s*finite(voltages?.drainSourceV,'UDS');
  const a=v-t;
  const unsupported=reason=>({valid:false,reason,region:'unsupported',boundary:false,currentA:null,currentMagnitudeA:null,overdriveV:a,gmS:null});
  if(w<0) return unsupported('漏源电压方向超出本模型；不模拟体二极管或反向导通。');
  if(device.kind==='jfet'&&(v>0||v-w>0)) return unsupported('JFET 栅结正偏，不能使用本题反偏栅结模型。');
  const region=a<=0?'cutoff':w<a?'ohmic':'constant-current';
  const j=region==='cutoff'?0:region==='ohmic'?k*(2*a*w-w*w):k*a*a;
  if(!Number.isFinite(j)) throw new RangeError('参数导致数值溢出。');
  return {valid:true,reason:'',region,boundary:Math.abs(a)<=1e-9||(a>0&&Math.abs(w-a)<=1e-9),
    currentA:j===0?0:s*j,currentMagnitudeA:j,overdriveV:a,gmS:region==='constant-current'?2*k*a:null};
}
function positive(value,name,zero=false){
  finite(value,name);if(zero?value<0:value<=0)throw new RangeError(`${name} 超出电阻范围。`);return value;
}
function biasParameters(device,circuit){
  const m=model(device),c=circuit;
  finite(c?.drainRailV,'漏电源');finite(c?.sourceRailV,'源电源');
  positive(c.drainOhm,'RD');positive(c.sourceOhm,'RS',true);
  const b=c.gateBias;let gateV;
  if(b?.kind==='fixed')gateV=finite(b.voltageV,'栅电位');
  else if(b?.kind==='divider'){
    finite(b.upperV,'分压上端');finite(b.lowerV,'分压下端');positive(b.upperOhm,'栅上电阻');positive(b.lowerOhm,'栅下电阻');
    gateV=b.lowerV+(b.upperV-b.lowerV)*(b.lowerOhm/(b.upperOhm+b.lowerOhm));
  }else throw new RangeError('不支持的栅偏置拓扑。');
  return {...m,gateV};
}
export function checkFetCandidate(device,circuit,currentMagnitudeA){
  const {s,gateV}=biasParameters(device,circuit),j=finite(currentMagnitudeA,'候选电流');
  const sourceV=circuit.sourceRailV+s*j*circuit.sourceOhm,drainV=circuit.drainRailV-s*j*circuit.drainOhm;
  const gateSourceV=gateV-sourceV,drainSourceV=drainV-sourceV;
  const r=classifyFet(device,{gateSourceV,drainSourceV});
  const residualA=r.valid?j-r.currentMagnitudeA:null;
  const valid=r.valid&&j>=0&&Math.abs(residualA)<=1e-12;
  return {...r,valid,reason:!r.valid?r.reason:!valid?'候选根不满足电路与器件方程。':'',
    gateV,sourceV,drainV,gateSourceV,drainSourceV,residualA,
    currentA:j===0?0:s*j,currentMagnitudeA:j,checks:{deviceValid:r.valid,nonnegative:j>=0,equation:residualA!==null&&Math.abs(residualA)<=1e-12}};
}
export function solveFetBias(device,circuit){
  const {s,gateV}=biasParameters(device,circuit),c=circuit;
  const fail=reason=>({valid:false,reason,region:'unsupported',boundary:false});
  const span=s*(c.drainRailV-c.sourceRailV);
  if(span<0)return fail('电源方向超出该沟道模型。');
  let lo=0,hi=span/(c.drainOhm+c.sourceOhm);
  if(device.kind==='jfet'){
    const gateOffset=s*(gateV-c.sourceRailV);
    if(c.sourceOhm===0&&gateOffset>0)return fail('JFET 栅源结在整个区间正偏。');
    if(c.sourceOhm>0)lo=Math.max(0,gateOffset/c.sourceOhm);
    hi=Math.min(hi,s*(c.drainRailV-gateV)/c.drainOhm);
  }
  if(hi<lo||!Number.isFinite(hi))return fail('负载与栅结约束没有共同有效区间。');
  const residual=j=>{
    const v=s*(gateV-c.sourceRailV)-j*c.sourceOhm;
    const w=Math.max(0,span-j*(c.drainOhm+c.sourceOhm));
    const r=classifyFet(device,{gateSourceV:s*v,drainSourceV:s*w});
    return r.valid?j-r.currentMagnitudeA:NaN;
  };
  let left=residual(lo),right=residual(hi);
  if(!Number.isFinite(left)||!Number.isFinite(right)||left>1e-12||right< -1e-12)return fail('有效域内没有自洽工作点。');
  for(let iterations=0;iterations<=100;iterations++){
    const j=Math.abs(left)<=1e-12?lo:Math.abs(right)<=1e-12?hi:(lo+hi)/2;
    const f=residual(j);
    if(Math.abs(f)<=1e-12){const q=checkFetCandidate(device,c,j);if(q.valid)return {...q,iterations};}
    if(f>0){hi=j;right=f;}else{lo=j;left=f;}
  }
  return fail('在100次迭代内未获得满足残差要求的工作点。');
}
export function calculateCommonSource(qPoint,config){
  const c=config;
  positive(c?.drainOhm,'RD');positive(c.sourceAcOhm,'交流RS',true);positive(c.signalSourceOhm,'信号源内阻',true);
  if(c.loadOhm!==null)positive(c.loadOhm,'RL');
  if(!Array.isArray(c.gateOhms)||c.gateOhms.length<1||c.gateOhms.length>2)throw new RangeError('栅极电阻网络必须有一个或两个电阻。');
  for(const r of c.gateOhms)positive(r,'栅偏置电阻');
  if(!qPoint?.valid||qPoint.region!=='constant-current'||qPoint.boundary||!(qPoint.gmS>0))return {valid:false,reason:'Q点须位于恒流区内部，才能使用本题小信号模型。'};
  const inputOhm=1/c.gateOhms.reduce((sum,r)=>sum+1/r,0),outputOhm=c.drainOhm;
  const load=c.loadOhm===null?c.drainOhm:1/(1/c.drainOhm+1/c.loadOhm);
  const gain=-qPoint.gmS*load/(1+qPoint.gmS*c.sourceAcOhm);
  return {valid:true,reason:'',gmS:qPoint.gmS,gain,inputOhm,outputOhm,sourceGain:gain*inputOhm/(inputOhm+c.signalSourceOhm)};
}
