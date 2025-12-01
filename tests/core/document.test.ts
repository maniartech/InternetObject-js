import IODocument from '../../src/core/document';
import IOHeader from '../../src/core/header';
import IOSectionCollection from '../../src/core/section-collection';
import IOSection from '../../src/core/section';
import IOCollection from '../../src/core/collection';

describe('IODocument', () => {
  describe('Basic Properties', () => {
    it('should store and return header and sections', () => {
      const header = new IOHeader();
      const sections = new IOSectionCollection();
      const doc = new IODocument(header, sections);
      expect(doc.header).toBe(header);
      expect(doc.sections).toBe(sections);
    });

    it('should handle null sections', () => {
      const header = new IOHeader();
      const doc = new IODocument(header, null);
      expect(doc.sections).toBeNull();
    });
  });

  describe('Error Aggregation', () => {
    it('should return empty errors array when no errors', () => {
      const header = new IOHeader();
      const sections = new IOSectionCollection();
      const doc = new IODocument(header, sections);
      expect(doc.errors).toEqual([]);
      expect(doc.getErrors()).toEqual([]);
    });

    it('should return own errors passed in constructor', () => {
      const header = new IOHeader();
      const sections = new IOSectionCollection();
      const errors = [new Error('Own error 1'), new Error('Own error 2')];
      const doc = new IODocument(header, sections, errors);
      expect(doc.errors.length).toBe(2);
      expect(doc.errors[0].message).toBe('Own error 1');
    });

    it('should aggregate errors from section data collections', () => {
      const header = new IOHeader();
      const sections = new IOSectionCollection();
      const collection = new IOCollection();
      collection.errors.push(new Error('Collection error'));
      const section = new IOSection(collection, 'section1');
      sections.push(section);
      const doc = new IODocument(header, sections);
      expect(doc.errors.length).toBe(1);
      expect(doc.errors[0].message).toBe('Collection error');
    });

    it('should combine own errors and section errors', () => {
      const header = new IOHeader();
      const sections = new IOSectionCollection();
      const collection = new IOCollection();
      collection.errors.push(new Error('Section error'));
      const section = new IOSection(collection, 'section1');
      sections.push(section);
      const ownErrors = [new Error('Own error')];
      const doc = new IODocument(header, sections, ownErrors);
      expect(doc.errors.length).toBe(2);
      expect(doc.errors.map(e => e.message)).toContain('Own error');
      expect(doc.errors.map(e => e.message)).toContain('Section error');
    });

    it('should add errors via addErrors()', () => {
      const header = new IOHeader();
      const doc = new IODocument(header, null);
      doc.addErrors([new Error('Added error 1'), new Error('Added error 2')]);
      expect(doc.errors.length).toBe(2);
    });

    it('should not add empty error arrays', () => {
      const header = new IOHeader();
      const doc = new IODocument(header, null);
      doc.addErrors([]);
      expect(doc.errors.length).toBe(0);
    });
  });

  describe('JSON Serialization', () => {
    it('should serialize to JSON correctly for single section', () => {
      const header = new IOHeader();
      const sections = new IOSectionCollection();
      sections.push(new IOSection({ a: 1 }, 'section1'));
      const doc = new IODocument(header, sections);
      expect(doc.toJSON()).toEqual({ a: 1 });
    });

    it('should serialize to JSON correctly for multiple sections', () => {
      const header = new IOHeader();
      const sections = new IOSectionCollection();
      sections.push(new IOSection({ a: 1 }, 'section1'));
      sections.push(new IOSection({ b: 2 }, 'section2'));
      const doc = new IODocument(header, sections);
      expect(doc.toJSON()).toEqual({ section1: { a: 1 }, section2: { b: 2 } });
    });

    it('should return null for empty sections', () => {
      const header = new IOHeader();
      const sections = new IOSectionCollection();
      const doc = new IODocument(header, sections);
      expect(doc.toJSON()).toBeNull();
    });

    it('should return null for null sections', () => {
      const header = new IOHeader();
      const doc = new IODocument(header, null);
      expect(doc.toJSON()).toBeNull();
    });

    it('should include header when definitions exist', () => {
      const header = new IOHeader();
      header.definitions.set('key', 'value');
      const sections = new IOSectionCollection();
      sections.push(new IOSection({ a: 1 }, 'section1'));
      const doc = new IODocument(header, sections);
      const json = doc.toJSON();
      expect(json.header).toEqual({ key: 'value' });
      expect(json.data).toEqual({ a: 1 });
    });

    it('should support toObject() alias', () => {
      const header = new IOHeader();
      const sections = new IOSectionCollection();
      sections.push(new IOSection({ x: 42 }, 'test'));
      const doc = new IODocument(header, sections);
      expect(doc.toObject()).toEqual(doc.toJSON());
    });
  });
});
