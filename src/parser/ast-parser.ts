import assertNever      from '../errors/asserts/asserts';
import ErrorCodes       from '../errors/io-error-codes';
import SyntaxError      from '../errors/io-syntax-error';
import Symbols          from '../tokenizer/symbols';
import TokenType        from '../tokenizer/token-types';
import Token            from '../tokenizer/tokens';
import ArrayNode        from './nodes/array';
import CollectionNode   from './nodes/collections';
import DocumentNode     from './nodes/document';
import MemberNode       from './nodes/members';
import Node             from './nodes/nodes';
import ObjectNode       from './nodes/objects';
import SectionNode      from './nodes/section';
import TokenNode        from './nodes/tokens';

class ASTParser {

  // array of tokens produced by the tokenizer
  private tokens: Token[];
  private sectionNames: { [key: string]: boolean } = {};

  // current token index
  private current: number;
  private isCollection: boolean;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
    this.current = 0;
    this.isCollection = false;
  }

  public parse(): DocumentNode {
    return this.processDocument();
  }

  private processDocument(): DocumentNode {
    const sections = new Array<SectionNode>();
    let header: SectionNode | null = null;

    let token: Token | null = this.peek();
    let first = true;

    while (true) {
      if (first) {
        // When the first token is a section separator, it means that
        // header section is not present. Just skip the section separator
        if (token?.type === TokenType.SECTION_SEP) {
          first = false;
        }
      }

      const section = this.processSection(first);

      token = this.peek();
      if (!token) {
        sections.push(section);
        break;
      }

      if (first) {
        header = section;
      } else {
        sections.push(section);
      }

      if (first) first = false;

      // If the next token is not a section separator, it means that
      // the current section is not closed properly. Throw an error
      if (token.type !== TokenType.SECTION_SEP) {
        throw new SyntaxError(
          ErrorCodes.unexpectedToken,
          `Unexpected token ${token.type} at row ${token.row} col ${token.col}`,
          token
        );
      }

      // Move to the next token and check if it is a section separator
      // or the end of file
      this.advance();
    }

    // If there are more than one sections, and the document does not start
    // with --- then the first one is the header.
    // section. Remove it from the sections array and return it as the header
    // if (sections.length > 1 && this.tokens[0].type !== TokenType.SECTION_SEP) {
    //   const header = sections.shift();
    //   return new DocumentNode(header ?? null, sections);
    // }

    return new DocumentNode(header, sections)
  }

  private processSection(first: boolean): SectionNode {
    // If the first token is a section separator, it means that
    // the section has started without a section name. A header
    // section does not have a name.
    let schema:string;
    let name: string;
    let token = this.peek();

    // Consume the section separator if present
    if (token?.type === TokenType.SECTION_SEP) {
      this.advance();
    }

    [schema, name] = this.parseSectionAndSchemaNames();

    // Check if the section name is already used
    if (this.sectionNames[name]) {
      throw new SyntaxError(
        ErrorCodes.unexpectedToken,
        `Duplicate section name ${name}`,
        void 0, false
        );
      }

    if (!first || (first && name !== 'unnamed' && this.peek()?.type !== TokenType.SECTION_SEP)) {
      this.sectionNames[name] = true;
    }

    const section = this.parseSectionContent()
    return new SectionNode(section, name, schema);
  }

  private parseSectionAndSchemaNames(): [string, string] {
    let schema:string = '$schema';
    let name:string = 'unnamed';
    let token = this.peek();
    if (token?.type === TokenType.SECTION_NAME) {
      name = token!.value

      // Consume the section name
      this.advance();

      token = this.peek();
      if (token?.type === TokenType.SECTION_SCHEMA) {
        schema = token!.value
        // Consume the section name
        this.advance();
      }
    } else if (token?.type === TokenType.SECTION_SCHEMA) {
      schema = token!.value
      // Consume the section name
      this.advance();

      token = this.peek();
      name = schema?.substring(1) ?? name
    }

    return [schema, name]
  }

  public parseSectionContent():
    ObjectNode | CollectionNode | null {
    const token = this.peek();
    if (!token) return null;

    if (token.type === TokenType.SECTION_SEP) {
      return null;
    }

    // Parse the collection ~
    if (token.type === TokenType.COLLECTION_START) {
      this.isCollection = true;
      return this.processCollection()
    }

    // Parse the single object {}
    return this.processObject()
  }

  private processCollection(): CollectionNode {
    const objects: Node[] = [];

    while (this.match([TokenType.COLLECTION_START])) {
      // Consume the COLLECTION_START token
      this.advance();

      // Parse the object and add to the collection
      objects.push(this.processObject());

      // No explicit delimiter check is required since the `~`
      // itself acts as both a delimiter and an indicator for
      // the next object.
    }

    return new CollectionNode(objects);
  }

  private processObject(): ObjectNode {
    const obj = this.parseObject(true);

    // Even after parsing the object, if there is still a token
    // left, it means that the object is not closed properly.
    const token = this.peek()
    this.checkForPendingTokens(token);

    // If there is only one member in the object, and it has no key,
    // then the object is not an open object. In this case, we need
    // unwrap the object
    // For example. { {} } should be unwrapped to {}

    // {} should be unwrapped to []
    // 'a' should be unwrapped to [a]
    // 'a', 'b', 'c' should be unwrapped to [a, b, c]
    // {}, 'b', 'c' should be unwrapped to [{}, b, c]
    // {{}} should be unwrapped to [{}]
    if (obj.children.length === 1) {
      const firstMember = obj.children[0] as MemberNode;
      if (!firstMember.key) {
        if (firstMember.value instanceof ObjectNode) {
          return firstMember.value as ObjectNode;
        }
      }
    }

    return obj;
  }

  private checkForPendingTokens(token: Token | null) {
    if (!token) return;

    if (token.type === TokenType.SECTION_SEP) return

    if (this.isCollection &&
      token.type === TokenType.COLLECTION_START) return;

    throw new SyntaxError(
      ErrorCodes.unexpectedToken,
      token.value.toString(),
      token, false
    );
  }

  private parseObject(isOpenObject: boolean): ObjectNode {
    const members: Array<MemberNode> = [];

    let openBracket: Token | null = this.peek();
    if (isOpenObject) {
      openBracket = null;
    }

    if (!isOpenObject && !this.advanceIfMatch([TokenType.CURLY_OPEN])) {
      assertNever("The caller must ensure that this function is called " +
        "only when the next token is {");
    }

    let index = 0;
    while (true) {
      const nextToken = this.peek();

      if (!nextToken || this.match([TokenType.CURLY_CLOSE, TokenType.COLLECTION_START, TokenType.SECTION_SEP])) {
        this.backtrack();
        break;
      } else if (nextToken.type === TokenType.COMMA) {
        // If the next token is a comma(, or new object)
        // it means that the no value is provided.
        // Consume the comma and continue.
        if (this.matchNext([TokenType.COMMA, TokenType.CURLY_CLOSE, TokenType.COLLECTION_START, TokenType.SECTION_SEP])) {
          this.pushUndefinedMember(members, nextToken);
        }

        // If the next one is the end of file add undfined
        else if (this.current + 1 === this.tokens.length) {
          this.pushUndefinedMember(members, nextToken);
        }

        this.advance();
        continue;
      } else {
        // The member must be preceded by a comma, open bracket, or
        // the beginning of the object. Otherwise it is invalid
        // For example, { a: 1, b: 2 } is valid, but { a: 1 b: 2 } is not
        if (index > 0) {
          if (!this.matchPrev([TokenType.COMMA, TokenType.CURLY_OPEN])) {
            throw new SyntaxError(
              ErrorCodes.unexpectedToken,
              nextToken.value.toString(),
              nextToken, false
            );
          }
        }

        const member = this.parseMember();
        members.push(member);
        this.advance();

        if (this.peek() ?.type === TokenType.CURLY_CLOSE) {
          this.backtrack();
          break;
        }

        index++;
      }
    }

    // consume closing bracket
    this.advance();
    let closeBracket: Token | null = this.peek();
    if (isOpenObject) {
      closeBracket = null;
      return new ObjectNode(members);
    }

    if (!this.match([TokenType.CURLY_CLOSE])) {
      const lastToken = this.peek()
      throw new SyntaxError(ErrorCodes.expectingBracket, Symbols.CURLY_CLOSE,
        lastToken === null ? void 0 : lastToken, lastToken === null);
    }

    return new ObjectNode(members, openBracket!, closeBracket!);
  }

  private parseMember(): MemberNode {
    const leftToken = this.peek();

    if (!leftToken) {
      assertNever("The caller must ensure that this function is called " +
        "only when the member has at least one token");
    }

    if (this.matchNext([TokenType.COLON])) {
      const isValidKey = [
        TokenType.STRING,
        TokenType.NUMBER,
        TokenType.BOOLEAN,
        TokenType.NULL,
      ].includes(leftToken.type as TokenType);

      if (isValidKey) {
        // Consume the key and colon
        this.advance(2);

        // Parse the value and return the key-value pair
        const value = this.parseValue();
        return new MemberNode(value, leftToken as TokenNode);
      } else {
        throw new SyntaxError(ErrorCodes.invalidKey, leftToken.token, leftToken,
          false);
      }
    }

    // If the next token is not a colon, that means it is
    // a value without a key. In this case the key is
    // the index of the value
    return new MemberNode(this.parseValue());
  }

  private parseArray(): ArrayNode  {
    const arr: Array<Node | null> = [];

    const openBracket = this.peek();

    // Assume that the current token is the opening bracket
    // Consume the opening bracket
    this.advance();

    while (true) {
      const nextToken = this.peek();
      if (!nextToken || nextToken.type === TokenType.BRACKET_CLOSE) {
        this.backtrack();
        break;
      } else if (nextToken.type === TokenType.COMMA) {
        // If the next token is a comma, it means that the array
        // undefined value. Consume the comma and continue. Add
        // an undefined value to the array
        if (this.matchNext([TokenType.COMMA, TokenType.BRACKET_CLOSE])) {
          arr.push(null);
        }

        // consume the current comma
        this.advance();
        continue;
      }

      const member = this.parseMember();
      if (member.key) {
        arr.push(new ObjectNode([member]));
      } else {
        arr.push(member.value);
      }
      // const value = this.parseValue();
      // arr.push(value);
      this.advance();



      if (this.peek() ?.type === TokenType.BRACKET_CLOSE) {
        this.backtrack();
        break;
      }
    }

    // consume closing bracket
    this.advance();

    const closeBracket = this.peek();
    if (!closeBracket || closeBracket.type !== TokenType.BRACKET_CLOSE) {
      throw new SyntaxError(
        ErrorCodes.expectingBracket,
        Symbols.BRACKET_CLOSE,
        closeBracket === null ? void 0 : closeBracket,
        closeBracket === null
      );
    }

    return new ArrayNode(arr, openBracket!, closeBracket);
  }

  private parseValue(): Node {
    const token = this.peek();
    if (!token) {
      throw new SyntaxError(ErrorCodes.valueRequired, "Value required",
        void 0, true);
    }

    switch (token.type) {
      case TokenType.STRING:
      case TokenType.NUMBER:
      case TokenType.BIGINT:
      case TokenType.BOOLEAN:
      case TokenType.NULL:
      case TokenType.DATETIME:
        return new TokenNode(token);
      case TokenType.BRACKET_OPEN:
        return this.parseArray();
      case TokenType.CURLY_OPEN:
        return this.parseObject(false);
      default:
        throw new SyntaxError(
          ErrorCodes.unexpectedToken,
          token.value,
          token, token === null
        );
    }
  }

  private pushUndefinedMember(members: MemberNode[], curerntCommaToken:Token) {
    const valueNode = curerntCommaToken.clone();
    valueNode.type = TokenType.UNDEFINED;
    valueNode.value = void 0;
    const member = new MemberNode(new TokenNode(valueNode));

    members.push(member);
  }

  /**
   * Returns the current token without advancing the current index
   * @returns {Token} the current token or null if eof is reached
   */
  private peek(): Token | null {
    return this.current < this.tokens.length ? this.tokens[this.current] : null;
  }

  /**
   * Advances the current token index by the given number of steps
   */
  private advance(steps: number = 1) {
    this.current += steps;
  }

  private backtrack() {
    this.current--;
  }

  /**
   * Checks if the current token matches any of the given types.
   * If a current token is not available, returns false.
   * @param types
   * @returns
   */
  private match(types: TokenType[]): boolean {
    const currentToken = this.peek();
    if (currentToken && types.includes(currentToken.type as TokenType)) {
      return true;
    }
    return false;
  }

  private matchPrev(types: TokenType[]): boolean {
    const prevToken = this.tokens[this.current - 1];
    if (prevToken && types.includes(prevToken.type as TokenType)) {
      return true;
    }
    return false;
  }

  /**
   * Match the next token in the stream without advancing the current index. If the next token matches any of the given types, returns true, otherwise returns false. If the next token is not available, returns false.
   */
  private matchNext(types: TokenType[]): boolean {
    const nextToken = this.tokens[this.current + 1];
    if (nextToken && types.includes(nextToken.type as TokenType)) {
      return true;
    }
    return false;
  }

  private advanceIfMatch(types: TokenType[]): boolean {
    if (this.match(types)) {
      this.advance();
      return true;
    }
    return false;
  }
}

export default ASTParser;
