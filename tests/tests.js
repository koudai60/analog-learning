import { lessons, questions, demos } from "../js/content.js";
import { evaluateAnswer, calculateDiodeCurrent, calculateBjtState, calculateFetState, calculateOpampState, updateProgress } from "../js/logic.js";
import { loadProgress, saveProgress, STORAGE_KEY } from "../js/storage.js";

import { test, assert, assertEqual, assertNear } from "./test-harness.js";
export { test, assert, assertEqual, assertNear, results } from "./test-harness.js";

test("四个学习单元使用稳定且唯一的 ID", () => {
  assertEqual(lessons.length, 4);
  assertEqual(lessons[0].id, "diode-basics");
  assertEqual(new Set(lessons.map(lesson => lesson.id)).size, 4);
});
test("单元标题、知识点标题与正文均不为空", () => {
  assert(lessons.length > 0, "缺少学习单元");
  for (const lesson of lessons) {
    assert(lesson.title.trim().length > 0, "缺少单元标题");
    assert(lesson.sections.length >= 3, "需要偏置、模型等知识点");
    for (const section of lesson.sections) {
      assert(section.title.trim().length > 0 && section.text.trim().length > 0, "知识点不完整");
    }
  }
});
test("例题具有标题和四个完整步骤", () => {
  assert(lessons.length > 0, "缺少学习单元");
  for (const {example} of lessons) {
    assert(example.title.trim().length > 0, "缺少例题标题");
    assertEqual(example.steps.length, 4);
    assert(example.steps.every(step => typeof step === "string" && step.trim().length > 0));
  }
});
test("四个单元各有三题，题目 ID 不重复", () => {
  assertEqual(questions.length, 12);
  assertEqual(new Set(questions.map(q => q.id)).size, 12);
  for (const lesson of lessons) assertEqual(questions.filter(q => q.lessonId === lesson.id).length, 3);
});
test("每题均关联实际存在的学习单元", () => {
  assertEqual(questions.length, 12);
  for (const question of questions) {
    assert(lessons.some(lesson => lesson.id === question.lessonId), `未知单元：${question.lessonId}`);
  }
});
test("每题有完整题干和解析", () => {
  assertEqual(questions.length, 12);
  for (const question of questions) {
    assert(question.prompt.trim().length > 0 && question.explanation.trim().length > 0);
  }
});
test("每题四个选项完整，A/B/C/D 不重复", () => {
  assertEqual(questions.length, 12);
  for (const question of questions) {
    assertEqual(question.options.map(option => option.id).join(","), "A,B,C,D");
    assert(question.options.every(option => option.text.trim().length > 0));
  }
});
test("每题正确答案恰好对应一个真实选项", () => {
  assertEqual(questions.length, 12);
  for (const question of questions) {
    assertEqual(question.options.filter(option => option.id === question.correctOptionId).length, 1);
  }
});

for (const question of questions) {
  test(`${question.id}：未选择时只提示操作，不给解析`, () => {
    const result = evaluateAnswer(question, null);
    assertEqual(result.status, "unanswered");
    assert(result.explanation.length > 0);
    assert(result.explanation !== question.explanation);
  });
  test(`${question.id}：未知选项被拒绝`, () => {
    assertEqual(evaluateAnswer(question, "unknown").status, "invalid");
  });
  test(`${question.id}：正确答案有解析`, () => {
    const result = evaluateAnswer(question, question.correctOptionId);
    assertEqual(result.status, "correct");
    assertEqual(result.explanation, question.explanation);
  });
  test(`${question.id}：错误答案有解析`, () => {
    const wrong = question.options.find(option => option.id !== question.correctOptionId).id;
    assertEqual(evaluateAnswer(question, wrong).status, "incorrect");
  });
}

for (const [voltage, current] of [[0, 0], [0.7, 0], [0.8, 0.0001], [5, 0.0043]]) {
  test(`二极管 ${voltage} V 边界/电流`, () => assertNear(calculateDiodeCurrent(voltage), current, 1e-12));
}
test("三极管截止、放大、饱和与电压自洽", () => {
  assertEqual(calculateBjtState(0).state, "截止");
  assertNear(calculateBjtState(1.64).baseA, 20e-6, 1e-12);
  assertNear(calculateBjtState(1.64).collectorA, 0.002, 1e-12);
  assertNear(calculateBjtState(1.64).collectorV, 3, 1e-12);
  assertEqual(calculateBjtState(1.64).state, "放大区");
  assertNear(calculateBjtState(5).collectorA, 0.0048, 1e-12);
  assertNear(calculateBjtState(5).collectorV, 0.2, 1e-12);
  assertEqual(calculateBjtState(5).state, "饱和近似");
  assertEqual(calculateBjtState(2.86).state, "过渡区近似");
});
test("NMOS 阈值、平方律与负载线自洽", () => {
  assertNear(calculateFetState(2).currentA, 0, 1e-12);
  assertEqual(calculateFetState(2).state, "截止");
  assertNear(calculateFetState(4).currentA, 0.002, 1e-12);
  assertNear(calculateFetState(4).drainV, 8, 1e-12);
  for (let i=0;i<=50;i++) {
    const v=i/10, result=calculateFetState(v);
    assert(result.currentA>=0 && result.drainV>=0);
    if(v>2) assert(result.drainV>=v-2, "超出平方律适用区");
  }
  assertNear(calculateFetState(5).currentA, 0.0045, 1e-12);
});
test("运放增益、正负限幅及边界", () => {
  assertNear(calculateOpampState(0.5).outputV, 5, 1e-12);
  assertNear(calculateOpampState(-0.5).outputV, -5, 1e-12);
  assertNear(calculateOpampState(2).outputV, 12, 1e-12);
  assertNear(calculateOpampState(-2).outputV, -12, 1e-12);
  assertNear(calculateOpampState(1.2).outputV, 12, 1e-12);
  assertEqual(calculateOpampState(0).state, "线性区");
  assert(calculateOpampState(2).state.includes("限幅"));
});
for (const [name, calculate, invalid] of [
  ["二极管",calculateDiodeCurrent,[-1,5.1,NaN,Infinity,"5",null]],
  ["三极管",calculateBjtState,[-1,5.1,NaN,Infinity,"5",null]],
  ["场效应管",calculateFetState,[-1,5.1,NaN,Infinity,"5",null]],
  ["运放",calculateOpampState,[-2.1,2.1,NaN,Infinity,"1",null]]
]) {
  test(`${name}拒绝越界、非有限值、字符串和空值`, () => {
    for(const value of invalid){
      let error;
      try { calculate(value); } catch(e) { error=e; }
      assert(error instanceof RangeError, `未拒绝 ${String(value)}`);
    }
  });
}

