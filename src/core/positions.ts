
export interface Position {
  pos: number;
  row: number;
  col: number;
}

/**
 * Position utilities for working with source positions.
 */
export const Position = {
  /**
   * Represents an unknown or uninitialized position.
   * Use this instead of inline { pos: 0, row: 0, col: 0 } for clarity.
   * pos: -1 distinguishes "unknown" from "start of file" (pos: 0).
   */
  unknown: Object.freeze({ pos: -1, row: 0, col: 0 }) as Position,

  /**
   * Checks if a position is unknown/uninitialized.
   * @param pos - The position to check
   * @returns true if the position is unknown (pos === -1)
   */
  isUnknown(pos: Position): boolean {
    return pos.pos === -1;
  },

  /**
   * Creates a new Position object.
   * @param pos - Absolute character position (0-based)
   * @param row - Line number (1-based)
   * @param col - Column number (1-based)
   */
  create(pos: number, row: number, col: number): Position {
    return { pos, row, col };
  }
};

interface PositionRange {
  getStartPos(): Position;

  getEndPos(): Position;
}

export default PositionRange;
