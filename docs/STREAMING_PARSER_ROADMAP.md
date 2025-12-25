# Streaming Parser Architecture & Roadmap

## Current Architecture: "Framer + DOM Parser"

The current streaming implementation (`src/streaming/open-stream.ts`) uses a pragmatic "Framer" approach to support streaming without rewriting the core parser.

### How it works
1.  **ChunkDecoder**: Receives raw bytes and decodes them into strings (handling multi-byte character splits).
2.  **Framer (openStream)**: Buffers these strings and splits them into lines.
3.  **State Tracking**: It uses a lightweight state machine (`updateStringState`) to track if the current line is inside a quoted string.
4.  **Record Detection**: It looks for record separators (`~` or `---`) at the start of a line.
    *   If a separator is found AND we are not inside a string, it considers the previous lines as a "complete record".
5.  **Parsing**: The complete record string is passed to the core `parse()` function.

### Limitations
*   **Dual Logic**: Syntax logic (like quote handling) is duplicated between the Framer and the Core Parser. If they diverge, bugs occur (e.g., the single-quote issue fixed in Dec 2025).
*   **Memory Overhead**: Requires buffering the entire record string in memory before parsing.
*   **Performance**: Involves string concatenation and copying.

## Future Roadmap: SAX-Style Parser

To achieve maximum performance, memory efficiency, and correctness, we should eventually migrate to a **Resumable SAX-Style Parser**.

### Goals
1.  **Single Source of Truth**: The tokenizer should be the only component deciding what is a string, what is a separator, etc.
2.  **Zero-Copy**: Parse directly from the stream buffer without intermediate string creation.
3.  **Resumability**: The parser must be able to pause at *any* character (e.g., middle of a keyword, middle of a string) and resume when the next chunk arrives.

### Implementation Strategy
*   **Event-Driven**: The parser emits events like `onStartObject`, `onKey`, `onValue`, `onEndObject`.
*   **State Machine**: The parser maintains its internal state (e.g., `EXPECT_KEY`, `READING_STRING`) explicitly, allowing it to save/restore state between chunks.
*   **Unified Tokenizer**: The same tokenizer logic should be used for both the synchronous `parse()` and the asynchronous `openStream()`.

### Benefits
*   **Robustness**: Eliminates "framer vs parser" logic mismatches.
*   **Efficiency**: O(1) memory usage relative to stream size (only need to buffer the current token).
*   **Speed**: Removes overhead of string manipulation.
