import './tests.js';
import './fet-models.js';
import './fet-bias.js';
import './fet-ac.js';
import './fet-content.js';
import './fet-grading.js';
import './fet-progress.js';
import './fet-storage.js';
import { results } from './test-harness.js';

export { results };
if (typeof document !== 'undefined') {
  const list = document.getElementById('test-results');
  list.replaceChildren();
  for (const result of results) {
    const item = document.createElement('li');
    item.textContent = `${result.passed ? 'PASS' : 'FAIL'} · ${result.name}${result.message ? `：${result.message}` : ''}`;
    item.className = result.passed ? 'test-pass' : 'test-fail';
    list.append(item);
  }
  const failed = results.filter(r => !r.passed).length;
  document.getElementById('test-summary').textContent = `${results.length - failed} 项通过，${failed} 项失败，共 ${results.length} 项。`;
}
