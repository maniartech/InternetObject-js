import Definitions from "../../core/definitions";

interface Node {
  toValue: (defs?: Definitions) => any;
}

export default Node;
