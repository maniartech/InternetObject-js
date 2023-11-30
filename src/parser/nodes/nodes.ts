import Definitions from "../../core/definitions";
import Position from "../../tokenizer/position";

interface Node extends Position {
  toValue: (defs?: Definitions) => any;
}

export default Node;
