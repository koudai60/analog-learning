import { mountFetLearning } from "./fet-ui.js";
import { lessons, questions, demos } from "./content.js";
import { evaluateAnswer, calculateDiodeCurrent, calculateBjtState, calculateFetState,
  calculateOpampState, updateProgress } from "./logic.js";
import { loadProgress, saveProgress } from "./storage.js";
import { circuitMarkup } from "./circuits.js";

// 整个应用只维护一份学习记录；局部渲染不会改动其他题目的选择。
const loaded = loadProgress(() => window.localStorage);
let progress = loaded.progress;
const progressViews = [];
const notice = document.getElementById("storage-notice");
notice.textContent = loaded.warning || "进度保存在当前浏览器中；更换地址、浏览器或清除网站数据可能丢失记录。";
notice.dataset.warning = String(Boolean(loaded.warning));

function element(tag, text = "", className = "") {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}
function renderProgress() {
  document.getElementById("progress-summary").textContent =
    `已阅读单元 ${progress.learnedLessonIds.length}/${lessons.length} · 旧题曾答对 ${progress.masteredQuestionIds.length}/${questions.length}`;
  for (const view of progressViews) {
    if (view.checkbox) view.checkbox.checked = progress.learnedLessonIds.includes(view.lessonId);
    if (view.questionId) view.node.textContent = progress.masteredQuestionIds.includes(view.questionId) ? "曾答对（历史）" : "尚无答对记录";
  }
}
function commitProgress(action) {
  progress = updateProgress(progress, action);
  renderProgress();
  const result = saveProgress(progress, () => window.localStorage);
  notice.textContent = result.warning || "进度已保存到当前浏览器；不会跨设备同步。";
  notice.dataset.warning = String(!result.saved);
}

function renderQuestion(question, index) {
  const form = element("form", "", "question-card");
  const fieldset = document.createElement("fieldset");
  const legend = element("legend", `${index + 1}. ${question.prompt}`);
  fieldset.append(legend);
  for (const option of question.options) {
    const label = element("label", "", "answer-option");
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = question.id;
    radio.value = option.id;
    const text = element("span", `${option.id}. ${option.text}`);
    label.append(radio, text);
    fieldset.append(label);
  }
  const buttons = element("div", "", "question-actions");
  const submit = element("button", "提交答案", "primary-button");
  submit.type = "submit";
  const retry = element("button", "重新作答", "secondary-button");
  retry.type = "button";
  const mastered = element("span", "", "mastery-label");
  progressViews.push({ questionId: question.id, node: mastered });
  buttons.append(submit, retry, mastered);
  const feedback = element("p", "选择答案后提交；重试不会清除曾答对记录。", "answer-feedback");
  feedback.setAttribute("role", "status");
  feedback.setAttribute("aria-live", "polite");
  form.append(fieldset, buttons, feedback);
  form.addEventListener("submit", event => {
    event.preventDefault();
    const selected = form.querySelector("input:checked");
    const result = evaluateAnswer(question, selected ? selected.value : null);
    feedback.dataset.state = result.status;
    feedback.textContent = `${result.status === "correct" ? "回答正确。" : result.status === "incorrect" ? "回答错误。" : ""}${result.explanation}`;
    if (result.status === "correct") commitProgress({ type: "master-question", questionId: question.id });
  });
  form.addEventListener("change", () => {
    feedback.dataset.state = "pending";
    feedback.textContent = "已更换选择，请提交查看本次反馈。";
  });
  retry.addEventListener("click", () => {
    form.reset();
    feedback.dataset.state = "pending";
    feedback.textContent = "已清除本题选择，可以重新作答；曾答对的答对记录保留。";
  });
  return form;
}

function demoValues(kind, voltage) {
  if (kind === "diode") {
    const current = calculateDiodeCurrent(voltage);
    return { active: current > 0, state: current > 0 ? "导通" : "截止",
      values: [["电流 I", `${(current * 1000).toFixed(1)} mA`], ["二极管电压", `${Math.min(voltage, 0.7).toFixed(1)} V`]],
      explanation: current > 0 ? `I=(${voltage.toFixed(1)}−0.7)/1 kΩ=${(current * 1000).toFixed(1)} mA。` : "按恒压降分段模型取截止，电阻电流为零；不在此区间套用导通公式。" };
  }
  if (kind === "bjt") {
    const result = calculateBjtState(voltage);
    return { active: result.collectorA > 0, state: result.state,
      values: [["基极电流 I_B", `${(result.baseA * 1e6).toFixed(1)} μA`], ["集电极电流 I_C", `${(result.collectorA * 1000).toFixed(2)} mA`], ["U_CE", `${result.collectorV.toFixed(2)} V`]],
      explanation: result.state === "饱和近似" ? "集电极电流已被外电路限制为约 4.8 mA，不能继续无限使用 βI_B。" : result.state === "过渡区近似" ? "按简化负载限流公式估算，但集电极电位已低于约 0.7 V 的基极电位，不能再视为严格正向放大区；此处只作过渡区教学近似。" : result.state === "截止" ? "输入不足以达到本模型的正向导通近似，取基极与集电极电流为零。" : "本分段模型按 I_C=100I_B 计算，并由 5 V−I_C×1 kΩ 得到 U_CE。交界附近真实行为更复杂。" };
  }
  if (kind === "fet") {
    const result = calculateFetState(voltage);
    return { active: result.currentA > 0, state: result.state,
      values: [["漏极电流 I_D", `${(result.currentA * 1000).toFixed(2)} mA`], ["漏源电压 U_DS", `${result.drainV.toFixed(2)} V`], ["过驱动电压", `${result.overdriveV.toFixed(1)} V`]],
      explanation: result.currentA > 0 ? `I_D=(1/2)×(${voltage.toFixed(1)}−2)² mA；U_DS=${result.drainV.toFixed(2)} V≥过驱动电压 ${result.overdriveV.toFixed(1)} V，满足平方律使用条件。` : "栅压未超过阈值 2 V，本模型忽略亚阈值电流，按截止处理。" };
  }
  const result = calculateOpampState(voltage);
  return { active: voltage !== 0, state: result.state,
    values: [["线性公式要求输出", `${result.idealV.toFixed(1)} V`], ["模型实际输出", `${result.outputV.toFixed(1)} V`], ["闭环增益", "10"]],
    explanation: result.state === "线性区" ? "输出在指定摆幅以内，稳定负反馈的线性近似可用。" : "输出达到或超过指定摆幅边界。超过边界时发生限幅，不能继续用虚短强制得到线性输出。" };
}

