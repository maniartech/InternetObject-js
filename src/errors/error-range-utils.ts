import { Position } from "../core/positions";
import PositionRange from "../core/positions";
import Token from "../parser/tokenizer/tokens";
import IOError from "./io-error";

/**
 * Utility functions for creating proper error ranges across tokenizer, parser, and validator.
 *
 * Industry-standard approach (TypeScript, Roslyn, rust-analyzer):
 * 1. Single-token errors: Highlight the specific problematic token
 * 2. Construct errors: Span entire construct (from opening to expected closing)
 * 3. Validation errors: Highlight the exact value that failed validation
 * 4. Unclosed/unterminated: From start to end of input or boundary
 */

/**
 * Creates a PositionRange from a single token.
 * Use for: Invalid characters, unexpected tokens, type mismatches.
 *
 * @param token - The token to create range from
 * @returns PositionRange spanning the token
 */
export function singleTokenRange(token: Token): PositionRange {
  return {
    getStartPos: () => token.getStartPos(),
    getEndPos: () => token.getEndPos()
  };
}

/**
 * Creates a PositionRange spanning multiple tokens.
 * Use for: Multi-token expressions, schema definitions.
 *
 * @param startToken - First token of the range
 * @param endToken - Last token of the range
 * @returns PositionRange spanning from start to end
 */
export function tokenSpanRange(startToken: Token, endToken: Token): PositionRange {
  return {
    getStartPos: () => startToken.getStartPos(),
    getEndPos: () => endToken.getEndPos()
  };
}

/**
 * Creates a PositionRange for unclosed constructs (strings, arrays, objects).
 * Industry standard: Span from opening delimiter to where closing should be.
 *
 * @param startToken - Opening delimiter token (", [, {, etc.)
 * @param currentPos - Current position when error detected
 * @returns PositionRange spanning the unclosed construct
 */
export function unclosedConstructRange(
  startToken: Token,
  currentPos: Position
): PositionRange {
  return {
    getStartPos: () => startToken.getStartPos(),
    getEndPos: () => currentPos
  };
}

/**
 * Creates a PositionRange for construct with explicit start and end positions.
 * Use for: Validation errors on specific values, type mismatches.
 *
 * @param startPos - Start position
 * @param endPos - End position
 * @returns PositionRange spanning the positions
 */
export function positionSpanRange(startPos: Position, endPos: Position): PositionRange {
  return {
    getStartPos: () => startPos,
    getEndPos: () => endPos
  };
}

/**
 * Sets the position range on an error object.
 * Automatically updates the error message to include position.
 *
 * @param error - The error to set range on
 * @param range - The position range
 * @returns The error (for chaining)
 */
export function setErrorRange<T extends IOError>(error: T, range: PositionRange): T {
  error.positionRange = range;
  return error;
}

/**
 * Creates a PositionRange from a start token to end of available content.
 * Use for: Unterminated strings, unclosed brackets at EOF.
 *
 * @param startToken - Opening token
 * @param lastPos - Last valid position in the input
 * @returns PositionRange from start to last position
 */
export function toEndOfInputRange(
  startToken: Token,
  lastPos: Position
): PositionRange {
  return {
    getStartPos: () => startToken.getStartPos(),
    getEndPos: () => lastPos
  };
}

/**
 * Helper to create a Position object.
 *
 * @param pos - Absolute position
 * @param row - Line number (1-based)
 * @param col - Column number (1-based)
 * @returns Position object
 */
export function createPosition(pos: number, row: number, col: number): Position {
  return { pos, row, col };
}
