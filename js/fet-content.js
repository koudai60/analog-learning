import { fetCombinations } from './fet-lessons.js';
import { fetExamples } from './fet-examples.js';
import { fetQuestions } from './fet-questions.js';
export { fetCombinations };
export const CONTENT_VERSION='fet-2026-10-v1';
export const fetCatalog={version:CONTENT_VERSION,combinations:fetCombinations,examples:fetExamples,questions:fetQuestions};
export const getFetCombination=id=>fetCombinations.find(c=>c.id===id)||null;
export const getFetQuestion=id=>fetCatalog.questions.find(q=>q.id===id)||null;