function renderDemo(lesson) {
  const config = demos[lesson.id];
  const section = element("section", "", "demo-card");
  const title = element("h3", config.title);
  const model = element("p", config.note + (config.kind === "fet" ? " 旧演示k=1mA/V²，对应新内容K=k/2=0.5mA/V²；原计算结果不变。" : ""), "model-note");
  const figure = element("figure", "", "circuit-figure");
  figure.tabIndex = 0;
  figure.setAttribute("aria-label", "电路图；窄屏可在图内横向滚动，聚焦后也可用方向键滚动。");
  // 仅插入 circuits.js 中固定白名单图形，输入数值从不拼入 SVG。
  figure.innerHTML = circuitMarkup(config.kind);
  figure.append(element("figcaption", "小屏可在图内横向滚动查看完整电路；也可先聚焦电路图，再使用方向键。"));
  const label = element("label", `${config.inputLabel}：`, "slider-label");
  const sliderId = `${lesson.id}-voltage`;
  label.htmlFor = sliderId;
  const voltageText = element("output");
  voltageText.htmlFor = sliderId;
  label.append(voltageText);
  const slider = document.createElement("input");
  slider.type = "range"; slider.id = sliderId;
  slider.min = config.min; slider.max = config.max; slider.step = config.step; slider.value = config.initial;
  const rangeHint = element("p", `范围 ${config.min}～${config.max} V；也可聚焦滑块后使用键盘方向键。`, "range-hint");
  const output = element("div", "", "demo-output");
  output.setAttribute("aria-live", "polite");
  output.setAttribute("aria-atomic", "true");
  const state = element("p", "", "demo-state");
  const meters = element("dl", "", "meter-grid");
  const explanation = element("p", "", "model-explanation");
  output.append(state, meters, explanation);
  function update() {
    try {
      const voltage = slider.valueAsNumber;
      const result = demoValues(config.kind, voltage);
      voltageText.textContent = `${voltage.toFixed(config.step === 0.01 ? 2 : 1)} V`;
      state.textContent = `工作状态：${result.state}`;
      figure.dataset.conducting = String(result.active);
      meters.replaceChildren();
      for (const [name, value] of result.values) {
        const cell = element("div");
        cell.append(element("dt", name), element("dd", value));
        meters.append(cell);
      }
      explanation.textContent = result.explanation;
    } catch (error) {
      voltageText.textContent = "无效输入";
      state.textContent = error.message;
      meters.replaceChildren();
      figure.dataset.conducting = "false";
      explanation.textContent = "请恢复滑块的有效输入范围。";
    }
  }
  slider.addEventListener("input", update);
  section.append(title, model, figure, label, slider, rangeHint, output);
  update();
  return section;
}

const container = document.getElementById("learning-units");
container.replaceChildren();
const stepTitles = ["判断与条件", "列式与求解", "计算与检查", "核对结论"];
for (const [index, lesson] of lessons.entries()) {
  const unit = element("section", "", "learning-unit");
  unit.id = lesson.id;
  const heading = element("div", "", "unit-heading");
  const intro = element("div");
  intro.append(element("p", `学习单元 ${String(index + 1).padStart(2, "0")}`, "eyebrow"), element("h2", lesson.title));
  const learnedLabel = element("label", "", "learned-label");
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  learnedLabel.append(checkbox, element("span", "本单元已阅读"));
  checkbox.addEventListener("change", () => commitProgress({ type: "set-learned", lessonId: lesson.id, learned: checkbox.checked }));
  progressViews.push({ lessonId: lesson.id, checkbox });
  heading.append(intro, learnedLabel);
  unit.append(heading);
  for (const section of lesson.sections) {
    const article = element("article", "", "knowledge-card");
    article.append(element("h3", section.title));
    for (const paragraph of section.text.split("\n")) article.append(element("p", paragraph));
    unit.append(article);
  }
  unit.append(element("h3", "典型例题 · 逐步展开", "subsection-title"), element("p", lesson.example.title, "example-question"));
  lesson.example.steps.forEach((step, i) => {
    const details = element("details", "", "example-step");
    details.append(element("summary", `步骤 ${i + 1} · ${stepTitles[i]}`), element("p", step));
    unit.append(details);
  });
  unit.append(element("h3", "互动练习 · 先独立作答", "subsection-title"));
  questions.filter(question => question.lessonId === lesson.id).forEach((question, i) => unit.append(renderQuestion(question, i)));
  unit.append(element("h3", "电路探索 · 调节参数", "subsection-title"), renderDemo(lesson));
  if (lesson.id === "fet-basics") mountFetLearning(unit);
  container.append(unit);
}
renderProgress();
document.getElementById("app-status").textContent = "页面脚本已加载 · 四个学习单元、练习与演示已就绪";
