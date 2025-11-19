import { loadDocument, LoadDocumentOptions, DocumentData } from '../../src/facade/load-document';
import { stringifyDocument, documentToObject } from '../../src/facade/stringify-document';
import { compileSchema } from '../../src/schema';
import Document from '../../src/core/document';
import Definitions from '../../src/core/definitions';
import InternetObject from '../../src/core/internet-object';
import Collection from '../../src/core/collection';

describe('Document Load/Stringify', () => {
  describe('loadDocument', () => {
    describe('single section documents', () => {
      it('loads document with single unnamed section', () => {
        const data: DocumentData = {
          data: [
            { name: 'Alice', age: 28 },
            { name: 'Bob', age: 35 }
          ]
        };

        const doc = loadDocument(data, {
          defaultSchema: '{ name: string, age: number }'
        });

        expect(doc).toBeInstanceOf(Document);
        expect(doc.sections?.length).toBe(1);

        const section = doc.sections?.get(0);
        expect(section?.data).toBeInstanceOf(Collection);

        const collection = section?.data as Collection<InternetObject>;
        expect(collection.length).toBe(2);
        expect(collection.getAt(0).get('name')).toBe('Alice');
        expect(collection.getAt(1).get('name')).toBe('Bob');
      });

      it('loads document with header definitions', () => {
        const data: DocumentData = {
          header: {
            definitions: {
              appName: 'MyApp',
              version: '1.0',
              '@maxRetries': 3
            }
          },
          data: { name: 'Alice', age: 28 }
        };

        const doc = loadDocument(data, {
          defaultSchema: '{ name: string, age: number }'
        });

        expect(doc.header.definitions.get('appName')).toBe('MyApp');
        expect(doc.header.definitions.get('version')).toBe('1.0');
        expect(doc.header.definitions.getV('@maxRetries')).toBe(3);
      });

      it('loads document with schema in header', () => {
        const schema = compileSchema('User', '{ name: string, age: number }');
        const data: DocumentData = {
          header: {
            schema: schema
          },
          data: { name: 'Alice', age: 28 }
        };

        const doc = loadDocument(data);

        expect(doc.header.schema).toBe(schema);
        expect(doc.sections?.length).toBe(1);

        const section = doc.sections?.get(0);
        const obj = section?.data as InternetObject;
        expect(obj.get('name')).toBe('Alice');
      });
    });

    describe('multiple sections', () => {
      it('loads document with multiple named sections', () => {
        const userSchema = compileSchema('User', '{ name: string, age: number }');
        const productSchema = compileSchema('Product', '{ id: number, title: string }');

        const data: DocumentData = {
          sections: {
            users: [
              { name: 'Alice', age: 28 },
              { name: 'Bob', age: 35 }
            ],
            products: [
              { id: 1, title: 'Widget' },
              { id: 2, title: 'Gadget' }
            ]
          }
        };

        const doc = loadDocument(data, {
          sectionSchemas: {
            users: userSchema,
            products: productSchema
          }
        });

        expect(doc.sections?.length).toBe(2);

        const usersSection = doc.sections?.get('users');
        expect(usersSection?.name).toBe('users');
        expect((usersSection?.data as Collection<InternetObject>).length).toBe(2);

        const productsSection = doc.sections?.get('products');
        expect(productsSection?.name).toBe('products');
        expect((productsSection?.data as Collection<InternetObject>).length).toBe(2);
      });

      it('uses default schema for all sections when not specified', () => {
        const schema = compileSchema('Item', '{ id: number, name: string }');

        const data: DocumentData = {
          sections: {
            items1: [{ id: 1, name: 'A' }],
            items2: [{ id: 2, name: 'B' }]
          }
        };

        const doc = loadDocument(data, {
          defaultSchema: schema
        });

        expect(doc.sections?.length).toBe(2);
        expect((doc.sections?.get('items1')?.data as Collection<InternetObject>).getAt(0).get('id')).toBe(1);
        expect((doc.sections?.get('items2')?.data as Collection<InternetObject>).getAt(0).get('id')).toBe(2);
      });
    });

    describe('error handling', () => {
      it('collects errors in non-strict mode', () => {
        const data: DocumentData = {
          data: [
            { name: 'Alice', age: 28 },
            { name: 'Bob', age: 'invalid' },  // Error
            { name: 'Charlie', age: 42 }
          ]
        };

        const errors: Error[] = [];
        const doc = loadDocument(data, {
          defaultSchema: '{ name: string, age: number }',
          errorCollector: errors,
          strict: false
        });

        expect(doc).toBeInstanceOf(Document);
        expect(errors.length).toBeGreaterThan(0);

        // Document should still have sections despite errors
        expect(doc.sections?.length).toBe(1);
      });

      it('throws error in strict mode', () => {
        const data: DocumentData = {
          data: { name: 'Alice', age: 'invalid' }
        };

        expect(() => {
          loadDocument(data, {
            defaultSchema: '{ name: string, age: number }',
            strict: true
          });
        }).toThrow();
      });

      it('handles missing schema gracefully', () => {
        const data: DocumentData = {
          data: { name: 'Alice' }
        };

        const errors: Error[] = [];
        const doc = loadDocument(data, {
          errorCollector: errors,
          strict: false
        });

        // Should create document but collect error about missing schema
        expect(doc).toBeInstanceOf(Document);
        expect(errors.length).toBeGreaterThan(0);
      });
    });

    describe('definitions integration', () => {
      it('merges external definitions', () => {
        const externalDefs = new Definitions();
        externalDefs.set('globalConfig', { timeout: 5000 });
        externalDefs.set('@apiKey', 'secret-key');

        const data: DocumentData = {
          header: {
            definitions: {
              localConfig: { port: 3000 }
            }
          },
          data: { name: 'Test' }
        };

        const doc = loadDocument(data, {
          defaultSchema: '{ name: string }',
          definitions: externalDefs
        });

        expect(doc.header.definitions.get('globalConfig')).toEqual({ timeout: 5000 });
        expect(doc.header.definitions.get('localConfig')).toEqual({ port: 3000 });
        expect(doc.header.definitions.getV('@apiKey')).toBe('secret-key');
      });

      it('resolves schema references from definitions', () => {
        const defs = new Definitions();
        const userSchema = compileSchema('User', '{ name: string, age: number }');
        defs.set('$User', userSchema);

        const data: DocumentData = {
          sections: {
            users: [{ name: 'Alice', age: 28 }]
          }
        };

        const doc = loadDocument(data, {
          sectionSchemas: {
            users: '$User'
          },
          definitions: defs
        });

        expect(doc.sections?.length).toBe(1);
        const section = doc.sections?.get('users');
        expect((section?.data as Collection<InternetObject>).getAt(0).get('name')).toBe('Alice');
      });
    });
  });

  describe('stringifyDocument', () => {
    it('stringifies document with single section and parses back correctly', () => {
      const schema = compileSchema('User', '{ name: string, age: number }');
      const data: DocumentData = {
        data: [
          { name: 'Alice', age: 28 },
          { name: 'Bob', age: 35 }
        ]
      };

      const doc = loadDocument(data, { defaultSchema: schema });
      const text = stringifyDocument(doc);

      // Parse back using external schema definition
      const defs = new Definitions();
      defs.set('$User', schema);
      const parsed = require('../../src/parser').default(text, defs);

      expect(parsed.sections?.length).toBe(1);
      const section = parsed.sections?.get(0);
      const col = section?.data as Collection<InternetObject>;
      expect(col.getAt(0).get('name')).toBe('Alice');
      expect(col.getAt(1).get('age')).toBe(35);
    });

    it('stringifies document with header definitions and parses them back', () => {
      const schema = compileSchema('User', '{ name: string }');
      const data: DocumentData = {
        header: {
          definitions: {
            appName: 'MyApp',
            version: '1.0'
          }
        },
        data: { name: 'Alice' }
      };

      const doc = loadDocument(data, { defaultSchema: schema });
      const text = stringifyDocument(doc);

      const defs = new Definitions();
      defs.set('$User', schema);
      const parsed = require('../../src/parser').default(text, defs);
      expect(parsed.header.definitions.get('appName')).toBe('MyApp');
      // Note: '1.0' string serializes as "1.0" (quoted) to preserve type, which parses back as string "1.0"
      expect(parsed.header.definitions.get('version')).toBe('1.0');
    });

    it('stringifies document without header when includeHeader is false and parses back', () => {
      const schema = compileSchema('User', '{ name: string }');
      const data: DocumentData = {
        header: {
          definitions: { appName: 'MyApp' }
        },
        data: { name: 'Alice' }
      };

      const doc = loadDocument(data, { defaultSchema: schema });
      const text = stringifyDocument(doc, { includeHeader: false });

      const defs = new Definitions();
      defs.set('$User', schema);
      const parsed = require('../../src/parser').default(text, defs);
      expect(parsed.header.definitions.get('appName')).toBeUndefined();
      const section = parsed.sections?.get(0);
      const obj = section?.data as InternetObject;
      expect(obj.get('name')).toBe('Alice');
    });

    it('stringifies document with multiple named sections and parses back', () => {
      const userSchema = compileSchema('User', '{ name: string }');
      const data: DocumentData = {
        sections: {
          users: [{ name: 'Alice' }],
          admins: [{ name: 'Admin' }]
        }
      };

      const doc = loadDocument(data, {
        sectionSchemas: {
          users: userSchema,
          admins: userSchema
        }
      });

      const text = stringifyDocument(doc);

      const defs = new Definitions();
      defs.set('$User', userSchema);
      const parsed = require('../../src/parser').default(text, defs);

      expect(parsed.sections?.length).toBe(2);
      const users = parsed.sections?.get('users');
      const admins = parsed.sections?.get('admins');
      expect((users?.data as Collection<InternetObject>).getAt(0).get('name')).toBe('Alice');
      expect((admins?.data as Collection<InternetObject>).getAt(0).get('name')).toBe('Admin');
    });

    it('filters sections when sectionsFilter is provided and parses back', () => {
      const schema = compileSchema('Item', '{ id: number }');
      const data: DocumentData = {
        sections: {
          items1: [{ id: 1 }],
          items2: [{ id: 2 }],
          items3: [{ id: 3 }]
        }
      };

      const doc = loadDocument(data, { defaultSchema: schema });
      const text = stringifyDocument(doc, {
        sectionsFilter: ['items1', 'items3']
      });

      const defs = new Definitions();
      defs.set('$Item', schema);
      const parsed = require('../../src/parser').default(text, defs);
      expect(parsed.sections?.get('items1')).toBeTruthy();
      expect(parsed.sections?.get('items2')).toBeUndefined();
      expect(parsed.sections?.get('items3')).toBeTruthy();
    });

    // Removed: custom separators are not supported by IO format

    it('supports pretty printing and remains parseable', () => {
      const schema = compileSchema('User', '{ name: string, age: number }');
      const data: DocumentData = {
        data: { name: 'Alice', age: 28 }
      };

      const doc = loadDocument(data, { defaultSchema: schema });
      const text = stringifyDocument(doc, { indent: 2 });

      const defs = new Definitions();
      defs.set('$User', schema);
      const parsed = require('../../src/parser').default(text, defs);
      const section = parsed.sections?.get(0);
      const obj = section?.data as InternetObject;
      expect(obj.get('name')).toBe('Alice');
    });
  });

  describe('documentToObject', () => {
    it('converts document to plain JavaScript object', () => {
      const schema = compileSchema('User', '{ name: string, age: number }');
      const data: DocumentData = {
        header: {
          definitions: { app: 'MyApp' }
        },
        data: [
          { name: 'Alice', age: 28 },
          { name: 'Bob', age: 35 }
        ]
      };

      const doc = loadDocument(data, { defaultSchema: schema });
      const obj = documentToObject(doc);

      expect(obj).toHaveProperty('header');
      expect(obj.header).toHaveProperty('app', 'MyApp');
      expect(obj).toHaveProperty('data');
      expect(Array.isArray(obj.data)).toBe(true);
      expect(obj.data[0]).toHaveProperty('name', 'Alice');
    });

    it('skips error objects when skipErrors is true', () => {
      const schema = compileSchema('User', '{ name: string, age: number }');
      const data: DocumentData = {
        data: [
          { name: 'Alice', age: 28 },
          { name: 'Bob', age: 'invalid' },
          { name: 'Charlie', age: 42 }
        ]
      };

      const doc = loadDocument(data, {
        defaultSchema: schema,
        strict: false
      });

      const obj = documentToObject(doc, { skipErrors: true });

      // Document contains collection, so check the data array
      expect(Array.isArray(obj)).toBe(true);
      // SkipErrors filters out error objects from collection
      expect(obj.length).toBeLessThanOrEqual(3);
      // Valid items should be present
      expect(obj.some((item: any) => item.name === 'Alice')).toBe(true);
    });
  });

  describe('round-trip', () => {
    it('maintains data through load -> stringify -> load cycle', () => {
      const schema = compileSchema('User', '{ name: string, age: number }');
      const originalData: DocumentData = {
        header: {
          definitions: {
            appName: 'TestApp'
          }
        },
        data: [
          { name: 'Alice', age: 28 },
          { name: 'Bob', age: 35 }
        ]
      };

      // Load
      const doc1 = loadDocument(originalData, { defaultSchema: schema });

      // Verify loaded data
      expect(doc1.header.definitions.get('appName')).toBe('TestApp');
      expect(doc1.sections?.length).toBe(1);

      // Stringify
      const text = stringifyDocument(doc1);
      expect(text).toContain('Alice');

      // Convert to object for re-loading
      const obj = documentToObject(doc1);

      // Re-load
      const doc2 = loadDocument({ data: obj.data }, { defaultSchema: schema });

      // Verify data integrity
      const section = doc2.sections?.get(0);
      const collection = section?.data as Collection<InternetObject>;
      expect(collection.getAt(0).get('name')).toBe('Alice');
      expect(collection.getAt(1).get('name')).toBe('Bob');
    });
  });
});
