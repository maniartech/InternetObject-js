import assertNever      from '../errors/asserts/asserts';
import ErrorCodes       from '../errors/io-error-codes';
import SyntaxError      from '../errors/io-syntax-error';
import { tokenSpanRange } from '../errors/error-range-utils';
import Symbols          from './tokenizer/symbols';
import TokenType        from './tokenizer/token-types';
import Token            from './tokenizer/tokens';
import { isTerminator } from './tokenizer/is';
import ArrayNode        from './nodes/array';
import CollectionNode   from './nodes/collections';
import DocumentNode     from './nodes/document';
import ErrorNode        from './nodes/error';
import MemberNode       from './nodes/members';
import Node             from './nodes/nodes';
import ObjectNode       from './nodes/objects';
import SectionNode      from './nodes/section';
import TokenNode        from './nodes/tokens';

/**
 * ASTParser transforms a token stream into an Abstract Syntax Tree (AST).
 *
 * @remarks
 * This is a recursive descent parser with error recovery capabilities.
 * It implements a three-tier error recovery strategy:
 *
 * 1. **Token-level**: Handles individual token errors (via ERROR tokens from tokenizer)
 * 2. **Collection-level**: `skipToNextCollectionItem()` - recovers at `~` boundaries
 * 3. **Section-level**: `skipToNextSyncPoint()` - recovers at structural terminators
 *
 * The parser accumulates errors in the `errors` array and continues parsing,
 * allowing IDEs to show all diagnostics in a single pass.
 *
 * @example
 * ```ts
 * const tokenizer = new Tokenizer(input);
 * const tokens = tokenizer.tokenize();
 * const parser = new ASTParser(tokens);
 * const doc = parser.parse();
 *
 * // Check for errors
 * const errors = doc.getErrors();
 * if (errors.length > 0) {
 *   errors.forEach(e => console.error(e.message));
 * }
 * ```
 */
class ASTParser {

  /** Array of tokens produced by the tokenizer */
  private readonly tokens: readonly Token[];

  /** Tracks section names for duplicate detection */
  private readonly sectionNames: { [key: string]: boolean } = {};

  /** Accumulated errors during parsing for IDE diagnostics */
  private readonly errors: Error[] = [];

  /** Current token index in the token stream */
  private current: number;

  // Cached arrays for performance optimization (avoids array allocation in hot paths)
  private static readonly CURLY_OPEN_ARRAY = [TokenType.CURLY_OPEN] as const;
  private static readonly CURLY_CLOSE_ARRAY = [TokenType.CURLY_CLOSE] as const;
  private static readonly BRACKET_OPEN_ARRAY = [TokenType.BRACKET_OPEN] as const;
  private static readonly BRACKET_CLOSE_ARRAY = [TokenType.BRACKET_CLOSE] as const;
  private static readonly COLLECTION_START_ARRAY = [TokenType.COLLECTION_START] as const;
  private static readonly SECTION_SEP_ARRAY = [TokenType.SECTION_SEP] as const;
  private static readonly COMMA_ARRAY = [TokenType.COMMA] as const;
  private static readonly COLON_ARRAY = [TokenType.COLON] as const;
  private static readonly COLLECTION_OR_SECTION_ARRAY = [TokenType.COLLECTION_START, TokenType.SECTION_SEP] as const;
  private static readonly VALID_KEY_TYPES = [
    TokenType.STRING,
    TokenType.NUMBER,
    TokenType.BOOLEAN,
    TokenType.NULL,
  ] as const;

  /**
   * Creates a new ASTParser instance.
   * @param tokens - Read-only array of tokens from the tokenizer
   */
  constructor(tokens: readonly Token[]) {
    this.tokens = tokens;
    this.current = 0;
  }

  /**
   * Parses the token stream and produces a DocumentNode AST.
   *
   * @returns DocumentNode containing the parsed AST and accumulated errors
   */
  public parse(): DocumentNode {
    return this.processDocument();
  }

