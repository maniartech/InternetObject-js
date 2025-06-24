# Internet Object Cross-Language Porting Roadmap

## Phase 1: Reference & Standardization

* [ ] **Lock the JavaScript/TypeScript Reference Implementation**

  * Finalize and freeze API, serialization, streaming, error handling, and validation logic.
  * Ensure all behavior is specified by code **and** documentation.
* [ ] **Create Language-Agnostic Test Suite**

  * Extract sample Internet Object documents, schemas, definitions, expected parsing/serialization outputs, error cases, etc.
  * Store as plain JSON, YAML, or Markdown fixtures in a `/fixtures` or `/test-fixtures` directory.
* [ ] **Document the Core API Contract**

  * Specify functions/classes, parameter types, return values, and error models in a language-agnostic way.

## Phase 2: Prepare for Multi-language Development

* [ ] **Design a Porting Template**

  * Prepare a minimal starter repository layout (e.g., `/src`, `/tests`, `/examples`, `/fixtures`) with README.
  * Include guidelines for coding standards, test writing, and documentation.
* [ ] **Set Up Continuous Testing**

  * If possible, enable shared test-fixture validation in each language’s CI (parse fixtures and compare results).
  * Document “how to add a language to the cross-test suite”.

## Phase 3: Initial Porting (First Language, e.g., Python)

* [ ] **Implement Core Parser/Serializer**

  * Focus on parsing IO documents, basic types, and serialization.
* [ ] **Implement Schema & Validation**

  * Support schema parsing and document validation logic.
* [ ] **Implement Error Handling**

  * Mirror error types and messages from reference.
* [ ] **Implement Streaming (if language runtime allows)**

  * Add streaming read/write APIs (progressive parsing/serialization).
* [ ] **Mirror the Reference Test Suite**

  * Pass all cross-language fixtures.
* [ ] **Write Language-Native Docs/Examples**

  * Mirror reference examples, idiomatic for the language.

## Phase 4: Expand to Other Major Languages

* [ ] **Repeat Phase 3 for Each Target Language**

  * Go, Rust, Java, C#, etc.
* [ ] **Encourage Community Contributions**

  * Mark language ports as “help wanted” or “good first issue”.
* [ ] **Maintain Compatibility Table**

  * Track which ports pass which parts of the shared test suite.

## Phase 5: Maintenance & Sync

* [ ] **Keep Reference Test Suite Updated**

  * Add new features/bugfixes to fixtures/tests.
* [ ] **Sync Changes Across Ports**

  * Each port should regularly update to match reference changes.
* [ ] **Review and Accept Community Ports**

  * Add community-vetted ports to official docs/repo list.

## Example Directory Layout for Multi-language Ports

```
internet-object/
  fixtures/
    valid/
    invalid/
    streaming/
  js/
    ...reference implementation...
  python/
    ...python implementation...
  go/
    ...go implementation...
  rust/
    ...rust implementation...
  docs/
  README.md
  COMPATIBILITY.md
  ...
```

## Community/Documentation

* [ ] Maintain a table like this:

| Feature       | JS/TS  | Python  | Go | Rust  | Java | C# |
| ------------- | ------ | ------- | -- | ----- | ---- | -- |
| Core Parse    | ✅     | ⬜️     | ⬜️ | ⬜️   | ⬜️   | ⬜️ |
| Serialization | ✅     | ⬜️     | ⬜️ | ⬜️   | ⬜️   | ⬜️ |
| Schema        | ✅     | ⬜️     | ⬜️ | ⬜️   | ⬜️   | ⬜️ |
| Validation    | ✅     | ⬜️     | ⬜️ | ⬜️   | ⬜️   | ⬜️ |
| Streaming     | 🚧     | ⬜️     | ⬜️ | ⬜️   | ⬜️   | ⬜️ |
| ...           |         |        |     |      |       |    |

(✅ = done, 🚧 = in progress, ⬜️ = not started)

## Guiding Principles

* **Always port from the reference API and fixtures.**
* **Automate compatibility as much as possible.**
* **Document language-specific caveats/idioms.**
* **Encourage feedback and contributions from each language community.**

## Ready-to-Use Checklist

* [ ] Reference is stable, tested, documented
* [ ] Fixtures extracted for all features and edge cases
* [ ] Template repo and contributing guide ready
* [ ] First port (Python?) started and tested against fixtures
* [ ] Compatibility table and docs published
* [ ] Maintenance/sync plan in place
