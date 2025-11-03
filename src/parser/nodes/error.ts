import Definitions from "../../core/definitions";
import { Position } from '../../core/positions';
import Node from "./nodes";

/**
 * Error categories for styling and filtering
 */
export type ErrorCategory = 'syntax' | 'validation' | 'runtime';

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
   * Determines the error category based on the error type.
   * This enables UI to apply different styling (e.g., red for syntax, orange for validation).
   *
   * @returns 'syntax' for parser/syntax errors, 'validation' for schema validation errors, 'runtime' for others
   */
  private getErrorCategory(): ErrorCategory {
    const errorName = this.error.name;

    // Check for InternetObject error types
    if (errorName.includes('SyntaxError')) {
      return 'syntax';
    }
    if (errorName.includes('ValidationError')) {
      return 'validation';
    }

    // Fallback to runtime for unknown error types
    return 'runtime';
  }

  /**
   * Returns error information as a value object.
   * This allows ErrorNodes to be serialized alongside valid nodes.
   * Includes error category for UI styling.
   */
  toValue(defs?: Definitions): any {
    return {
      __error: true,
      category: this.getErrorCategory(),
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