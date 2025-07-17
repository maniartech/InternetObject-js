import CollectionNode from "../../../src/parser/nodes/collections";
import Position from "../../../src/core/position";

// Mock node class for testing
class MockNode {
  constructor(private value: any) {}
  
  toValue() {
    return this.value;
  }
  
  getStartPos(): Position {
    return { pos: 0, row: 1, col: 1 };
  }
  
  getEndPos(): Position {
    return { pos: 5, row: 1, col: 6 };
  }
}

describe('CollectionNode Utility Methods', () => {
  describe('isEmpty', () => {
    it('should return true for empty collection', () => {
      const collectionNode = new CollectionNode([]);
      expect(collectionNode.isEmpty()).toBe(true);
    });

    it('should return true for collection with only undefined children', () => {
      const collectionNode = new CollectionNode([undefined, undefined]);
      expect(collectionNode.isEmpty()).toBe(true);
    });

    it('should return false for collection with valid nodes', () => {
      const node = new MockNode('value') as any;
      const collectionNode = new CollectionNode([node]);
      expect(collectionNode.isEmpty()).toBe(false);
    });

    it('should return false for collection with mixed undefined and valid nodes', () => {
      const node = new MockNode('value') as any;
      const collectionNode = new CollectionNode([undefined, node]);
      expect(collectionNode.isEmpty()).toBe(false);
    });
  });

  describe('toDebugString', () => {
    it('should return debug string for empty collection', () => {
      const collectionNode = new CollectionNode([]);
      const result = collectionNode.toDebugString();
      expect(result).toBe('CollectionNode {  }');
    });

    it('should return debug string for collection with undefined items', () => {
      const collectionNode = new CollectionNode([undefined]);
      const result = collectionNode.toDebugString();
      expect(result).toBe('CollectionNode { [0]: undefined }');
    });

    it('should return debug string for collection with valid items', () => {
      const node1 = new MockNode('first') as any;
      const node2 = new MockNode(42) as any;
      const collectionNode = new CollectionNode([node1, node2]);
      const result = collectionNode.toDebugString();
      expect(result).toBe('CollectionNode { [0]: "first", [1]: 42 }');
    });

    it('should return debug string for collection with mixed items', () => {
      const node = new MockNode('value') as any;
      const collectionNode = new CollectionNode([node, undefined, node]);
      const result = collectionNode.toDebugString();
      expect(result).toBe('CollectionNode { [0]: "value", [1]: undefined, [2]: "value" }');
    });

    it('should handle complex objects in debug string', () => {
      const complexNode = new MockNode({ name: 'John', age: 30 }) as any;
      const collectionNode = new CollectionNode([complexNode]);
      const result = collectionNode.toDebugString();
      expect(result).toBe('CollectionNode { [0]: {"name":"John","age":30} }');
    });
  });

  describe('size', () => {
    it('should return 0 for empty collection', () => {
      const collectionNode = new CollectionNode([]);
      expect(collectionNode.size()).toBe(0);
    });

    it('should return correct count for collection with only undefined items', () => {
      const collectionNode = new CollectionNode([undefined, undefined]);
      expect(collectionNode.size()).toBe(2);
    });

    it('should return correct count for collection with valid items', () => {
      const node1 = new MockNode('first') as any;
      const node2 = new MockNode('second') as any;
      const collectionNode = new CollectionNode([node1, node2]);
      expect(collectionNode.size()).toBe(2);
    });

    it('should include undefined items in count', () => {
      const node = new MockNode('value') as any;
      const collectionNode = new CollectionNode([node, undefined, node, undefined]);
      expect(collectionNode.size()).toBe(4);
    });
  });

  describe('hasValidItems', () => {
    it('should return false for empty collection', () => {
      const collectionNode = new CollectionNode([]);
      expect(collectionNode.hasValidItems()).toBe(false);
    });

    it('should return true for collection with only undefined items', () => {
      const collectionNode = new CollectionNode([undefined, undefined]);
      expect(collectionNode.hasValidItems()).toBe(true);
    });

    it('should return true for collection with at least one valid item', () => {
      const node = new MockNode('value') as any;
      const collectionNode = new CollectionNode([undefined, node]);
      expect(collectionNode.hasValidItems()).toBe(true);
    });

    it('should return true for collection with all valid items', () => {
      const node1 = new MockNode('first') as any;
      const node2 = new MockNode('second') as any;
      const collectionNode = new CollectionNode([node1, node2]);
      expect(collectionNode.hasValidItems()).toBe(true);
    });

    it('should return false for collection with only ErrorNodes', () => {
      const errorNode1 = { error: new Error('Test error 1') } as any;
      const errorNode2 = { error: new Error('Test error 2') } as any;
      const collectionNode = new CollectionNode([errorNode1, errorNode2]);
      expect(collectionNode.hasValidItems()).toBe(false);
    });

    it('should return true for collection with mixed ErrorNodes and valid items', () => {
      const errorNode = { error: new Error('Test error') } as any;
      const validNode = new MockNode('value') as any;
      const collectionNode = new CollectionNode([errorNode, validNode, undefined]);
      expect(collectionNode.hasValidItems()).toBe(true);
    });
  });

  describe('getValidItems', () => {
    it('should return empty array for empty collection', () => {
      const collectionNode = new CollectionNode([]);
      expect(collectionNode.getValidItems()).toEqual([]);
    });

    it('should return array with undefined items for collection with only undefined items', () => {
      const collectionNode = new CollectionNode([undefined, undefined]);
      const validItems = collectionNode.getValidItems();
      expect(validItems).toHaveLength(2);
      expect(validItems[0]).toBeUndefined();
      expect(validItems[1]).toBeUndefined();
    });

    it('should return valid items including undefined', () => {
      const node1 = new MockNode('first') as any;
      const node2 = new MockNode('second') as any;
      const collectionNode = new CollectionNode([node1, undefined, node2]);
      const validItems = collectionNode.getValidItems();
      
      expect(validItems).toHaveLength(3);
      expect(validItems[0]).toBe(node1);
      expect(validItems[1]).toBeUndefined();
      expect(validItems[2]).toBe(node2);
    });

    it('should return all items when all are valid', () => {
      const node1 = new MockNode('first') as any;
      const node2 = new MockNode('second') as any;
      const collectionNode = new CollectionNode([node1, node2]);
      const validItems = collectionNode.getValidItems();
      
      expect(validItems).toHaveLength(2);
      expect(validItems).toEqual([node1, node2]);
    });

    it('should exclude ErrorNodes but include undefined items', () => {
      const errorNode = { error: new Error('Test error') } as any;
      const validNode = new MockNode('value') as any;
      const collectionNode = new CollectionNode([validNode, errorNode, undefined]);
      const validItems = collectionNode.getValidItems();
      
      expect(validItems).toHaveLength(2);
      expect(validItems[0]).toBe(validNode);
      expect(validItems[1]).toBeUndefined();
    });
  });

  describe('isValid', () => {
    it('should return true for empty collection', () => {
      const collectionNode = new CollectionNode([]);
      expect(collectionNode.isValid()).toBe(true);
    });

    it('should return true for collection with only undefined items', () => {
      const collectionNode = new CollectionNode([undefined, undefined]);
      expect(collectionNode.isValid()).toBe(true);
    });

    it('should return true for collection with valid items', () => {
      const node1 = new MockNode('first') as any;
      const node2 = new MockNode('second') as any;
      const collectionNode = new CollectionNode([node1, node2]);
      expect(collectionNode.isValid()).toBe(true);
    });

    it('should return false for collection with ErrorNode', () => {
      const errorNode = { error: new Error('Test error') } as any;
      const validNode = new MockNode('value') as any;
      const collectionNode = new CollectionNode([validNode, errorNode]);
      expect(collectionNode.isValid()).toBe(false);
    });

    it('should return false for collection with only ErrorNodes', () => {
      const errorNode1 = { error: new Error('Test error 1') } as any;
      const errorNode2 = { error: new Error('Test error 2') } as any;
      const collectionNode = new CollectionNode([errorNode1, errorNode2]);
      expect(collectionNode.isValid()).toBe(false);
    });

    it('should return true for collection with mixed valid and undefined items', () => {
      const node = new MockNode('value') as any;
      const collectionNode = new CollectionNode([undefined, node, undefined]);
      expect(collectionNode.isValid()).toBe(true);
    });
  });

  describe('integration with existing methods', () => {
    it('should work correctly with toValue method', () => {
      const node1 = new MockNode('first') as any;
      const node2 = new MockNode('second') as any;
      const collectionNode = new CollectionNode([node1, node2]);
      
      expect(collectionNode.isEmpty()).toBe(false);
      expect(collectionNode.size()).toBe(2);
      expect(collectionNode.isValid()).toBe(true);
      
      const value = collectionNode.toValue();
      expect(value.length).toBe(2);
      expect(value.getAt(0)).toBe('first');
      expect(value.getAt(1)).toBe('second');
    });

    it('should work correctly with position methods', () => {
      const node = new MockNode('value') as any;
      const collectionNode = new CollectionNode([node]);
      
      expect(collectionNode.isEmpty()).toBe(false);
      expect(typeof collectionNode.getStartPos).toBe('function');
      expect(typeof collectionNode.getEndPos).toBe('function');
    });

    it('should handle undefined items correctly in toValue', () => {
      const node = new MockNode('value') as any;
      const collectionNode = new CollectionNode([node, undefined]);
      
      expect(collectionNode.size()).toBe(2);
      expect(collectionNode.hasValidItems()).toBe(true);
      
      const value = collectionNode.toValue();
      expect(value.length).toBe(2);
      expect(value.getAt(0)).toBe('value');
      expect(value.getAt(1)).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle collections with many undefined items', () => {
      const collectionNode = new CollectionNode([undefined, undefined, undefined, undefined]);
      
      expect(collectionNode.isEmpty()).toBe(true);
      expect(collectionNode.size()).toBe(4);
      expect(collectionNode.hasValidItems()).toBe(true);
      expect(collectionNode.getValidItems()).toHaveLength(4);
      expect(collectionNode.isValid()).toBe(true); // No ErrorNodes, so it's valid
    });

    it('should handle single item collections', () => {
      const node = new MockNode('single') as any;
      const collectionNode = new CollectionNode([node]);
      
      expect(collectionNode.isEmpty()).toBe(false);
      expect(collectionNode.size()).toBe(1);
      expect(collectionNode.hasValidItems()).toBe(true);
      expect(collectionNode.getValidItems()).toHaveLength(1);
      expect(collectionNode.isValid()).toBe(true);
    });

    it('should handle collections with complex nested objects', () => {
      const complexNode = new MockNode({ 
        nested: { 
          array: [1, 2, 3], 
          object: { key: 'value' } 
        } 
      }) as any;
      const collectionNode = new CollectionNode([complexNode]);
      
      expect(collectionNode.size()).toBe(1);
      expect(collectionNode.isValid()).toBe(true);
      
      const debugString = collectionNode.toDebugString();
      expect(debugString).toContain('CollectionNode');
      expect(debugString).toContain('nested');
    });
  });
});