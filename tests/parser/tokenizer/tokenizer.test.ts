import Tokenizer from '../../../src/parser/tokenizer';
import TokenType from '../../../src/parser/tokenizer/token-types';
import Token from '../../../src/parser/tokenizer/tokens';
import Decimal from '../../../src/core/decimal';

describe('Tokenizer', () => {
  test('should be defined', () => {
    expect(Tokenizer).toBeDefined();
    expect(TokenType).toBeDefined();
    expect(Token).toBeDefined();
    expect(Decimal).toBeDefined();
  });
});