const emptyProgress = () => ({version:1, learnedLessonIds:[], masteredQuestionIds:[]});
test("每个单元演示参数范围有效", () => {
  for (const lesson of lessons) {
    const demo = demos[lesson.id];
    assert(demo && demo.min <= demo.initial && demo.initial <= demo.max && demo.step > 0);
  }
});
test("阅读标记可取消，不修改输入或清除掌握题目", () => {
  const original = emptyProgress();
  original.masteredQuestionIds.push("diode-q1");
  const next = updateProgress(original,{type:"set-learned",lessonId:"diode-basics",learned:true});
  assertEqual(original.learnedLessonIds.length,0);
  assertEqual(next.learnedLessonIds.length,1);
  const cancelled = updateProgress(next,{type:"set-learned",lessonId:"diode-basics",learned:false});
  assertEqual(cancelled.learnedLessonIds.length,0);
  assertEqual(cancelled.masteredQuestionIds[0],"diode-q1");
});
test("重复答对去重，四单元/十二题计数不超过上限", () => {
  let p=emptyProgress();
  for(const lesson of lessons) for(let i=0;i<2;i++) p=updateProgress(p,{type:"set-learned",lessonId:lesson.id,learned:true});
  for(const question of questions) for(let i=0;i<2;i++) p=updateProgress(p,{type:"master-question",questionId:question.id});
  assertEqual(p.learnedLessonIds.length,4); assertEqual(p.masteredQuestionIds.length,12);
});
test("未知单元、题目及动作不能污染进度", () => {
  for(const action of [{type:"set-learned",lessonId:"unknown",learned:true},{type:"master-question",questionId:"unknown"},{type:"unknown"}]) {
    let error;try{updateProgress(emptyProgress(),action);}catch(e){error=e;}
    assert(error instanceof RangeError);
  }
});
function memoryStorage(initial=null) {
  let raw=initial;
  return {getItem(key){assertEqual(key,STORAGE_KEY);return raw;},setItem(key,value){assertEqual(key,STORAGE_KEY);raw=value;}};
}
test("空存储返回空进度且无警告", () => {
  const loaded=loadProgress(()=>memoryStorage());
  assertEqual(JSON.stringify(loaded.progress),JSON.stringify(emptyProgress())); assertEqual(loaded.warning,null);
});
test("正常进度保存后能够恢复", () => {
  const store=memoryStorage();
  const p={version:1,learnedLessonIds:["fet-basics"],masteredQuestionIds:["fet-q2"]};
  assertEqual(saveProgress(p,()=>store).saved,true);
  assertEqual(JSON.stringify(loadProgress(()=>store).progress),JSON.stringify(p));
});
for(const raw of ["{broken", "null", "[]", JSON.stringify({version:2,learnedLessonIds:[],masteredQuestionIds:[]}),JSON.stringify({version:1,learnedLessonIds:"bad",masteredQuestionIds:[]}),JSON.stringify({version:1,learnedLessonIds:[3],masteredQuestionIds:[]})]) {
  test(`损坏或不兼容记录安全回退：${raw}`,()=>{
    const loaded=loadProgress(()=>memoryStorage(raw));
    assertEqual(JSON.stringify(loaded.progress),JSON.stringify(emptyProgress()));
    assert(typeof loaded.warning==="string" && loaded.warning.length>0);
  });
}
test("未知与重复 ID 被过滤且提示",()=>{
  const raw=JSON.stringify({version:1,learnedLessonIds:["diode-basics","diode-basics","unknown"],masteredQuestionIds:["fet-q1","fet-q1","unknown"]});
  const loaded=loadProgress(()=>memoryStorage(raw));
  assertEqual(loaded.progress.learnedLessonIds.join(),"diode-basics");
  assertEqual(loaded.progress.masteredQuestionIds.join(),"fet-q1");
  assert(loaded.warning);
});
test("存储 getter 或读取抛错仍能加载空进度",()=>{
  for(const getter of [()=>{throw new Error("blocked");},()=>({getItem(){throw new Error("blocked");}})]) {
    const loaded=loadProgress(getter);
    assertEqual(loaded.progress.version,1); assert(loaded.warning);
  }
});
test("保存失败明确提示，不修改会话内状态",()=>{
  const p={version:1,learnedLessonIds:["diode-basics"],masteredQuestionIds:[]};
  for(const getter of [()=>{throw new Error("blocked");},()=>({setItem(){throw new Error("quota");}})]) {
    const result=saveProgress(p,getter);
    assertEqual(result.saved,false); assert(result.warning.includes("本次进度未保存"));
    assertEqual(p.learnedLessonIds[0],"diode-basics");
  }
});

