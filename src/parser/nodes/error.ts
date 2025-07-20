import Definitions from "../../core/definitions";
import { Position } from '../../core/position-range';
import Node from "./nodes";

/**
 * ErrorNode represents a parsing error that occurred during AST construction.
 * This allows the parser to continue processing and collect multiple errors
 * instead of stopping at the first error encountered.
 */
class ErrorNode implements Node {
  readonly error: Error;
  readonly position: Position;
  readonly endPosition?: Position;

  constructor(error: Error, position: Position, endPosition?: Position) {
    this.error = error;
    this.position = position;
    this.endPosition = endPosition;
  }

  /**
   * Returns error information as a value object.
   * This allows ErrorNodes to be serialized alongside valid nodes.
   */
  toValue(defs?: Definitions): any {
    return {
      __error: true,
      message: this.error.message,
      name: this.error.name,
      position: this.position,
      ...(this.endPosition && { endPosition: this.endPosition })
    };
  }

  /**
   * Returns the starting position of the error.
   */
  getStartPos(): Position {
    return this.position;
  }

  /**
   * Returns the ending position of the error.
   * If no end position was provided, returns the start position.
   */
  getEndPos(): Position {
    return this.endPosition || this.position;
  }
}

export default ErrorNode;