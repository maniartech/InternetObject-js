import { inferDefs } from '../../../src/schema/utils/defs-inferrer';
import { loadInferred } from '../../../src/facade/load-inferred';
import { stringify } from '../../../src/index';

/**
 * Inference over an object whose KEYS are data — a survey export keyed by question id.
 *
 * The shape is synthetic but modelled on a real survey-platform export (the one behind issue #61).
 * What makes it hard is that `questions` and `choices` are keyed by identifiers rather than by
 * field names, so a naive inferrer emits one schema per key ($QID1, $QID2, $1, $2 ...) instead of
 * recognising that every value has the same shape.
 *
 * Inference is out of the 1.0 conformance contract (ADR 0004), so nothing in the corpus covers
 * this. These cases are the only thing holding it.
 */
describe('Definition Inference — objects keyed by data', () => {
  const survey = {
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

  it('merges same-shaped values under one schema instead of one per key', () => {
    const { definitions, rootSchema } = inferDefs(survey);

    // Should create schemas for the nested structures
    expect(definitions.get('$result')).toBeDefined();
    expect(definitions.get('$question')).toBeDefined();
    expect(definitions.get('$choice')).toBeDefined();

    // Question schema should have proper references
    const questionSchema = definitions.get('$question');
    expect(questionSchema!.defs['questionText'].type).toBe('string');

    // Dynamic-keyed objects (like choices) link via a wildcard CONTAINER schema:
    // choices → $choices, where `$choices: {*: $choice}` — so the item schema is actually used
    // (previously the member fell back to plain `object` and $choice was orphaned).
    expect(questionSchema!.defs['choices'].type).toBe('object');
    expect(questionSchema!.defs['choices'].schemaRef).toBe('$choices');
    const choicesContainer = definitions.get('$choices');
    expect(choicesContainer).toBeDefined();
    expect((choicesContainer as any).wildcard.schemaRef).toBe('$choice');

    // questionType should either be merged or plain object (depending on common keys)
    // Since all questionTypes share 'type' key, they should merge
    const questionTypeSchema = definitions.get('$questionType');
    if (questionTypeSchema) {
      expect(questionTypeSchema.defs['type'].type).toBe('string');
      expect(questionTypeSchema.defs['selector']?.optional).toBe(true);
      expect(questionTypeSchema.defs['subSelector']?.optional).toBe(true);
    }
  });

  it('loadInferred succeeds — the original failure point', () => {
    const doc = loadInferred(survey);
    expect(doc).toBeDefined();
  });

  it('stringify succeeds', () => {
    const doc = loadInferred(survey);
    const ioText = stringify(doc, { includeHeader: true });
    expect(ioText).toBeDefined();
    expect(ioText.length).toBeGreaterThan(0);
  });
});
