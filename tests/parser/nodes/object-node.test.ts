import ObjectNode from "../../../src/parser/nodes/objects";
import MemberNode from "../../../src/parser/nodes/members";
import TokenNode from "../../../src/parser/nodes/tokens";
import Token from "../../../src/parser/tokenizer/tokens";
import Position from "../../../src/core/position";

// Mock classes for testing
class MockValueNode {
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

class MockKeyToken extends Token {
  constructor(value: string) {
    super();
    this.value = value;
    this.type = 'string';
  }
  
  getStartPos(): Position {
    return { pos: 0, row: 1, col: 1 };
  }
  
  getEndPos(): Position {
    return { pos: this.value.length, row: 1, col: this.value.length + 1 };
  }
}

describe('ObjectNode Utility Methods', () => {
  describe('isEmpty', () => {
    it('should return true for empty object', () => {
      const objectNode = new ObjectNode([]);
      expect(objectNode.isEmpty()).toBe(true);
    });

    it('should return true for object with only undefined children', () => {
      const objectNode = new ObjectNode([undefined, undefined]);
      expect(objectNode.isEmpty()).toBe(true);
    });

    it('should return false for object with valid members', () => {
      const member = new MemberNode(
        new MockValueNode('value') as any,
        new TokenNode(new MockKeyToken('key')) as any
      );
      const objectNode = new ObjectNode([member]);
      expect(objectNode.isEmpty()).toBe(false);
    });

    it('should return false for object with mixed undefined and valid members', () => {
      const member = new MemberNode(
        new MockValueNode('value') as any,
        new TokenNode(new MockKeyToken('key')) as any
      );
      const objectNode = new ObjectNode([undefined, member]);
      expect(objectNode.isEmpty()).toBe(false);
    });
  });

  describe('toDebugString', () => {
    it('should return debug string for empty object', () => {
      const objectNode = new ObjectNode([]);
      const result = objectNode.toDebugString();
      expect(result).toBe('ObjectNode {  }');
    });

    it('should return debug string for object with undefined members', () => {
      const objectNode = new ObjectNode([undefined]);
      const result = objectNode.toDebugString();
      expect(result).toBe('ObjectNode { [0]: undefined }');
    });

    it('should return debug string for object with keyed members', () => {
      const member = new MemberNode(
        new MockValueNode('John') as any,
        new TokenNode(new MockKeyToken('name')) as any
      );
      const objectNode = new ObjectNode([member]);
      const result = objectNode.toDebugString();
      expect(result).toBe('ObjectNode { name: "John" }');
    });

    it('should return debug string for object with indexed members', () => {
      const member = new MemberNode(
        new MockValueNode('value') as any
      );
      const objectNode = new ObjectNode([member]);
      const result = objectNode.toDebugString();
      expect(result).toBe('ObjectNode { [0]: "value" }');
    });

    it('should return debug string for object with mixed members', () => {
      const keyedMember = new MemberNode(
        new MockValueNode('John') as any,
        new TokenNode(new MockKeyToken('name')) as any
      );
      const indexedMember = new MemberNode(
        new MockValueNode(42) as any
      );
      const objectNode = new ObjectNode([keyedMember, undefined, indexedMember]);
      const result = objectNode.toDebugString();
      expect(result).toBe('ObjectNode { name: "John", [1]: undefined, [2]: 42 }');
    });
  });

  describe('hasKey', () => {
    it('should return false for empty object', () => {
      const objectNode = new ObjectNode([]);
      expect(objectNode.hasKey('anyKey')).toBe(false);
    });

    it('should return false for object without the specified key', () => {
      const member = new MemberNode(
        new MockValueNode('John') as any,
        new TokenNode(new MockKeyToken('name')) as any
      );
      const objectNode = new ObjectNode([member]);
      expect(objectNode.hasKey('age')).toBe(false);
    });

    it('should return true for object with the specified key', () => {
      const member = new MemberNode(
        new MockValueNode('John') as any,
        new TokenNode(new MockKeyToken('name')) as any
      );
      const objectNode = new ObjectNode([member]);
      expect(objectNode.hasKey('name')).toBe(true);
    });

    it('should return false for undefined members', () => {
      const objectNode = new ObjectNode([undefined]);
      expect(objectNode.hasKey('anyKey')).toBe(false);
    });

    it('should return false for members without keys', () => {
      const member = new MemberNode(
        new MockValueNode('value') as any
      );
      const objectNode = new ObjectNode([member]);
      expect(objectNode.hasKey('anyKey')).toBe(false);
    });
  });

  describe('getKeys', () => {
    it('should return empty array for empty object', () => {
      const objectNode = new ObjectNode([]);
      expect(objectNode.getKeys()).toEqual([]);
    });

    it('should return keys for keyed members', () => {
      const member1 = new MemberNode(
        new MockValueNode('John') as any,
        new TokenNode(new MockKeyToken('name')) as any
      );
      const member2 = new MemberNode(
        new MockValueNode(30) as any,
        new TokenNode(new MockKeyToken('age')) as any
      );
      const objectNode = new ObjectNode([member1, member2]);
      expect(objectNode.getKeys()).toEqual(['name', 'age']);
    });

    it('should return indices for non-keyed members', () => {
      const member = new MemberNode(
        new MockValueNode('value') as any
      );
      const objectNode = new ObjectNode([member]);
      expect(objectNode.getKeys()).toEqual(['0']);
    });

    it('should handle mixed keyed and non-keyed members', () => {
      const keyedMember = new MemberNode(
        new MockValueNode('John') as any,
        new TokenNode(new MockKeyToken('name')) as any
      );
      const indexedMember = new MemberNode(
        new MockValueNode('value') as any
      );
      const objectNode = new ObjectNode([keyedMember, indexedMember]);
      expect(objectNode.getKeys()).toEqual(['name', '1']);
    });

    it('should skip undefined members', () => {
      const member = new MemberNode(
        new MockValueNode('John') as any,
        new TokenNode(new MockKeyToken('name')) as any
      );
      const objectNode = new ObjectNode([member, undefined]);
      expect(objectNode.getKeys()).toEqual(['name']);
    });
  });



  describe('isValid', () => {
    it('should return true for empty object', () => {
      const objectNode = new ObjectNode([]);
      expect(objectNode.isValid()).toBe(true);
    });

    it('should return true for object with undefined members', () => {
      const objectNode = new ObjectNode([undefined]);
      expect(objectNode.isValid()).toBe(true);
    });

    it('should return true for object with valid members', () => {
      const member1 = new MemberNode(
        new MockValueNode('John') as any,
        new TokenNode(new MockKeyToken('name')) as any
      );
      const member2 = new MemberNode(
        new MockValueNode(30) as any,
        new TokenNode(new MockKeyToken('age')) as any
      );
      const objectNode = new ObjectNode([member1, member2]);
      expect(objectNode.isValid()).toBe(true);
    });

    it('should return false for object with ErrorNode as value', () => {
      const errorNode = { error: new Error('Test error') } as any;
      const member = new MemberNode(
        errorNode,
        new TokenNode(new MockKeyToken('name')) as any
      );
      const objectNode = new ObjectNode([member]);
      expect(objectNode.isValid()).toBe(false);
    });

    it('should return false for object with ErrorNode as key', () => {
      const errorKey = { error: new Error('Test error') } as any;
      const member = new MemberNode(
        new MockValueNode('John') as any,
        errorKey
      );
      const objectNode = new ObjectNode([member]);
      expect(objectNode.isValid()).toBe(false);
    });

    it('should return false for object with mixed valid and error members', () => {
      const validMember = new MemberNode(
        new MockValueNode('John') as any,
        new TokenNode(new MockKeyToken('name')) as any
      );
      const errorNode = { error: new Error('Test error') } as any;
      const invalidMember = new MemberNode(
        errorNode,
        new TokenNode(new MockKeyToken('age')) as any
      );
      const objectNode = new ObjectNode([validMember, invalidMember]);
      expect(objectNode.isValid()).toBe(false);
    });
  });

  describe('integration with existing methods', () => {
    it('should work correctly with toValue method', () => {
      const member = new MemberNode(
        new MockValueNode('John') as any,
        new TokenNode(new MockKeyToken('name')) as any
      );
      const objectNode = new ObjectNode([member]);
      
      expect(objectNode.isEmpty()).toBe(false);
      expect(objectNode.hasKey('name')).toBe(true);
      
      const value = objectNode.toValue();
      expect(value.get('name')).toBe('John');
    });

    it('should work correctly with position methods', () => {
      const openBracket = new MockKeyToken('{') as any;
      const closeBracket = new MockKeyToken('}') as any;
      const member = new MemberNode(
        new MockValueNode('John') as any,
        new TokenNode(new MockKeyToken('name')) as any
      );
      const objectNode = new ObjectNode([member], openBracket, closeBracket);
      
      expect(objectNode.isEmpty()).toBe(false);
      expect(typeof objectNode.getStartPos).toBe('function');
      expect(typeof objectNode.getEndPos).toBe('function');
    });
  });
});