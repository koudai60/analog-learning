import { lessons, questions } from "./content.js";

export const STORAGE_KEY = "analog-learning.progress.v1";
const emptyProgress = () => ({ version: 1, learnedLessonIds: [], masteredQuestionIds: [] });

function normalize(value) {
  if (!value || value.version !== 1 || !Array.isArray(value.learnedLessonIds) ||
      !Array.isArray(value.masteredQuestionIds) ||
      !value.learnedLessonIds.every(id => typeof id === "string") ||
      !value.masteredQuestionIds.every(id => typeof id === "string")) {
    throw new TypeError("记录结构不兼容");
  }
  const knownLessons = new Set(lessons.map(lesson => lesson.id));
  const knownQuestions = new Set(questions.map(question => question.id));
  const learnedLessonIds = [...new Set(value.learnedLessonIds.filter(id => knownLessons.has(id)))];
  const masteredQuestionIds = [...new Set(value.masteredQuestionIds.filter(id => knownQuestions.has(id)))];
  return { progress: { version: 1, learnedLessonIds, masteredQuestionIds },
    changed: learnedLessonIds.length !== value.learnedLessonIds.length || masteredQuestionIds.length !== value.masteredQuestionIds.length };
}

// 延迟调用 getStorage，连读取 window.localStorage 属性本身的异常也能捕获。
export function loadProgress(getStorage) {
  let raw;
  try { raw = getStorage().getItem(STORAGE_KEY); }
  catch { return { progress: emptyProgress(), warning: "无法读取浏览器记录；仍可学习，本次进度可能无法保存。" }; }
  if (raw === null) return { progress: emptyProgress(), warning: null };
  try {
    const result = normalize(JSON.parse(raw));
    return { progress: result.progress, warning: result.changed ? "已过滤记录中的重复或未知条目。" : null };
  } catch {
    return { progress: emptyProgress(), warning: "原记录已损坏或版本不兼容；本次从空进度开始。" };
  }
}

export function saveProgress(progress, getStorage) {
  try {
    const result = normalize(progress);
    getStorage().setItem(STORAGE_KEY, JSON.stringify(result.progress));
    return { saved: true, warning: result.changed ? "进度已整理并保存。" : null };
  } catch {
    return { saved: false, warning: "本次进度未保存；仍可继续学习，请检查浏览器存储权限。" };
  }
}
