const common=[
  {title:'从题设到分析路径',text:'先识别器件、参考地与电源连接，标出栅源和漏源电压。直流通路中耦合、旁路电容开路；忽略栅电流后先求栅极电位，再列源极电阻和漏极电阻的节点关系。假设区域、求解、代回核对缺一不可。'},
  {title:'中频共源：先Q点，后小信号',text:'本轮交流题假定中频、耦合电容短路、指定的源极旁路电容短路、忽略器件内部电容与输出电阻ro。只有Q点位于恒流区内部才使用线性放大公式。电源交流接地，未旁路源极电阻引入负反馈；Av=−gm(RD∥RL)/(1+gmRS交流)。'},
  {title:'输入输出电阻与信号源',text:'器件理想栅电流为零，不表示整台放大器输入电阻无穷大：Ri由栅极偏置电阻网络决定。求Ro先移除RL再将输入独立源置零；忽略ro时Ro=RD。Av以栅极交流电压为输入，给定信号源内阻Rsi时另算Avs=Av·Ri/(Rsi+Ri)。'}
];
function make(id,title,device,text,region,extra){return {id,title,device,sections:[{title:'器件、方向与符号',text},{title:'区域与参数约定',text:region},{title:'偏置与物理条件',text:extra},...common]};}
export const fetCombinations=[
  make('emos-n','增强型 N 沟道 MOS',{kind:'emos',channel:'n',thresholdV:2,coefficientAperV2:0.0005},
    '绝缘栅G、漏极D、源极S，衬底按题设与源极相连；增强型符号的沟道线断开。UGS=VG−VS、UDS=VD−VS，ID正方向D→S。N沟道正常放大时ID与UDS为正，需要正栅压产生沟道。',
    '本组UT=+2V，K=0.5mA/V²已包含半系数。UGS≤UT截止；UGS>UT时，0≤UDS<UGS−UT为可变电阻区，UDS≥UGS−UT为恒流区（饱和区）。恒流区ID=K(UGS−UT)²，gm=2K(UGSQ−UT)。',
    '漏极经RD接较高电位，源极经RS接较低电位。VG由固定偏置或分压求得，VS=源电源+IDRS。把负载线代回判区；不能忽视RD而把任意平方律结果当作有效工作点。'),
  make('emos-p','增强型 P 沟道 MOS',{kind:'emos',channel:'p',thresholdV:-2,coefficientAperV2:0.0005},
    '增强型P沟道MOS的衬底按题设与源极相连，沟道线断开，衬底箭头与N沟道相反。仍定义ID正方向D→S、UGS=VG−VS、UDS=VD−VS。正常导电实际电流从S流向D，因此ID<0；源极可处在+12V高端。',
    '本组UT=−2V，Kp=0.5mA/V²。UGS≥UT截止；UGS<UT时，UGS−UT<UDS≤0是可变电阻区，UDS≤UGS−UT是恒流区。ID=−Kp(UGS−UT)²；gm按ID对UGS的斜率定义，恒流区为正值。',
    '源极经RS接高电位，漏极经RD接低电位：VS=高端电源−|ID|RS，VD=低端电源+|ID|RD。先用两节点电位求UGS、UDS再检查负号；输出仍从漏极对地取样，共源交流电压增益仍为负。'),
  make('dmos-n','耗尽型 N 沟道 MOS',{kind:'dmos',channel:'n',thresholdV:-2,coefficientAperV2:0.0005},
    '耗尽型N沟道MOS在零栅偏时已有沟道，符号的沟道线连续。它仍是绝缘栅器件，栅电流忽略；衬底与源极相连。ID参考D→S，正常情况下为正；UGS正负均可能，不能按增强型的“零栅压截止”判断。',
    'UT=−2V、K=0.5mA/V²。UGS≤−2V截止；导通后区域分界为UDS=UGS+2V。恒流区ID=K(UGS+2)²，gm=2K(UGSQ+2)。UGS=0时IDSS=KUT²；正UGS还能增强沟道，不能套JFET的反偏栅结限制。',
    '栅极接地而源极串RS可建立负UGS，实现自偏置。平方方程可能有两个数学根，必须排除使UGS低于阈值的根。正栅偏的固定偏置也是合法情形，但仍要检查漏源电压和负载。'),
  make('dmos-p','耗尽型 P 沟道 MOS',{kind:'dmos',channel:'p',thresholdV:2,coefficientAperV2:0.0005},
    '耗尽型P沟道MOS零栅偏已有沟道，符号沟道线连续。仍以D→S为ID正方向，所以正常ID<0。源极可经电阻接+12V、漏极经电阻接0V；栅极即使高于源极，也不一定截止。',
    'UT=+2V、Kp=0.5mA/V²。UGS≥+2V截止；UGS<+2V时，UDS≤UGS−2V为恒流区。ID=−Kp(UGS−2)²，gm=2Kp(2−UGSQ)。UGS=0时可导通，正UGS使沟道减弱，负UGS使沟道增强。',
    '源极电阻降低源极电位，栅极固定在高端电源时建立正UGS，从而减小电流。先写VS=V高−|ID|RS和VD=V低+|ID|RD；若由恒流区假设得到VD高于VS，必须回到区域判断。'),
  make('jfet-n','N 沟道 JFET',{kind:'jfet',channel:'n',cutoffV:-4,idssA:0.008},
    'JFET栅极与沟道构成PN结，不能照搬MOS的绝缘栅解释。N沟道符号的栅箭头指向沟道；ID参考D→S。正常反偏模型要求UGS≤0且UGD≤0，零偏置允许作为边界；栅正偏不由本演示模拟。',
    'VP=UGS(off)=−4V、IDSS=8mA。UGS≤VP截止；VP<UGS≤0时，UDS≥UGS−VP为恒流区。ID=IDSS(1−UGS/VP)²；gm=−2IDSS(1−UGSQ/VP)/VP。预夹断形成恒流区，不意味着电流降为零。',
    '栅极经大电阻接地、源极串RS可使VS>0从而UGS<0。须同时核对栅源和栅漏结偏置。零栅偏IDSS公式也有漏源电压条件，负载不足时不能无条件取IDSS。'),
  make('jfet-p','P 沟道 JFET',{kind:'jfet',channel:'p',cutoffV:4,idssA:0.008},
    'P沟道JFET栅箭头离开沟道，实际电流通常S→D，因此按D→S定义的ID为负。正常反偏要求UGS≥0、UGD≥0：例如源极+12V、栅极+14V属于反偏，而不是“N沟道栅压为正”的正偏结论。',
    'VP=UGS(off)=+4V、IDSS的大小8mA。UGS≥VP截止；0≤UGS<VP时，UDS≤UGS−VP为恒流区。ID=−IDSS(1−UGS/VP)²；相同D→S电流和G−S电压约定下gm仍为正值。',
    '可把栅极经大电阻接高端电源，源极经RS接该电源，电流使VS下降而产生正UGS。两个数学根都要代回栅结范围与负载。小信号受控源方向必须和参考电压关联，不因静态ID为负就将Av改成正。')
];
