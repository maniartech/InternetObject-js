import IODocument from '../../src/core/document';
import IOHeader from '../../src/core/header';
import IOSectionCollection from '../../src/core/section-collection';
import IOSection from '../../src/core/section';

describe('IODocument', () => {
  it('should store and return header and sections', () => {
    const header = new IOHeader();
    const sections = new IOSectionCollection();
    const doc = new IODocument(header, sections);
    expect(doc.header).toBe(header);
    expect(doc.sections).toBe(sections);
  });

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
});
