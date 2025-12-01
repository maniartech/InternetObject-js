import { vi } from 'vitest';
import SectionNode from "../../../src/parser/nodes/section";
import ObjectNode from "../../../src/parser/nodes/objects";
import CollectionNode from "../../../src/parser/nodes/collections";
import MemberNode from "../../../src/parser/nodes/members";
import TokenNode from "../../../src/parser/nodes/tokens";
import Token from "../../../src/parser/tokenizer/tokens";
import TokenType from "../../../src/parser/tokenizer/token-types";
import Section from "../../../src/core/section";
import { Position } from "../../../src/core/positions";

describe("SectionNode", () => {
  // Helper function to create a mock token
  const createMockToken = (type: TokenType, value: any, pos: number = 0): Token => {
    const token = new Token();
    token.type = type;
    token.value = value;
    token.token = value.toString();
    token.pos = pos;
    token.row = 1;
    token.col = pos + 1;
    return token;
  };

  // Helper function to create a simple object
  const createSimpleObject = (value: string = "test"): ObjectNode => {
    const member = new MemberNode(new TokenNode(createMockToken(TokenType.STRING, value, 0)));
    return new ObjectNode([member]);
  };

  // Helper function to create a simple collection
  const createSimpleCollection = (): CollectionNode => {
    const obj1 = createSimpleObject("item1");
    const obj2 = createSimpleObject("item2");
    return new CollectionNode([obj1, obj2]);
  };

  describe("Constructor", () => {
    it("should create SectionNode with object child and no name/schema", () => {
      const objectChild = createSimpleObject();
      const section = new SectionNode(objectChild, null, null);

      expect(section.type).toBe("section");
      expect(section.child).toBe(objectChild);
      expect(section.nameNode).toBeNull();
      expect(section.schemaNode).toBeNull();
    });

    it("should create SectionNode with collection child and no name/schema", () => {
      const collectionChild = createSimpleCollection();
      const section = new SectionNode(collectionChild, null, null);

      expect(section.type).toBe("section");
      expect(section.child).toBe(collectionChild);
      expect(section.nameNode).toBeNull();
      expect(section.schemaNode).toBeNull();
    });

    it("should create SectionNode with null child", () => {
      const section = new SectionNode(null, null, null);

      expect(section.type).toBe("section");
      expect(section.child).toBeNull();
      expect(section.nameNode).toBeNull();
      expect(section.schemaNode).toBeNull();
    });

    it("should create SectionNode with name only", () => {
      const objectChild = createSimpleObject();
      const nameToken = new TokenNode(createMockToken(TokenType.STRING, "users", 0));
      const section = new SectionNode(objectChild, nameToken, null);

      expect(section.type).toBe("section");
      expect(section.child).toBe(objectChild);
      expect(section.nameNode).toBe(nameToken);
      expect(section.schemaNode).toBeNull();
    });

    it("should create SectionNode with schema only", () => {
      const objectChild = createSimpleObject();
      const schemaToken = new TokenNode(createMockToken(TokenType.STRING, "$userSchema", 0));
      const section = new SectionNode(objectChild, null, schemaToken);

      expect(section.type).toBe("section");
      expect(section.child).toBe(objectChild);
      expect(section.nameNode).toBeNull();
      expect(section.schemaNode).toBe(schemaToken);
    });

    it("should create SectionNode with both name and schema", () => {
      const objectChild = createSimpleObject();
      const nameToken = new TokenNode(createMockToken(TokenType.STRING, "users", 0));
      const schemaToken = new TokenNode(createMockToken(TokenType.STRING, "$userSchema", 10));
      const section = new SectionNode(objectChild, nameToken, schemaToken);

      expect(section.type).toBe("section");
      expect(section.child).toBe(objectChild);
      expect(section.nameNode).toBe(nameToken);
      expect(section.schemaNode).toBe(schemaToken);
    });
  });

  describe("name getter", () => {
    it("should return name from nameNode when available", () => {
      const objectChild = createSimpleObject();
      const nameToken = new TokenNode(createMockToken(TokenType.STRING, "users", 0));
      const section = new SectionNode(objectChild, nameToken, null);

      expect(section.name).toBe("users");
    });

    it("should return schema name without $ when no nameNode", () => {
      const objectChild = createSimpleObject();
      const schemaToken = new TokenNode(createMockToken(TokenType.STRING, "$userSchema", 0));
      const section = new SectionNode(objectChild, null, schemaToken);

      expect(section.name).toBe("userSchema");
    });

    it("should return 'unnamed' when no nameNode or schemaNode", () => {
      const objectChild = createSimpleObject();
      const section = new SectionNode(objectChild, null, null);

      expect(section.name).toBe("unnamed");
    });

    it("should prefer nameNode over schemaNode", () => {
      const objectChild = createSimpleObject();
      const nameToken = new TokenNode(createMockToken(TokenType.STRING, "users", 0));
      const schemaToken = new TokenNode(createMockToken(TokenType.STRING, "$userSchema", 10));
      const section = new SectionNode(objectChild, nameToken, schemaToken);

      expect(section.name).toBe("users");
    });
  });

  describe("schemaName getter", () => {
    it("should return schema name when schemaNode exists", () => {
      const objectChild = createSimpleObject();
      const schemaToken = new TokenNode(createMockToken(TokenType.STRING, "$userSchema", 0));
      const section = new SectionNode(objectChild, null, schemaToken);

      expect(section.schemaName).toBe("$userSchema");
    });

    it("should return default '$schema' when no schemaNode", () => {
      const objectChild = createSimpleObject();
      const section = new SectionNode(objectChild, null, null);

      expect(section.schemaName).toBe("$schema");
    });
  });

  describe("firstChild getter", () => {
    it("should return child when child exists", () => {
      const objectChild = createSimpleObject();
      const section = new SectionNode(objectChild, null, null);

      expect(section.firstChild).toBe(objectChild);
    });

    it("should return null when child is null", () => {
      const section = new SectionNode(null, null, null);

      expect(section.firstChild).toBeNull();
    });
  });

  describe("firstChildObject getter", () => {
    it("should return object when child is ObjectNode", () => {
      const objectChild = createSimpleObject();
      const section = new SectionNode(objectChild, null, null);

      expect(section.firstChildObject).toBe(objectChild);
    });

    it("should return first object from collection when child is CollectionNode", () => {
      const collectionChild = createSimpleCollection();
      const section = new SectionNode(collectionChild, null, null);

      expect(section.firstChildObject).toBe(collectionChild.children[0]);
    });

    it("should return null when child is null", () => {
      const section = new SectionNode(null, null, null);

      expect(section.firstChildObject).toBeNull();
    });

    it("should return null when collection is empty", () => {
      const emptyCollection = new CollectionNode([]);
      const section = new SectionNode(emptyCollection, null, null);

      expect(section.firstChildObject).toBeNull();
    });
  });

  describe("Position Tracking", () => {
    it("should return child start position when child exists", () => {
      const objectChild = createSimpleObject();
      const section = new SectionNode(objectChild, null, null);

      const startPos = section.getStartPos();
      expect(startPos).toEqual(objectChild.getStartPos());
    });

    it("should return default position when child is null", () => {
      const section = new SectionNode(null, null, null);

      const startPos = section.getStartPos();
      expect(startPos).toEqual(Position.unknown);
    });

    it("should return child end position when child exists", () => {
      const objectChild = createSimpleObject();
      const section = new SectionNode(objectChild, null, null);

      const endPos = section.getEndPos();
      expect(endPos).toEqual(objectChild.getEndPos());
    });

    it("should return default position for end when child is null", () => {
      const section = new SectionNode(null, null, null);

      const endPos = section.getEndPos();
      expect(endPos).toEqual(Position.unknown);
    });
  });

  describe("toValue", () => {
    it("should convert to Section with object data", () => {
      const objectChild = createSimpleObject("testValue");
      const nameToken = new TokenNode(createMockToken(TokenType.STRING, "testSection", 0));
      const schemaToken = new TokenNode(createMockToken(TokenType.STRING, "$testSchema", 10));
      const section = new SectionNode(objectChild, nameToken, schemaToken);

      const result = section.toValue();

      expect(result).toBeInstanceOf(Section);
      expect(result.name).toBe("testSection");
      expect(result.schemaName).toBe("$testSchema");
      expect(result.data).toBeDefined();
    });

    it("should convert to Section with collection data", () => {
      const collectionChild = createSimpleCollection();
      const nameToken = new TokenNode(createMockToken(TokenType.STRING, "items", 0));
      const section = new SectionNode(collectionChild, nameToken, null);

      const result = section.toValue();

      expect(result).toBeInstanceOf(Section);
      expect(result.name).toBe("items");
      expect(result.schemaName).toBe("$schema");
      expect(result.data).toBeDefined();
    });

    it("should convert to Section with null data", () => {
      const nameToken = new TokenNode(createMockToken(TokenType.STRING, "empty", 0));
      const section = new SectionNode(null, nameToken, null);

      const result = section.toValue();

      expect(result).toBeInstanceOf(Section);
      expect(result.name).toBe("empty");
      expect(result.schemaName).toBe("$schema");
      expect(result.data).toBeNull();
    });

    it("should use correct names when only schema provided", () => {
      const objectChild = createSimpleObject();
      const schemaToken = new TokenNode(createMockToken(TokenType.STRING, "$userSchema", 0));
      const section = new SectionNode(objectChild, null, schemaToken);

      const result = section.toValue();

      expect(result).toBeInstanceOf(Section);
      expect(result.name).toBe("userSchema"); // Schema name without $
      expect(result.schemaName).toBe("$userSchema");
    });

    it("should use 'unnamed' when no name or schema", () => {
      const objectChild = createSimpleObject();
      const section = new SectionNode(objectChild, null, null);

      const result = section.toValue();

      expect(result).toBeInstanceOf(Section);
      expect(result.name).toBe("unnamed");
      expect(result.schemaName).toBe("$schema");
    });

    it("should pass definitions to child toValue", () => {
      const objectChild = createSimpleObject();
      const section = new SectionNode(objectChild, null, null);

      // Mock definitions
      const mockDefs = {
        getV: (key: string) => {
          return key === "test" ? "mockValue" : null;
        }
      } as any;

      // Spy on child's toValue method
      const toValueSpy = vi.spyOn(objectChild, 'toValue');

      section.toValue(mockDefs);

      expect(toValueSpy).toHaveBeenCalledWith(mockDefs);
    });
  });

  describe("Complex Section Structures", () => {
    it("should handle section with complex object containing nested structures", () => {
      // Create nested object structure
      const innerMember = new MemberNode(
        new TokenNode(createMockToken(TokenType.STRING, "innerValue", 10)),
        new TokenNode(createMockToken(TokenType.STRING, "innerKey", 5))
      );
      const innerObject = new ObjectNode([innerMember]);

      const outerMember = new MemberNode(
        innerObject,
        new TokenNode(createMockToken(TokenType.STRING, "nested", 0))
      );
      const outerObject = new ObjectNode([outerMember]);

      const nameToken = new TokenNode(createMockToken(TokenType.STRING, "complex", 0));
      const section = new SectionNode(outerObject, nameToken, null);

      expect(section.child).toBe(outerObject);
      expect(section.name).toBe("complex");
      expect(section.firstChildObject).toBe(outerObject);

      const result = section.toValue();
      expect(result).toBeInstanceOf(Section);
      expect(result.name).toBe("complex");
    });

    it("should handle section with collection containing multiple objects", () => {
      const obj1 = createSimpleObject("first");
      const obj2 = createSimpleObject("second");
      const obj3 = createSimpleObject("third");
      const collection = new CollectionNode([obj1, obj2, obj3]);

      const nameToken = new TokenNode(createMockToken(TokenType.STRING, "multiItems", 0));
      const section = new SectionNode(collection, nameToken, null);

      expect(section.child).toBe(collection);
      expect(section.name).toBe("multiItems");
      expect(section.firstChildObject).toBe(obj1);

      const result = section.toValue();
      expect(result).toBeInstanceOf(Section);
      expect(result.name).toBe("multiItems");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty string names", () => {
      const objectChild = createSimpleObject();
      const nameToken = new TokenNode(createMockToken(TokenType.STRING, "", 0));
      const section = new SectionNode(objectChild, nameToken, null);

      expect(section.name).toBe("unnamed"); // Empty string falls back to 'unnamed'
    });

    it("should handle schema names without $ prefix", () => {
      const objectChild = createSimpleObject();
      const schemaToken = new TokenNode(createMockToken(TokenType.STRING, "plainSchema", 0));
      const section = new SectionNode(objectChild, null, schemaToken);

      expect(section.name).toBe("lainSchema"); // First character is removed by substring(1)
      expect(section.schemaName).toBe("plainSchema");
    });

    it("should handle very long names", () => {
      const longName = "a".repeat(1000);
      const objectChild = createSimpleObject();
      const nameToken = new TokenNode(createMockToken(TokenType.STRING, longName, 0));
      const section = new SectionNode(objectChild, nameToken, null);

      expect(section.name).toBe(longName);
    });

    it("should handle special characters in names", () => {
      const specialName = "section-with_special.chars@123";
      const objectChild = createSimpleObject();
      const nameToken = new TokenNode(createMockToken(TokenType.STRING, specialName, 0));
      const section = new SectionNode(objectChild, nameToken, null);

      expect(section.name).toBe(specialName);
    });

    it("should handle numeric names", () => {
      const objectChild = createSimpleObject();
      const nameToken = new TokenNode(createMockToken(TokenType.NUMBER, 123, 0));
      const section = new SectionNode(objectChild, nameToken, null);

      expect(section.name).toBe(123);
    });
  });

  describe("Type Consistency", () => {
    it("should maintain type property", () => {
      const objectChild = createSimpleObject();
      const section = new SectionNode(objectChild, null, null);

      expect(section.type).toBe("section");
    });

    it("should maintain type property with all parameters", () => {
      const objectChild = createSimpleObject();
      const nameToken = new TokenNode(createMockToken(TokenType.STRING, "test", 0));
      const schemaToken = new TokenNode(createMockToken(TokenType.STRING, "$test", 5));
      const section = new SectionNode(objectChild, nameToken, schemaToken);

      expect(section.type).toBe("section");
    });
  });
});