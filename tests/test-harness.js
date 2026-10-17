// 一个测试抛出错误时，记录 FAIL 后继续运行其他测试。
export const results = [];
export function test(name, fn) {
  try {
    fn();
    results.push({ name, passed: true, message: "" });
  } catch (error) {
    results.push({ name, passed: false, message: error.message });
  }
}
export function assert(condition, message = "条件未满足") {
  if (!condition) throw new Error(message);
}
export function assertEqual(actual, expected) {
  assert(actual === expected, `预期 ${expected}，实际 ${actual}`);
}
export function assertNear(actual, expected, tolerance) {
  assert(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `预期 ${expected} ± ${tolerance}，实际 ${actual}`);
}