  /**
   * Creates a syntax error with proper range spanning the entire construct.
   *
   * @remarks
   * Industry standard (TypeScript, Roslyn): Error should highlight from
   * the opening token to the last valid token, not just a single point.
   * This provides better IDE experience for unclosed constructs.
   *
   * @param errorCode - The error code from ErrorCodes
   * @param message - Human-readable error message
   * @param startToken - Opening token of the construct (e.g., '{' or '[')
   * @param members - Array of parsed members/elements to find the last valid token
   * @returns SyntaxError with position range spanning the entire construct
   */
  private createUnclosedConstructError(
    errorCode: string,
    message: string,
    startToken: Token | null,
    members: Array<Node | undefined>
  ): SyntaxError {
    // Find the end position by looking backwards from current, skipping boundary tokens
    let errorEndToken: Token | null = null;

    // Start from the token before current position
    let checkIndex = this.current - 1;

    // Skip backwards over any boundary tokens (~ or ---)
    while (checkIndex >= 0) {
      const token = this.tokens[checkIndex];
      if (token &&
          token.type !== TokenType.COLLECTION_START &&
          token.type !== TokenType.SECTION_SEP) {
        errorEndToken = token;
        break;
      }
      checkIndex--;
    }

    // Create the error with proper range spanning the entire construct
    if (startToken && errorEndToken) {
      const range = tokenSpanRange(startToken, errorEndToken);
      return new SyntaxError(errorCode, message, range, false);
    } else if (startToken) {
      // Fallback: use start token only
      return new SyntaxError(errorCode, message, startToken, false);
    } else {
      // No tokens available - create error without position
      return new SyntaxError(errorCode, message, undefined, true);
    }
  }  private processDocument(): DocumentNode {
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
      // the current section is not closed properly. Add error and stop
      if (token.type !== TokenType.SECTION_SEP) {
        const error = new SyntaxError(
          ErrorCodes.unexpectedToken,
          `Expected section separator '---' but found '${token.token}'. Each section must be properly closed before starting a new one.`,
          token
        );
        this.errors.push(error);
        break; // Stop parsing but return partial document
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

    return new DocumentNode(header, sections, this.errors);
  }

  private processSection(first: boolean): SectionNode {
    let token = this.peek();

    // Consume the section separator if present
    if (token?.type === TokenType.SECTION_SEP) {
      this.advance();
    }

    // If the first token is a section separator, it means that
    // the section has started without a section name. A header
    // section does not have a name.
    const [schemaNode, nameNode] = this.parseSectionAndSchemaNames();
    let name: string = nameNode?.value != null ? String(nameNode.value)
      : (schemaNode?.value != null ? String(schemaNode.value).substring(1) : 'unnamed');
    const originalName = name;

    // Check if the section name is already used - implement auto-rename for error recovery
    if (name && this.sectionNames[name]) {
      const error = new SyntaxError(
        ErrorCodes.unexpectedToken,
        `Duplicate section name '${name}'. Each section must have a unique name within the document.`,
        void 0, false
      );
      this.errors.push(error); // Accumulate error

      // Auto-rename: users -> users_2, users_3, etc.
      let suffix = 2;
      while (this.sectionNames[`${originalName}_${suffix}`]) {
        suffix++;
      }
      name = `${originalName}_${suffix}`;

      // Update the nameNode with the renamed value
      if (nameNode) {
        nameNode.value = name;
      }
    }

    if (!first || (first && name !== 'unnamed' && this.peek()?.type !== TokenType.SECTION_SEP)) {
      this.sectionNames[name] = true;
    }

    const section = this.parseSectionContent();
    return new SectionNode(section, nameNode, schemaNode);
  }

  private parseSectionAndSchemaNames(): [TokenNode | null, TokenNode | null] {
    let schemaNode:TokenNode | null = null;
    let nameNode:TokenNode | null = null;

    let token = this.peek();
    if (token?.subType === TokenType.SECTION_NAME) {
      nameNode = token as TokenNode;

      // Consume the section name
      this.advance();

      token = this.peek();
      if (token?.subType === TokenType.SECTION_SCHEMA) {
        schemaNode = token as TokenNode;
        // Consume the section name
        this.advance();
      }
    } else if (token?.subType === TokenType.SECTION_SCHEMA) {
      schemaNode = token as TokenNode;
      // Consume the section name
      this.advance();

      token = this.peek();
    }

    return [schemaNode, nameNode]
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
      return this.processCollection();
    }

    // Parse the single object {}
    return this.processObject(false);
  }

