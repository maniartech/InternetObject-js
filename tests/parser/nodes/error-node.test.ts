import ErrorNode from "../../../src/parser/nodes/error";
import { Position } from "../../../src/core/position-range";

describe('ErrorNode', () => {
  const mockPosition: Position = { pos: 10, row: 2, col: 5 };
  const mockEndPosition: Position = { pos: 15, row: 2, col: 10 };
  const mockError = new Error("Test error message");

  describe('constructor', () => {
    it('should create ErrorNode with error and position', () => {
      const errorNode = new ErrorNode(mockError, mockPosition);

      expect(errorNode.error).toBe(mockError);
      expect(errorNode.position).toBe(mockPosition);
      expect(errorNode.endPosition).toBeUndefined();
    });

    it('should create ErrorNode with error, position, and end position', () => {
      const errorNode = new ErrorNode(mockError, mockPosition, mockEndPosition);

      expect(errorNode.error).toBe(mockError);
      expect(errorNode.position).toBe(mockPosition);
      expect(errorNode.endPosition).toBe(mockEndPosition);
    });
  });

  describe('toValue', () => {
    it('should return error information object without end position', () => {
      const errorNode = new ErrorNode(mockError, mockPosition);
      const result = errorNode.toValue();

      expect(result).toEqual({
        __error: true,
        message: "Test error message",
        name: "Error",
        position: mockPosition
      });
    });

    it('should return error information object with end position', () => {
      const errorNode = new ErrorNode(mockError, mockPosition, mockEndPosition);
      const result = errorNode.toValue();

      expect(result).toEqual({
        __error: true,
        message: "Test error message",
        name: "Error",
        position: mockPosition,
        endPosition: mockEndPosition
      });
    });

    it('should work with custom error types', () => {
      const customError = new SyntaxError("Custom syntax error");
      const errorNode = new ErrorNode(customError, mockPosition);
      const result = errorNode.toValue();

      expect(result).toEqual({
        __error: true,
        message: "Custom syntax error",
        name: "SyntaxError",
        position: mockPosition
      });
    });
  });

  describe('position tracking', () => {
    it('should return correct start position', () => {
      const errorNode = new ErrorNode(mockError, mockPosition);

      expect(errorNode.getStartPos()).toBe(mockPosition);
    });

    it('should return correct end position when provided', () => {
      const errorNode = new ErrorNode(mockError, mockPosition, mockEndPosition);

      expect(errorNode.getEndPos()).toBe(mockEndPosition);
    });

    it('should return start position as end position when end position not provided', () => {
      const errorNode = new ErrorNode(mockError, mockPosition);

      expect(errorNode.getEndPos()).toBe(mockPosition);
    });
  });

  describe('Node interface compliance', () => {
    it('should implement Node interface correctly', () => {
      const errorNode = new ErrorNode(mockError, mockPosition);

      // Should have toValue method
      expect(typeof errorNode.toValue).toBe('function');

      // Should have position methods (from PositionRange)
      expect(typeof errorNode.getStartPos).toBe('function');
      expect(typeof errorNode.getEndPos).toBe('function');

      // Should return valid positions
      expect(errorNode.getStartPos()).toEqual(mockPosition);
      expect(errorNode.getEndPos()).toEqual(mockPosition);
    });
  });
});