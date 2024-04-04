import Definitions from "../../core/definitions";
import PositionRange from "../../core/position-range";

interface Node extends PositionRange {
  toValue: (defs?: Definitions) => any;
}

export default Node;
