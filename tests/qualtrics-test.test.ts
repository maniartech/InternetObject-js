import { inferDefs } from '../src/schema/utils/defs-inferrer';
import { loadInferred } from '../src/facade/load-inferred';
import { stringify } from '../src/index';

describe('Qualtrics Survey Structure', () => {
  // Simplified Qualtrics-like survey structure
  const qualtricsSurvey = {
    result: {
      questions: {
        QID1: {
          questionText: 'What is your name?',
          questionType: { type: 'TE' },  // Simple type
          choices: {
            '1': { recode: '0', description: '' }
          }
        },
        QID2: {
          questionText: 'How satisfied are you?',
          questionType: { type: 'MC', selector: 'SAVR', subSelector: 'TX' },  // Complex type
          choices: {
            '1': { recode: '1', description: 'Very satisfied' },
            '2': { recode: '2', description: 'Satisfied' }
          }
        },
        QID3: {
          questionText: 'Any comments?',
          questionType: { type: 'TE' },  // Simple type again
          choices: {
            '1': { recode: '0', description: '' }
          }
        }
      }
    }
  };

  it('infers schema from Qualtrics-like survey', () => {
    const { definitions, rootSchema } = inferDefs(qualtricsSurvey);

    // Should create schemas for the nested structures
    expect(definitions.get('$result')).toBeDefined();
    expect(definitions.get('$question')).toBeDefined();
    expect(definitions.get('$choice')).toBeDefined();

    // Question schema should have proper references
    const questionSchema = definitions.get('$question');
    expect(questionSchema!.defs['questionText'].type).toBe('string');

    // Dynamic-keyed objects (like choices) should NOT have schemaRef
    // because the schemaRef would describe the VALUE type, not the container
    expect(questionSchema!.defs['choices'].type).toBe('object');
    expect(questionSchema!.defs['choices'].schemaRef).toBeUndefined();

    // questionType should either be merged or plain object (depending on common keys)
    // Since all questionTypes share 'type' key, they should merge
    const questionTypeSchema = definitions.get('$questionType');
    if (questionTypeSchema) {
      expect(questionTypeSchema.defs['type'].type).toBe('string');
      expect(questionTypeSchema.defs['selector']?.optional).toBe(true);
      expect(questionTypeSchema.defs['subSelector']?.optional).toBe(true);
    }
  });

  it('loadInferred succeeds with Qualtrics-like survey', () => {
    // This was the original failure point - should no longer fail
    const doc = loadInferred(qualtricsSurvey);
    expect(doc).toBeDefined();
  });

  it('stringify succeeds with Qualtrics-like survey', () => {
    const doc = loadInferred(qualtricsSurvey);
    const ioText = stringify(doc, { includeHeader: true });
    expect(ioText).toBeDefined();
    expect(ioText.length).toBeGreaterThan(0);
  });
});