  private processCollection(): CollectionNode {
    const objects: Node[] = [];

    while (this.match(ASTParser.COLLECTION_START_ARRAY)) {
      // Consume the COLLECTION_START token
      this.advance();

      // Remember the position before parsing the item (for fallback)
      const itemStartPos = this.current;

      // Check if the first token of this collection item is an ERROR token
      // If so, treat the entire item as an ErrorNode
      const firstToken = this.peek();
      if (firstToken && firstToken.type === TokenType.ERROR) {
        const errorValue = firstToken.value as { __error: true; message: string; originalError: Error };
        const errorNode = new ErrorNode(errorValue.originalError, firstToken);
        this.errors.push(errorValue.originalError);
        objects.push(errorNode);
        this.advance(); // Consume the error token
        this.skipToNextCollectionItem();
        continue;
      }

      try {
        // Parse the object and add to the collection
        objects.push(this.processObject(true));
      } catch (error) {
        // Accumulate error for Phase 2
        this.errors.push(error as Error);

        // Create error node with actual error position
        let position = { pos: -1, row: -1, col: -1 };
        let endPosition = undefined;

        // Extract position from IOError if available
        if (error && typeof error === 'object' && 'positionRange' in error) {
          const posRange = (error as any).positionRange;
          if (posRange && posRange.getStartPos) {
            position = posRange.getStartPos();
            endPosition = posRange.getEndPos ? posRange.getEndPos() : undefined;
          }
        }

        // Fallback: if no position in error, use the last valid token position
        if (position.pos === -1 && this.current > 0 && this.current <= this.tokens.length) {
          const lastToken = this.tokens[this.current - 1];
          if (lastToken) {
            position = lastToken.getEndPos(); // Use end position of last token
            endPosition = position; // Point to same location
          }
        }

        objects.push(new ErrorNode(error as Error, position, endPosition));
        this.skipToNextCollectionItem();
      }
      // No explicit delimiter check is required since the `~`
      // itself acts as both a delimiter and an indicator for
      // the next object.
    }

    return new CollectionNode(objects);
  }

  /**
   * Skips tokens until the next collection item boundary.
   *
   * @remarks
   * This is a **collection-level error recovery** mechanism.
   * When an error occurs while parsing a collection item, this method
   * advances the token stream to the next `~` (COLLECTION_START) or
   * section separator (`---`), allowing parsing to continue with the
   * next collection item.
   *
   * Recovery pattern:
   * ```
   * ~ valid, item           ← parsed successfully
   * ~ { unclosed object     ← error here, skipToNextCollectionItem called
   * ~ another, valid        ← parsing resumes here
   * ```
   */
  private skipToNextCollectionItem(): void {
    // Skip tokens until we find next `~` (COLLECTION_START) or section end
    while (this.peek() &&
           !this.match(ASTParser.COLLECTION_OR_SECTION_ARRAY)) {
      this.advance();
    }
  }

  /**
   * Skips tokens to the next synchronization point after a parsing error.
   *
   * @remarks
   * This is a **section-level error recovery** mechanism.
   * Synchronization points are structural terminator tokens (comma, colon,
   * brackets, etc.) that serve as safe resumption points after an error.
   *
   * This method is more aggressive than `skipToNextCollectionItem()` and
   * is used when errors occur in non-collection contexts or when finer-grained
   * recovery is needed.
   *
   * The method uses `isTerminator()` to check for token types that represent
   * structural boundaries in the Internet Object format.
   */
  private skipToNextSyncPoint(): void {
    while (this.peek()) {
      const token = this.peek();
      if (!token) break;

      // Check if we've reached a terminator token (structural boundary at token level)
      // Note: We check token.type (e.g., "COMMA", "COLON") not raw characters
      // because we're in the parser working with tokens, not the tokenizer working with chars.
      // Use isTerminator() for token types, not isCharTerminator() for characters.
      if (isTerminator(token.type)) {
        break; // Found a synchronization point, stop here
      }

      this.advance();
    }
  }

  private processObject(isCollectionContext: boolean): ObjectNode {
    const obj = this.parseObject(true);

    // Even after parsing the object, if there is still a token
    // left, it means that the object is not closed properly.
    const token = this.peek();
    this.checkForPendingTokens(token, isCollectionContext);

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
      if (firstMember && !firstMember.key && firstMember.value) {
        if (firstMember.value instanceof ObjectNode) {
          return firstMember.value as ObjectNode;
        }
      }
    }

