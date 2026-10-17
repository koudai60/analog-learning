const units={voltage:{V:1,mV:1e-3},current:{A:1,mA:1e-3,'μA':1e-6,uA:1e-6},resistance:{'Ω':1,'kΩ':1e3,'MΩ':1e6},conductance:{S:1,mS:1e-3,'μS':1e-6},gain:{'1':1}};
export function parseQuantity(text,unit,dimension){
  const invalid=reason=>({valid:false,reason});
  if(typeof text!=='string'||!Object.hasOwn(units,dimension)||!Object.hasOwn(units[dimension],unit))return invalid('请选择相容的单位。');
  const value=text.trim().replace(/^−/,'-');
  if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value))return invalid('请输入有限十进制数，可用科学记数法；单位在右侧选择。');
  const valueSI=Number(value)*units[dimension][unit];
  return Number.isFinite(valueSI)?{valid:true,valueSI,reason:''}:invalid('数值超出有限范围。');
}
export function gradeFetQuestion(question,answers={}){
  const steps=question.steps.map(step=>{
    const value=answers[step.id];
    if(step.type==='choice'){
      if(!step.options.some(o=>o.id===value))return {stepId:step.id,status:'invalid',feedback:'请为本步骤选择有效选项。'};
      const correct=value===step.correctOptionId;
      return {stepId:step.id,status:correct?'correct':'incorrect',feedback:correct?'本步骤正确。':step.feedbackByOption?.[value]||'请检查本题参考方向与模型条件。'};
    }
    const parsed=step.allowedUnits.includes(value?.unit)?parseQuantity(value.text,value.unit,step.dimension):{valid:false,reason:'请填写数值并选择允许的单位。'};
    if(!parsed.valid)return {stepId:step.id,status:'invalid',feedback:parsed.reason};
    const tolerance=Math.max(step.absoluteToleranceSI,step.relativeTolerance*Math.abs(step.expectedSI));
    // 只补偿浮点表示误差，不扩大题设容差。
    const roundoff=Number.EPSILON*Math.max(Math.abs(parsed.valueSI),Math.abs(step.expectedSI),tolerance)*4;
    const correct=Math.abs(parsed.valueSI-step.expectedSI)<=tolerance+roundoff;
    const opposite=step.expectedSI!==0&&parsed.valueSI*step.expectedSI<0&&Math.abs(Math.abs(parsed.valueSI)-Math.abs(step.expectedSI))<=tolerance+roundoff;
    const feedback=opposite&&step.feedbackByKind?.oppositeSign?step.feedbackByKind.oppositeSign:step.feedback||'请核对数值、符号、单位和适用条件。';
    return {stepId:step.id,status:correct?'correct':'incorrect',feedback:correct?'数值与单位正确。':feedback};
  });
  const valid=steps.every(s=>s.status!=='invalid');
  return {valid,correct:valid&&steps.every(s=>s.status==='correct'),steps,reason:valid?'':'仍有未填写或格式无效的步骤，本次不计成绩。'};
}
