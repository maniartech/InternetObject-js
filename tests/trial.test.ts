import Tokenizer from "../src/parser/tokenizer";
import ASTParser from "../src/parser/ast-parser";
import CollectionNode from "../src/parser/nodes/collections";
import Definitions from "../src/core/definitions";
import TokenNode from "../src/parser/nodes/tokens";
import Token from "../src/parser/tokenizer/tokens";
import TokenType from "../src/parser/tokenizer/token-types";
import MemberNode from "../src/parser/nodes/members";

// Only failing tests for isolation
  const createMockToken = (type: TokenType, value: any, pos: number = 0): Token => {
    const token = new Token();
    token.type = type;
    token.value = value;
    token.token = value === null ? "null" : value === undefined ? "undefined" : value.toString();
    token.pos = pos;
    token.row = 1;
    token.col = pos + 1;
    return token;
  };

describe('Trial - Failing Tests Only', () => {
  it('provides isolation for debugging breaking code', () => {
    // write your isolated test here

  });
});
