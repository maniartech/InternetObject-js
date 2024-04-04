import Position from "./position";

interface PositionRange {
  getStartPos(): Position;

  getEndPos(): Position;
}

export default PositionRange;
