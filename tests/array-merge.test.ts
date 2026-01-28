import { inferDefs } from '../src/schema/utils/defs-inferrer';
import { loadInferred } from '../src/loader/load-inferred';
import { stringify } from '../src/index';

describe('Array with varying object structures', () => {
  const data = {
    items: [
      { recode: "0" },
      { recode: "1", description: "1" }
    ]
  };

  it('should merge array item schemas with optional fields', () => {
    const { definitions } = inferDefs(data);
    
    console.log('=== Definitions ===');
    for (const [name, def] of definitions) {
      console.log(`${name}:`, JSON.stringify((def as any).defs || def, null, 2));
    }
    
    // $item schema should have recode (required) and description (optional)
    const itemSchema = definitions.get('$item');
    expect(itemSchema).toBeDefined();
    expect(itemSchema!.defs['recode'].type).toBe('string');
    expect(itemSchema!.defs['recode'].optional).toBeUndefined();
    expect(itemSchema!.defs['description'].type).toBe('string');
    expect(itemSchema!.defs['description'].optional).toBe(true);
  });

  it('should stringify successfully', () => {
    const doc = loadInferred(data);
    const ioText = stringify(doc, { includeHeader: true });
    console.log('=== Stringified ===\n', ioText);
    expect(ioText).toBeDefined();
  });
});
