import Tokenizer from '../../../src/parser/tokenizer';
import ASTParser from '../../../src/parser/ast-parser';
import ObjectNode from '../../../src/parser/nodes/objects';
import CollectionNode from '../../../src/parser/nodes/collections';
import TokenNode from '../../../src/parser/nodes/tokens';
import TokenType from '../../../src/parser/tokenizer/token-types';
import Token from '../../../src/parser/tokenizer/tokens';
import IODefinitions from '../../../src/core/definitions';
import Schema from '../../../src/schema/schema';
import ValidationError from '../../../src/errors/io-validation-error';
import ErrorCodes from '../../../src/errors/io-error-codes';
import processSchema from '../../../src/schema/processor';
import compileObject from '../../../src/schema/compile-object';

function parseFirstChildObject(source: string): ObjectNode {
  const tokens = new Tokenizer(source).tokenize();
  const ast = new ASTParser(tokens).parse();
  const section = ast.children[0];
  if (!(section.child instanceof ObjectNode)) {
    throw new Error('Expected ObjectNode');
  }
  return section.child as ObjectNode;
}

function parseFirstChildCollection(source: string): CollectionNode {
  const tokens = new Tokenizer(source).tokenize();
  const ast = new ASTParser(tokens).parse();
  const section = ast.children[0];
  if (!(section.child instanceof CollectionNode)) {
    throw new Error('Expected CollectionNode');
  }
  return section.child as CollectionNode;
}

function makeStringTokenNode(value: string): TokenNode {
  const t = new Token();
  t.type = TokenType.STRING;
  t.value = value;
  t.token = value;
  t.pos = 0; t.row = 1; t.col = 1;
  return new TokenNode(t);
}

describe('Revamp suite: Definitions and processing contracts', () => {
  test('definitions: resolves present @var and $Schema', () => {
    const defs = new IODefinitions();
    defs.set('@r', 'red');
    const emp = new Schema('Employee');
    defs.set('$Employee', emp);

    expect(defs.getV('@r')).toBe('red');
    expect(defs.getV('$Employee')).toBe(emp);
  });

  test('definitions: missing $Schema throws schemaNotDefined', () => {
    const defs = new IODefinitions();
    try {
      defs.getV('$MissingSchema');
      throw new Error('Expected schemaNotDefined error');
    } catch (e: any) {
  expect(e).toBeInstanceOf(ValidationError);
  expect(e.errorCode).toBe(ErrorCodes.schemaNotDefined);
      // Position is undefined when key is provided as string
      // console.log('schemaNotDefined', { code: e.code, message: e.message, pos: e.position });
    }
  });

  test('definitions: missing @var throws variableNotDefined', () => {
    const defs = new IODefinitions();
    try {
      defs.getV('@missingVar');
      throw new Error('Expected variableNotDefined error');
    } catch (e: any) {
  expect(e).toBeInstanceOf(ValidationError);
  expect(e.errorCode).toBe(ErrorCodes.variableNotDefined);
      // console.log('variableNotDefined', { code: e.code, message: e.message, pos: e.position });
    }
  });

  test('processSchema: returns null for null data', () => {
    const schema = new Schema('Dummy');
    const result = processSchema(null as any, schema, undefined as any);
    expect(result).toBeNull();
  });
});

