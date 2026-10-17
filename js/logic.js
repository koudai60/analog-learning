export function evaluateAnswer(question, selectedOptionId) {
  if (selectedOptionId === null || selectedOptionId === undefined || selectedOptionId === "") {
    return { status: "unanswered", explanation: "请先选择一个答案，再提交。" };
  }
  if (!question.options.some(option => option.id === selectedOptionId)) {
    return { status: "invalid", explanation: "选项无效，请重新选择。" };
  }
  return {
    status: selectedOptionId === question.correctOptionId ? "correct" : "incorrect",
    explanation: question.explanation
  };
}

function requireRange(value, min, max) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new RangeError(`电压必须是 ${min}～${max} V 之间的有限数值。`);
  }
}
export function calculateDiodeCurrent(sourceV) {
  requireRange(sourceV, 0, 5);
  return sourceV <= 0.7 ? 0 : (sourceV - 0.7) / 1000;
}
export function calculateBjtState(inputV) {
  requireRange(inputV, 0, 5);
  const baseA = Math.max(0, inputV - 0.7) / 47000;
  const collectorA = Math.min(100 * baseA, 0.0048);
  const collectorV = 5 - collectorA * 1000;
  return { baseA, collectorA, collectorV,
    state: baseA === 0 ? "截止" : 100 * baseA >= 0.0048 ? "饱和近似" : collectorV < 0.7 ? "过渡区近似" : "放大区" };
}
export function calculateFetState(gateV) {
  requireRange(gateV, 0, 5);
  const overdriveV = Math.max(0, gateV - 2);
  const currentA = 0.001 / 2 * overdriveV ** 2;
  return { currentA, overdriveV, drainV: 10 - currentA * 1000,
    state: currentA === 0 ? "截止" : "饱和区" };
}
export function calculateOpampState(inputV) {
  requireRange(inputV, -2, 2);
  const idealV = 10 * inputV;
  return { gain: 10, idealV, outputV: Math.max(-12, Math.min(12, idealV)),
    state: idealV >= 12 ? "正向限幅/边界" : idealV <= -12 ? "负向限幅/边界" : "线性区" };
}
import { lessons, questions } from "./content.js";


export function updateProgress(progress, action) {
  const next = { version: 1,
    learnedLessonIds: [...new Set(progress.learnedLessonIds)],
    masteredQuestionIds: [...new Set(progress.masteredQuestionIds)] };
  if (action.type === "set-learned" && lessons.some(lesson => lesson.id === action.lessonId) && typeof action.learned === "boolean") {
    next.learnedLessonIds = next.learnedLessonIds.filter(id => id !== action.lessonId);
    if (action.learned) next.learnedLessonIds.push(action.lessonId);
  } else if (action.type === "master-question" && questions.some(question => question.id === action.questionId)) {
    if (!next.masteredQuestionIds.includes(action.questionId)) next.masteredQuestionIds.push(action.questionId);
  } else {
    throw new RangeError("未知的进度动作、单元或题目。");
  }
  return next;
}