    return obj;
  }

  private checkForPendingTokens(token: Token | null, isCollectionContext: boolean) {
    if (!token) return;

    if (token.type === TokenType.SECTION_SEP) return;

    if (isCollectionContext && token.type === TokenType.COLLECTION_START) return;

    throw new SyntaxError(
      ErrorCodes.unexpectedToken,
      `Unexpected token '${token.value}'. Expected end of section or start of new collection item '~'.`,
      token, false
    );
  }

  private parseObject(isOpenObject: boolean): ObjectNode {
    const members: Array<MemberNode> = [];
    let openBracket: Token | null = this.peek();
    if (isOpenObject) {
      openBracket = null;
    }

    if (!isOpenObject && !this.advanceIfMatch(ASTParser.CURLY_OPEN_ARRAY)) {
      assertNever("The caller must ensure that this function is called " +
        "only when the next token is {");
    }

    let index = 0;
    let done = false;
    let expectingValueAfterComma = true;  // After '{', we're expecting the first value (or empty position)

    while (!done) {
      const nextToken = this.peek();

      // DEBUG
      const DEBUG_PARSE_OBJECT = false; // Set to true to debug
      if (DEBUG_PARSE_OBJECT && members.length < 3) {
        const prevToken = this.tokens[this.current - 1];
        console.log(`  loop: current=${this.current}, next=${nextToken?.type}, prev=${prevToken?.type}, expecting=${expectingValueAfterComma}, members=${members.length}`);
      }

      if (!nextToken || this.match([TokenType.CURLY_CLOSE, TokenType.COLLECTION_START, TokenType.SECTION_SEP])) {
        // If we were expecting a value after a comma but hit end/close, that position is empty
        if (expectingValueAfterComma) {
          const prevToken = this.tokens[this.current - 1];
          if (prevToken && prevToken.type === TokenType.COMMA) {
            this.pushUndefinedMember(members, prevToken);
          }
        }
        done = true;
        break;
      } else if (nextToken.type === TokenType.COMMA) {
        // If we're expecting a value but got a comma, the current position is empty
        if (expectingValueAfterComma) {
          // Use the comma token itself for position tracking
          this.pushUndefinedMember(members, nextToken);
        }
        // Consume the comma and mark that we're now expecting a value
        this.advance();
        expectingValueAfterComma = true;
        continue;
      } else {
        // We found a value
        // The member must be preceded by a comma, open bracket, or
        // the beginning of the object. Otherwise it is invalid
        // For example, { a: 1, b: 2 } is valid, but { a: 1 b: 2 } is not
        if (index > 0) {
          if (!this.matchPrev([TokenType.COMMA, TokenType.CURLY_OPEN])) {
            throw new SyntaxError(
              ErrorCodes.unexpectedToken,
              `Missing comma before '${nextToken.value}'. Object members must be separated by commas.`,
              nextToken, false
            );
          }
        }
        const member = this.parseMember();
        members.push(member);
        index++;
        expectingValueAfterComma = false;  // We got the value
      }
    }

    // Now, expect a closing bracket if not open object
    if (!isOpenObject) {
      if (!this.match(ASTParser.CURLY_CLOSE_ARRAY)) {
        throw this.createUnclosedConstructError(
          ErrorCodes.expectingBracket,
          `Missing closing brace '}'. Object must be properly closed.`,
          openBracket,
          members
        );
      }
      let closeBracket: Token | null = this.peek();
      this.advance();
      return new ObjectNode(members, openBracket!, closeBracket!);
    } else {
      return new ObjectNode(members);
    }
  }

  private parseMember(): MemberNode {
    const leftToken = this.peek();

    if (!leftToken) {
      assertNever("The caller must ensure that this function is called " +
        "only when the member has at least one token");
    }

    if (this.matchNext(ASTParser.COLON_ARRAY)) {
      const isValidKey = (ASTParser.VALID_KEY_TYPES as readonly TokenType[]).includes(leftToken.type as TokenType);

      if (isValidKey) {
        // Consume the key and colon
        this.advance(2);

        // Parse the value and return the key-value pair
        const value = this.parseValue();
        return new MemberNode(value, leftToken as TokenNode);
      } else {
        throw new SyntaxError(ErrorCodes.invalidKey,
          `Invalid key '${leftToken.token}'. Object keys must be strings, numbers, booleans, or null.`,
          leftToken, false);
      }
    }

    // If the next token is not a colon, that means it is
    // a value without a key. In this case the key is
    // the index of the value
    return new MemberNode(this.parseValue());
  }

  private parseArray(): ArrayNode  {
    const arr: Array<Node | undefined> = [];
    const openBracket = this.peek();
    if (!openBracket || openBracket.type !== TokenType.BRACKET_OPEN) {
      throw new SyntaxError(
        ErrorCodes.expectingBracket,
        `Expected opening bracket '[' to start array but found '${openBracket?.token || 'end of input'}'.`,
        openBracket === null ? void 0 : openBracket,
        openBracket === null
      );
    }
    // Consume the opening bracket
    this.advance();

    while (true) {
      const currentToken = this.peek();
      if (!currentToken) {
        // Unexpected end of input
        throw this.createUnclosedConstructError(
          ErrorCodes.expectingBracket,
          `Unexpected end of input while parsing array. Expected closing bracket ']'.`,
          openBracket,
          arr
        );
      }
      if (currentToken.type === TokenType.BRACKET_CLOSE) {
        break;
      } else if (currentToken.type === TokenType.COLLECTION_START ||
                 currentToken.type === TokenType.SECTION_SEP) {
        // Reached a synchronization boundary without closing the array
        throw this.createUnclosedConstructError(
          ErrorCodes.expectingBracket,
          `Missing closing bracket ']'. Array must be properly closed.`,
          openBracket,
          arr
        );
      } else if (currentToken.type === TokenType.COMMA) {
        // If the next token is a comma or a closing bracket, it implies an undefined
        // element in the array, which is not allowed. Throw an error.
        if (this.matchNext([TokenType.COMMA, TokenType.BRACKET_CLOSE])) {
          const nextToken = this.tokens[this.current + 1];
          throw new SyntaxError(
            ErrorCodes.unexpectedToken,
            `Unexpected comma. Array elements cannot be empty - remove the extra comma or add a value.`,
            nextToken, false
          );
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
    }

    // Now, expect a closing bracket
    if (!this.match(ASTParser.BRACKET_CLOSE_ARRAY)) {
      throw this.createUnclosedConstructError(
        ErrorCodes.expectingBracket,
        `Missing closing bracket ']'. Array must be properly closed.`,
        openBracket,
        arr
      );
    }
    const closeBracket = this.peek();
    this.advance();
    // Both openBracket and closeBracket are guaranteed to be Token (not null) here
    return new ArrayNode(arr, openBracket, closeBracket!);
  }

  private parseValue(): Node {
    const token = this.peek();
    if (!token) {
      throw new SyntaxError(ErrorCodes.valueRequired,
        `Unexpected end of input. Expected a value (string, number, boolean, null, array, or object).`,
        void 0, true);
    }

    switch (token.type) {
      case TokenType.STRING:
      case TokenType.NUMBER:
      case TokenType.BIGINT:
      case TokenType.DECIMAL:
      case TokenType.BOOLEAN:
      case TokenType.NULL:
      case TokenType.DATETIME: {
        const node = new TokenNode(token);
        this.advance();
        return node;
      }
      case TokenType.BRACKET_OPEN:
        return this.parseArray();
      case TokenType.CURLY_OPEN:
        return this.parseObject(false);
      case TokenType.ERROR: {
        // Handle error tokens from tokenizer (e.g., unterminated strings)
        // The current node becomes invalid, so we create an ErrorNode and skip to next sync point
        const errorValue = token.value as { __error: true; message: string; originalError: Error };
        const errorNode = new ErrorNode(errorValue.originalError, token);
        this.errors.push(errorValue.originalError); // Add to error collection
        this.advance(); // Move past the error token

        // Skip to next synchronization boundary (collection/section delimiter or comma)
        // This helps recover from the error and continue parsing the next valid item
        this.skipToNextSyncPoint();

        return errorNode;
      }
      default:
        throw new SyntaxError(
          ErrorCodes.unexpectedToken,
          `Unexpected token '${token.value}'. Expected a valid value (string, number, boolean, null, array, or object).`,
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
   * Type guard to check if a token is valid (not null)
   */
  private isValidToken(token: Token | null): token is Token {
    return token !== null;
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
  private advance(steps: number = 1): void {
    this.current += steps;
  }

  /**
   * Checks if the current token matches any of the given types.
   * If a current token is not available, returns false.
   * @param types - Array of token types to match against
   * @returns true if current token matches any of the given types
   */
  private match(types: readonly TokenType[]): boolean {
    const currentToken = this.peek();
    if (this.isValidToken(currentToken) && types.includes(currentToken.type as TokenType)) {
      return true;
    }
    return false;
  }

  private matchPrev(types: readonly TokenType[]): boolean {
    const prevToken = this.tokens[this.current - 1];
    if (this.isValidToken(prevToken) && types.includes(prevToken.type as TokenType)) {
      return true;
    }
    return false;
  }

  /**
   * Match the next token in the stream without advancing the current index.
   * If the next token matches any of the given types, returns true, otherwise returns false.
   * If the next token is not available, returns false.
   * @param types - Array of token types to match against
   * @returns true if next token matches any of the given types
   */
  private matchNext(types: readonly TokenType[]): boolean {
    if (this.current + 1 >= this.tokens.length) {
      return false;
    }
    const nextToken = this.tokens[this.current + 1];
    if (this.isValidToken(nextToken) && types.includes(nextToken.type as TokenType)) {
      return true;
    }
    return false;
  }

  private advanceIfMatch(types: readonly TokenType[]): boolean {
    if (this.match(types)) {
      this.advance();
      return true;
    }
    return false;
  }
}

export default ASTParser;
