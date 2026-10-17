export { fetCircuitMarkup } from './fet-circuits.js';
// 图形均为本项目固定的教学电路；不拼接用户输入或外部 HTML。
const drawings = {
  diode: {
    title: "电源、电阻与二极管串联",
    desc: "电源正端经一千欧电阻接二极管阳极 A，阴极 K 返回电源负端，电流参考方向由 A 指向 K。",
    body: `<path class="wire" d="M65 115V65H145 M215 65H280 M320 65H415V235H65V165"/>
      <circle class="device" cx="65" cy="140" r="25"/><text x="59" y="134">+</text><text x="59" y="157">−</text>
      <rect class="device" x="145" y="52" width="70" height="26"/><text x="155" y="41">1 kΩ</text>
      <path class="device" d="M280 47L310 65L280 83Z M310 45V85 M310 65H320"/>
      <text x="262" y="108">A</text><text x="315" y="108">K</text><text x="18" y="199">Us 可调</text>
      <path class="reference-arrow" d="M335 110H380 M370 103L380 110L370 117"/><text x="346" y="139">I</text>`
  },
  bjt: {
    title: "电阻偏置的 NPN 共射电路",
    desc: "可调输入经四十七千欧电阻接基极，发射极接地，集电极经一千欧电阻接五伏电源。",
    body: `<path class="wire" d="M65 115V90H110V140H130 M200 140H283 M315 85V103 M315 176V235H65V165 M315 20V42"/>
      <circle class="device" cx="65" cy="140" r="25"/><text x="59" y="133">+</text><text x="59" y="157">−</text>
      <rect class="device" x="130" y="127" width="70" height="26"/><text x="129" y="110">R_B 47 kΩ</text>
      <rect class="device" x="302" y="42" width="26" height="43"/><text x="345" y="68">R_C 1 kΩ</text>
      <path class="device" d="M283 113V165 M283 124L315 103 M283 154L315 176 M297 171L315 176L307 160"/>
      <text x="270" y="23">+5 V</text><text x="252" y="130">B</text><text x="334" y="113">C</text><text x="335" y="185">E</text>
      <path class="wire" d="M315 235V250 M300 250H330 M305 256H325 M310 262H320"/>
      <text x="12" y="205">U_IN 可调</text><text x="355" y="155">NPN</text>`
  },
  fet: {
    title: "增强型 NMOS 共源电路",
    desc: "可调栅压接绝缘栅极 G，源极 S 接地，漏极 D 经一千欧电阻接十伏电源；符号为简化教学表示。",
    body: `<path class="wire" d="M65 115V90H110V140H280 M315 20V42 M315 85V108 M315 176V235H65V165"/>
      <circle class="device" cx="65" cy="140" r="25"/><text x="59" y="133">+</text><text x="59" y="157">−</text>
      <rect class="device" x="302" y="42" width="26" height="43"/><text x="345" y="68">R_D 1 kΩ</text>
      <path class="device" d="M280 116V164 M295 116V126 M295 135V145 M295 154V164 M315 108V119H295 M295 161H315V176 M295 140H315V161 M306 134L295 140L306 146"/>
      <text x="270" y="23">+10 V</text><text x="250" y="130">G</text><text x="335" y="113">D</text><text x="335" y="185">S</text>
      <path class="wire" d="M315 235V250 M300 250H330 M305 256H325 M310 262H320"/>
      <text x="10" y="205">U_GS 可调</text><text x="350" y="155">NMOS</text>`
  },
  opamp: {
    title: "同相运算放大电路",
    desc: "输入接同相端；反相端通过九十千欧反馈电阻接输出，并通过十千欧电阻接地。供电正负十五伏，演示输出限制正负十二伏。",
    body: `<path class="wire" d="M65 115V110H210 M310 130H435 M405 130V45H325 M265 45H160V150H210 M160 150V182 M160 218V250 M65 165V250H160"/>
      <circle class="device" cx="65" cy="140" r="25"/><text x="59" y="133">+</text><text x="59" y="157">−</text>
      <path class="device" d="M210 80L310 130L210 180Z"/><text x="222" y="116">+</text><text x="222" y="156">−</text>
      <rect class="device" x="265" y="32" width="60" height="26"/><text x="258" y="23">R_f 90 kΩ</text>
      <rect class="device" x="147" y="182" width="26" height="36"/><text x="184" y="207">R_g 10 kΩ</text>
      <path class="wire" d="M160 250V259 M145 259H175 M150 265H170 M155 271H165"/>
      <circle cx="405" cy="130" r="4"/><circle cx="160" cy="150" r="4"/>
      <text x="355" y="158">U_OUT</text><text x="16" y="203">U_IN 可调</text><text x="280" y="247">供电 ±15 V</text>`
  }
};

export function circuitMarkup(kind) {
  const drawing = drawings[kind];
  if (!drawing) throw new RangeError("未知电路图。");
  return `<svg viewBox="0 0 500 290" role="img" aria-labelledby="${kind}-title ${kind}-desc"><title id="${kind}-title">${drawing.title}</title><desc id="${kind}-desc">${drawing.desc}</desc>${drawing.body}</svg>`;
}
