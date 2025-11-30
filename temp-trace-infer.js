const { inferDefs } = require('./dist/schema/utils/defs-inferrer');

const surveyData = {
  result: {
    questions: {
      QID1: {
        questionName: 'Q1',
        questionType: { type: 'MC' }  // Only has 'type'
      },
      QID2: {
        questionName: 'Q2',
        questionType: { type: 'TE', selector: 'ML', subSelector: null }  // Has 3 fields
      }
    }
  }
};

console.log('=== Tracing inferDefs ===\n');

// Manually trace the collection phase
function isDynamicKeyObject(obj) {
  const keys = Object.keys(obj);
  if (keys.length < 2) return false;
  const values = keys.map(k => obj[k]);
  const allObjects = values.every(v => v !== null && typeof v === 'object' && !Array.isArray(v));
  if (!allObjects) return false;
  const allValueKeys = values.map(v => new Set(Object.keys(v)));
  const firstKeys = allValueKeys[0];
  const commonKeys = [...firstKeys].filter(key => allValueKeys.every(keySet => keySet.has(key)));
  return commonKeys.length >= 1;
}

console.log('Is questions dynamic?', isDynamicKeyObject(surveyData.result.questions));
console.log('Is QID1.questionType dynamic?', isDynamicKeyObject(surveyData.result.questions.QID1.questionType));
console.log('Is QID2.questionType dynamic?', isDynamicKeyObject(surveyData.result.questions.QID2.questionType));

console.log('\n--- QID1.questionType keys:', Object.keys(surveyData.result.questions.QID1.questionType));
console.log('--- QID2.questionType keys:', Object.keys(surveyData.result.questions.QID2.questionType));

// Now run actual inferDefs
const { definitions, rootSchema } = inferDefs(surveyData);

console.log('\n=== Generated Schemas ===');
console.log('Schema names:', definitions.keys);

for (const name of definitions.keys) {
  if (name.includes('questionType') || name.includes('QuestionType')) {
    const schema = definitions.get(name);
    console.log(`\n${name}:`);
    console.log('  Members:', schema.names);
    for (const memberName of schema.names) {
      const def = schema.defs[memberName];
      console.log(`    ${memberName}: ${def.type}${def.optional ? '?' : ''}${def.null ? ' (nullable)' : ''}`);
    }
  }
}

// Check what $question looks like
const questionSchema = definitions.get('$question');
if (questionSchema) {
  console.log('\n$question:');
  console.log('  Members:', questionSchema.names);
  for (const memberName of questionSchema.names) {
    const def = questionSchema.defs[memberName];
    console.log(`    ${memberName}: ${def.type}${def.optional ? '?' : ''}${def.null ? ' (nullable)' : ''} -> ${def.schemaRef || 'n/a'}`);
  }
}