describe('Revamp plan coverage (non-invasive)', () => {
  describe('Definitions: @ and $ resolution error modes', () => {
    test('missing $Schema throws schemaNotDefined', () => {
      const defs = new IODefinitions();
      const tok = makeStringTokenNode('$Missing');
      expect(() => defs.getV(tok)).toThrow(ValidationError);
      try {
        defs.getV(tok);
      } catch (e: any) {
  expect(e).toBeInstanceOf(ValidationError);
  expect(e.errorCode).toBe(ErrorCodes.schemaNotDefined);
      }
    });

    test('missing @var throws variableNotDefined', () => {
      const defs = new IODefinitions();
      const tok = makeStringTokenNode('@color');
      expect(() => defs.getV(tok)).toThrow(ValidationError);
      try {
        defs.getV(tok);
      } catch (e: any) {
  expect(e).toBeInstanceOf(ValidationError);
  expect(e.errorCode).toBe(ErrorCodes.variableNotDefined);
      }
    });
  });

  describe('compileObject: open schema and additional properties', () => {
    test('star at last makes schema open (no value)', () => {
      const node = parseFirstChildObject('{ name, * }');
      const schema = compileObject('Test', node);
      expect(schema).toBeTruthy();
      // @ts-ignore
      expect((schema as any).open).toBe(true);
    });

    test('star not at last position throws', () => {
      const node = parseFirstChildObject('{ *, name }');
      expect(() => compileObject('Test', node)).toThrow();
    });

    test('additional props with type value canonicalizes and mirrors to schema.open', () => {
      const node = parseFirstChildObject('{ name, *: string }');
      const schema: any = compileObject('Test', node);
      expect(schema.defs['*']).toBeTruthy();
      expect(typeof schema.open).toBe('object');
      expect(schema.defs['*'].type || schema.open.type).toBe('string');
    });

    test("schema.names doesn't include '*' (regression guard)", () => {
      const node = parseFirstChildObject('{ name, *: number }');
      const schema: any = compileObject('NoStarInNames', node);
      expect(schema.names.includes('*')).toBe(false);
    });

  test('typed open schema validates unknown members against the type', () => {
      const node = parseFirstChildObject('{ name, *: number }');
      const schema: any = compileObject('TypedOpen', node);
      // Compile-time mirror check
      expect(schema.open && schema.open.type).toBe('number');
      // extra with wrong type should fail
      const bad = parseFirstChildObject('{ name: John, extra: "oops" }');
      try {
        processSchema(bad, schema, new IODefinitions());
        throw new Error('Expected validation to throw for wrong-typed open member');
      } catch (e) {
        expect(e).toBeInstanceOf(ValidationError);
      }
      // extra with correct type should pass
      const good = parseFirstChildObject('{ name: John, extra: 42 }');
      const ok = processSchema(good, schema, new IODefinitions());
      expect(ok).toBeTruthy();
    });
  });

  describe('compileObject: keyless fields infer any', () => {
    test('name and age? infer type any and flags', () => {
      const node = parseFirstChildObject('{ name, age? }');
      const schema: any = compileObject('Test', node);
      expect(schema.defs.name).toBeTruthy();
      expect(schema.defs.name.type).toBe('any');
      expect(schema.defs.age.optional).toBe(true);
      expect(schema.defs.age.type).toBe('any');
    });

    test('suffix parsing: name*, flag?*, and flag* set null/optional correctly', () => {
      const node = parseFirstChildObject('{ name*, opt?, both?* }');
      const schema: any = compileObject('Suffixes', node);
      expect(schema.defs.name.null).toBe(true);
      expect(schema.defs.name.optional).toBe(false);
      expect(schema.defs.opt.optional).toBe(true);
      expect(schema.defs.opt.null).toBe(false);
      expect(schema.defs.both.optional).toBe(true);
      expect(schema.defs.both.null).toBe(true);
    });
  });

  describe('Object typedefs: built-in shorthand and $schemaVar support', () => {
    test('built-in shorthand { string, minLen: 2 } compiles via typedef schema', () => {
      const node = parseFirstChildObject('{ name: { string, minLen: 2 } }');
      const schema: any = compileObject('Types', node);
      expect(schema.defs.name).toBeTruthy();
      expect(schema.defs.name.type).toBe('string');
      expect(schema.defs.name.minLen).toBe(2);
    });

    test('invalid constraint for string (min) throws via typedef schema', () => {
      const node = parseFirstChildObject('{ name: { string, min: 1 } }');
      expect(() => compileObject('Types', node)).toThrow();
    });

    test('schema var shorthand { $Person } sets type object with schema token', () => {
      const node = parseFirstChildObject('{ person: { $Person } }');
      const schema: any = compileObject('Types', node);
      expect(schema.defs.person.type).toBe('object');
      expect(schema.defs.person.schema).toBeTruthy();
    });

    test('type: $Person supported in object typedef', () => {
      const node = parseFirstChildObject('{ person: { type: $Person } }');
      const schema: any = compileObject('Types', node);
      expect(schema.defs.person.type).toBe('object');
      expect(schema.defs.person.schema).toBeTruthy();
    });
  });

  describe('Object typedefs: $schemaVar parity', () => {
    test('shorthand: first member is $Var inside object typedef', () => {
      const node = parseFirstChildObject('{ person: { $Person, min: 1 } }');
      const schema: any = compileObject('ObjVar', node);
      expect(schema.defs.person.type).toBe('object');
      expect(schema.defs.person.schema).toBeInstanceOf(TokenNode);
      expect(schema.defs.person.schema.value).toBe('$Person');
    });

    test('type property: { type: $Var, ... } inside object typedef', () => {
      const node = parseFirstChildObject('{ person: { type: $Person, min: 1 } }');
      const schema: any = compileObject('ObjVarType', node);
      expect(schema.defs.person.type).toBe('object');
      expect(schema.defs.person.schema).toBeInstanceOf(TokenNode);
      expect(schema.defs.person.schema.value).toBe('$Person');
    });
  });

  describe('processSchema routing and open/closed behavior', () => {
    test('routes ObjectNode and CollectionNode; null returns null', () => {
      const obj = parseFirstChildObject('1, 2, 3');
      const col = parseFirstChildCollection('~ 1,2\n~ 3,4');
      const openSchema: any = compileObject('Open', parseFirstChildObject('{ * }'));

  const defs = new IODefinitions();
      const r1 = processSchema(obj, openSchema, defs);
      expect(r1).toBeTruthy();
      const r2 = processSchema(col, openSchema, defs);
      expect(r2).toBeTruthy();
      const r3 = processSchema(null as any, openSchema, defs);
      expect(r3).toBeNull();
    });

    test('closed schema rejects extra keyed members; open accepts', () => {
      const closed = compileObject('Closed', parseFirstChildObject('{ name, age }')) as any;
      const open = compileObject('Open', parseFirstChildObject('{ name, age, * }')) as any;
  const defs = new IODefinitions();

      const objWithExtra = parseFirstChildObject('{ name: John, age: 30, extra: true }');
      expect(() => processSchema(objWithExtra, closed, defs)).toThrow();

      const ok = processSchema(objWithExtra, open, defs);
      expect(ok).toBeTruthy();
    });

    test('processSchema accepts a TokenNode $schema and resolves via defs', () => {
      const schemaNode = parseFirstChildObject('{ name, age }');
      const schema = compileObject('Employee', schemaNode) as any;
      const token = makeStringTokenNode('$Employee');
      const defs = new IODefinitions();
      defs.set('$Employee', schema);
      const obj = parseFirstChildObject('{ name: John, age: 30 }');
      const io = processSchema(obj, token, defs);
      expect(io).toBeTruthy();
    });
  });

  describe('End-to-end parsing with header defs and variables', () => {
    test('parses when @ variables are defined and $schema provided', () => {
      const doc = `
~ @r: red
~ @g: green
~ @b: blue
~ $schema: { name: string, email: email, joiningDt: date, color: {string, choices: [@r, @g, @b]} }
---
~ John Doe, john.doe@example.com, d'2020-01-01', @r
`;
      // Use full parser to ensure integration path works
      const tokens = new Tokenizer(doc).tokenize();
      const ast = new ASTParser(tokens).parse();
      expect(ast).toBeTruthy();
      // Processing occurs in parse(), but we validate AST forms here non-invasively
      // Header child can be ObjectNode (single schema) or CollectionNode (multiple defs)
      const headerChild = ast.header?.child as any;
      expect(
        headerChild instanceof ObjectNode || headerChild instanceof CollectionNode
      ).toBe(true);
    });

    test('parses when @ variables are defined (no undefined variable test)', () => {
      const parse = require('../../../src/parser/index').default as Function;
      const doc = `
~ @r: red
~ @g: green
~ $schema: { name: string, email: email, joiningDt: date, color: string }
---
~ John Doe, john.doe@example.com, d'2020-01-01', @r
~ Jane Doe, jane.doe@example.com, d'2020-02-01', @g
`;
      // Should parse successfully when all variables are defined
      const result = parse(doc, null);
      expect(result).toBeDefined();

      const data = result.toJSON();
      expect(data).toHaveLength(2);
      expect(data[0].color).toBe('red'); // @r resolves to 'red'
      expect(data[1].color).toBe('green'); // @g resolves to 'green'
    });
  });

  describe('Arrays: item optionality cleanup (planned change)', () => {
    test('empty array should not mark items as optional (to be changed)', () => {
      const node = parseFirstChildObject('{ tags: [] }');
      const schema: any = compileObject('Test', node);
      // Current behavior: optional:true present on items; planned: remove it
      expect(schema.defs.tags.type).toBe('array');
      expect(schema.defs.tags.of.optional).toBeUndefined(); // planned assertion now enforced
    });
  });

  describe('Registry idempotency (planned)', () => {
  test('Duplicate type registration should be idempotent and produce no warnings via registerTypes()', () => {
      const TypedefRegistry = require('../../../src/schema/typedef-registry').default as any;
      const typesIndex = require('../../../src/schema/types');

      // Ensure warnings are enabled for this test and spy on console.warn locally
      TypedefRegistry.setWarnOnDuplicates(true);
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // Capture initial count and attempt to register built-in types again
      const beforeCount = TypedefRegistry.count;
      const { default: registerTypes } = typesIndex;

  // First duplicate registration should not change count and should not warn
      registerTypes();
      const afterFirst = TypedefRegistry.count;
      expect(afterFirst).toBe(beforeCount);

      const warnsAfterFirst = warnSpy.mock.calls.length;
  expect(warnsAfterFirst).toBe(0);

  // Second duplicate registration should produce no warnings either
      registerTypes();
      const warnsAfterSecond = warnSpy.mock.calls.length;
      expect(warnsAfterSecond).toBe(warnsAfterFirst);

      warnSpy.mockRestore();
    });
  });

  describe('Duplicate member detection (planned)', () => {
    test('Compiling schema with duplicate field names should throw', () => {
      const node = parseFirstChildObject('{ name: string, name: number }');
      try {
        compileObject('DupFields', node);
        throw new Error('Expected duplicateMember error');
      } catch (e: any) {
        expect(e).toBeInstanceOf(Error);
        expect(e.errorCode || e.code).toBe(ErrorCodes.duplicateMember);
      }
    });
  });
});
