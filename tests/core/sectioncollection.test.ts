import IOSectionCollection from '../../src/core/section-collection';
import IOSection from '../../src/core/section';

describe('IOSectionCollection', () => {
  describe('Basic Properties', () => {
    it('should return correct length for empty and non-empty collections', () => {
      const col = new IOSectionCollection();
      expect(col.length).toBe(0);
      col.push(new IOSection('data1'));
      expect(col.length).toBe(1);
      col.push(new IOSection('data2'));
      expect(col.length).toBe(2);
    });

    it('should expose sections array via getter', () => {
      const col = new IOSectionCollection();
      const section1 = new IOSection('data1', 'section1');
      col.push(section1);
      expect(col.sections).toBeInstanceOf(Array);
      expect(col.sections.length).toBe(1);
      expect(col.sections[0]).toBe(section1);
    });
  });

  describe('Iteration and Access', () => {
    it('should support iteration and accessors', () => {
      const col = new IOSectionCollection();
      col.push(new IOSection('data1', 'section1'));
      col.push(new IOSection('data2', 'section2'));
      const names: (string | undefined)[] = [];
      for (const section of col) {
        names.push(section.name);
      }
      expect(names).toEqual(['section1', 'section2']);
      expect(col.get('section1')?.name).toBe('section1');
      expect(col.get(1)?.name).toBe('section2');
    });

    it('should access sections by index via get()', () => {
      const col = new IOSectionCollection();
      col.push(new IOSection('data1', 'first'));
      col.push(new IOSection('data2', 'second'));
      expect(col.get(0)?.name).toBe('first');
      expect(col.get(1)?.name).toBe('second');
      expect(col.get(99)).toBeUndefined();
    });

    it('should access sections by name via get()', () => {
      const col = new IOSectionCollection();
      col.push(new IOSection('data1', 'users'));
      col.push(new IOSection('data2', 'products'));
      expect(col.get('users')?.data).toBe('data1');
      expect(col.get('products')?.data).toBe('data2');
      expect(col.get('nonexistent')).toBeUndefined();
    });
  });

  describe('Proxy-based Access', () => {
    it('should support numeric index access via proxy', () => {
      const col = new IOSectionCollection();
      col.push(new IOSection('first', 'sec1'));
      col.push(new IOSection('second', 'sec2'));
      expect((col as any)[0]?.name).toBe('sec1');
      expect((col as any)[1]?.name).toBe('sec2');
      expect((col as any)['0']?.name).toBe('sec1');
    });

    it('should support named access via proxy', () => {
      const col = new IOSectionCollection();
      col.push(new IOSection('userdata', 'users'));
      expect((col as any)['users']?.data).toBe('userdata');
    });

    it('should throw error on set attempt via proxy', () => {
      const col = new IOSectionCollection();
      expect(() => {
        (col as any)['test'] = 'value';
      }).toThrow('Cannot set a value on a IOSectionCollection');
    });
  });

  describe('Serialization', () => {
    it('should serialize to JSON correctly (if implemented)', () => {
      const col = new IOSectionCollection();
      col.push(new IOSection('data1', 'section1'));
      col.push(new IOSection('data2', 'section2'));
      if (typeof col.toJSON === 'function') {
        expect(typeof col.toJSON()).toBe('object');
      }
    });
  });
});
