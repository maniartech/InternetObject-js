import ErrorNode from "../../../src/parser/nodes/error";
import ObjectNode from "../../../src/parser/nodes/objects";
import CollectionNode from "../../../src/parser/nodes/collections";
import { Position } from "../../../src/core/position-range";

describe('ErrorNode Integration', () => {
  const mockPosition: Position = { pos: 10, row: 2, col: 5 };
  const mockError = new SyntaxError("Invalid object syntax");

  it('should work alongside valid nodes in collections', () => {
    // Create a valid object node (simplified)
    const validObject = new ObjectNode([]);

    // Create an error node
    const errorNode = new ErrorNode(mockError, mockPosition);

    // Create a collection with both valid and error nodes
    const collection = new CollectionNode([validObject, errorNode]);

    expect(collection.children).toHaveLength(2);
    expect(collection.children[0]).toBeInstanceOf(ObjectNode);
    expect(collection.children[1]).toBeInstanceOf(ErrorNode);
  });

  it('should serialize properly in mixed collections', () => {
    // Create a valid object node (simplified)
    const validObject = new ObjectNode([]);

    // Create an error node
    const errorNode = new ErrorNode(mockError, mockPosition);

    // Create a collection with both valid and error nodes
    const collection = new CollectionNode([validObject, errorNode]);

    const result = collection.toValue();

    // Result should be a Collection instance
    expect(result.length).toBe(2);

    // First item should be the valid object (empty InternetObject)
    const firstItem = result.getAt(0);
    expect(typeof firstItem).toBe('object');
    expect(firstItem.__error).toBeUndefined();

    // Second item should be the error information
    const secondItem = result.getAt(1);
    expect(secondItem.__error).toBe(true);
    expect(secondItem.message).toBe("Invalid object syntax");
    expect(secondItem.name).toBe("SyntaxError");
    expect(secondItem.position).toEqual(mockPosition);
  });

  it('should maintain position information for error ordering', () => {
    const position1: Position = { pos: 5, row: 1, col: 5 };
    const position2: Position = { pos: 15, row: 2, col: 3 };
    const position3: Position = { pos: 25, row: 3, col: 1 };

    const error1 = new ErrorNode(new Error("First error"), position1);
    const error2 = new ErrorNode(new Error("Second error"), position2);
    const error3 = new ErrorNode(new Error("Third error"), position3);

    const errors = [error1, error2, error3];

    // Verify positions are maintained correctly
    expect(error1.getStartPos().pos).toBe(5);
    expect(error2.getStartPos().pos).toBe(15);
    expect(error3.getStartPos().pos).toBe(25);

    // Verify errors can be sorted by position
    const sortedErrors = errors.sort((a, b) => a.getStartPos().pos - b.getStartPos().pos);
    expect(sortedErrors[0]).toBe(error1);
    expect(sortedErrors[1]).toBe(error2);
    expect(sortedErrors[2]).toBe(error3);
  });
});