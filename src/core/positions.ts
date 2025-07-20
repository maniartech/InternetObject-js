
export interface Position {
  pos: number;
  row: number;
  col: number;
}

interface PositionRange {
  getStartPos(): Position;

  getEndPos(): Position;
}

export default PositionRange;
