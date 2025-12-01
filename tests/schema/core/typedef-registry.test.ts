import { vi } from 'vitest';
import TypedefRegistry from '../../../src/schema/typedef-registry';
import TypeDef from '../../../src/schema/typedef';
import Schema from '../../../src/schema/schema';
import MemberDef from '../../../src/schema/types/memberdef';
import InternetObjectError from '../../../src/errors/io-error';

// Mock TypeDef implementations for testing
class MockStringTypeDef implements TypeDef {
  static types = ['mockString'];

  constructor(public type: string) {}

  get schema(): Schema {
    return Schema.create(`${this.type}Schema`).build();
  }

  parse(value: any, memberDef: MemberDef, defs?: any): any {
    return String(value);
  }
}

class MockNumberTypeDef implements TypeDef {
  static types = ['mockNumber', 'mockInt'];

  constructor(public type: string) {}

  get schema(): Schema {
    return Schema.create(`${this.type}Schema`).build();
  }

  parse(value: any, memberDef: MemberDef, defs?: any): any {
    return Number(value);
  }
}

describe('TypedefRegistry', () => {
  beforeEach(() => {
    // Clear registry before each test
    TypedefRegistry.clear();
  // Defaults: keep warnings off for most tests to avoid noise
  TypedefRegistry.setWarnOnDuplicates(false);
  });

  afterEach(() => {
    // Clean up after each test
    TypedefRegistry.clear();
  });

  describe('Registration', () => {
    test('should register single type constructor', () => {
      TypedefRegistry.register(MockStringTypeDef);

      expect(TypedefRegistry.isRegisteredType('mockString')).toBe(true);
      expect(TypedefRegistry.types).toContain('mockString');
      expect(TypedefRegistry.count).toBe(1);
    });

    test('should register multiple type constructors', () => {
      TypedefRegistry.register(MockStringTypeDef, MockNumberTypeDef);

      expect(TypedefRegistry.count).toBe(3); // mockString, mockNumber, mockInt
      expect(TypedefRegistry.types).toEqual(expect.arrayContaining(['mockString', 'mockNumber', 'mockInt']));
    });

    test('should register constructor with multiple types', () => {
      TypedefRegistry.register(MockNumberTypeDef);

      expect(TypedefRegistry.isRegisteredType('mockNumber')).toBe(true);
      expect(TypedefRegistry.isRegisteredType('mockInt')).toBe(true);
      expect(TypedefRegistry.count).toBe(2);
    });

    test('should warn and skip duplicate registration', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation();

  // Explicitly enable warnings for this test
  TypedefRegistry.setWarnOnDuplicates(true);

      TypedefRegistry.register(MockStringTypeDef);
      TypedefRegistry.register(MockStringTypeDef); // Duplicate

      expect(consoleSpy).toHaveBeenCalledWith("TypeDef for 'mockString' is already registered. Skipping.");
      expect(TypedefRegistry.count).toBe(1);

      consoleSpy.mockRestore();
    });
  });

  describe('Retrieval', () => {
    beforeEach(() => {
      TypedefRegistry.register(MockStringTypeDef, MockNumberTypeDef);
    });

    test('should get registered type definition', () => {
      const typeDef = TypedefRegistry.get('mockString');

      expect(typeDef).toBeInstanceOf(MockStringTypeDef);
      expect(typeDef.type).toBe('mockString');
    });

    test('should throw error for unregistered type', () => {
      expect(() => {
        TypedefRegistry.get('nonExistentType');
      }).toThrow(InternetObjectError);

      expect(() => {
        TypedefRegistry.get('nonExistentType');
      }).toThrow("Type 'nonExistentType' is not registered");
    });

    test('should check type registration correctly', () => {
      expect(TypedefRegistry.isRegisteredType('mockString')).toBe(true);
      expect(TypedefRegistry.isRegisteredType('mockNumber')).toBe(true);
      expect(TypedefRegistry.isRegisteredType('nonExistentType')).toBe(false);
    });
  });

  describe('Unregistration', () => {
    beforeEach(() => {
      TypedefRegistry.register(MockStringTypeDef, MockNumberTypeDef);
    });

    test('should unregister existing type', () => {
      expect(TypedefRegistry.isRegisteredType('mockString')).toBe(true);

      TypedefRegistry.unregister('mockString');

      expect(TypedefRegistry.isRegisteredType('mockString')).toBe(false);
      expect(TypedefRegistry.count).toBe(2); // mockNumber, mockInt remain
    });

    test('should handle unregistering non-existent type gracefully', () => {
      const initialCount = TypedefRegistry.count;

      TypedefRegistry.unregister('nonExistentType');

      expect(TypedefRegistry.count).toBe(initialCount);
    });
  });

  describe('Types Array', () => {
    test('should return empty array when no types registered', () => {
      expect(TypedefRegistry.types).toEqual([]);
      expect(TypedefRegistry.count).toBe(0);
    });

    test('should return all registered types', () => {
      TypedefRegistry.register(MockStringTypeDef, MockNumberTypeDef);

      const types = TypedefRegistry.types;
      expect(types).toEqual(expect.arrayContaining(['mockString', 'mockNumber', 'mockInt']));
      expect(types.length).toBe(3);
    });

    test('should return readonly array', () => {
      TypedefRegistry.register(MockStringTypeDef);

      const types = TypedefRegistry.types;
      // Array should be frozen to prevent mutations
      expect(Object.isFrozen(types)).toBe(true);
    });
  });

  describe('Clear Functionality', () => {
    test('should clear all registered types', () => {
      TypedefRegistry.register(MockStringTypeDef, MockNumberTypeDef);
      expect(TypedefRegistry.count).toBe(3);

      TypedefRegistry.clear();

      expect(TypedefRegistry.count).toBe(0);
      expect(TypedefRegistry.types).toEqual([]);
      expect(TypedefRegistry.isRegisteredType('mockString')).toBe(false);
    });
  });

  describe('Performance Tests', () => {
    test('should handle many registrations efficiently', () => {
      const startTime = performance.now();

      // Register same constructors multiple times to test Map efficiency
      for (let i = 0; i < 100; i++) {
        TypedefRegistry.clear();
        TypedefRegistry.register(MockStringTypeDef, MockNumberTypeDef);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (less than 100ms)
      expect(duration).toBeLessThan(100);
    });

    test('should have O(1) lookup performance', () => {
      TypedefRegistry.register(MockStringTypeDef, MockNumberTypeDef);

      const startTime = performance.now();

      // Perform many lookups
      for (let i = 0; i < 1000; i++) {
        TypedefRegistry.get('mockString');
        TypedefRegistry.isRegisteredType('mockNumber');
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete quickly due to Map-based implementation
      expect(duration).toBeLessThan(50);
    });
  });
});
