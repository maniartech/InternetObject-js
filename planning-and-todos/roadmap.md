# Internet Object Roadmap

This document outlines the roadmap for the Internet Object library, focusing on achieving a modern, stable, and ergonomic API with first-class streaming support, robust TypeScript typings, and comprehensive documentation.

## Current State (2025-06)

* Good modular structure (core classes, parser, schema, etc.)
* `index.ts` provides both named exports and a default facade
* No streaming APIs or progressive streaming yet
* API, serialization, and error handling still evolving
* README and docs are “in-progress”
* No automated tree-shaking tests or bundle-size guardrails

## Target Level

* **Modern, stable, and ergonomic API**
* **First-class streaming support** (both parse and serialize, chunked/progressive)
* **Rock-solid TypeScript typings & JSDoc**
* **Documented, tree-shakable, and minimal bundle for consumers**
* **Comprehensive documentation, recipes, and usage examples**
* **Tested for DX, performance, and edge-cases**
* **Ready for both node/server and modern browser use**
* **Open for contributions and visible community roadmap**

## Recommended Roadmap

### PHASE 1: Finalize Core API & Internal Structure

* [ ] Review and lock core APIs (Document, Definitions, tag functions, etc.).
* [ ] Refactor for **clear internal separation** (no hidden dependencies; one file = one responsibility).
* [ ] Ensure all imports in `index.ts` are side-effect free.
* [ ] Add or update TypeScript types and JSDoc for **all public API**.
* [ ] Add `"sideEffects": false` to `package.json`.
* [ ] Ensure all major features are exported as named exports **and** via the facade.

### PHASE 2: Add Progressive Streaming Support

* [ ] Design and implement `io.createDocumentStreamWriter` and `io.readChunks` APIs.
* [ ] Ensure both can be used in node and browser environments.
* [ ] Add **TypeScript-first usage examples** (including React progressive loading).
* [ ] Document streaming API with detailed examples and edge-case guidance.

### PHASE 3: Robust Serialization & Validation

* [ ] Finalize and document serialization APIs (stringify, to/from JSON, etc.).
* [ ] Finalize error types and error reporting (standardize, document, and test).
* [ ] Add validation against schemas/definitions, with clear DX and reporting.

### PHASE 4: Automated Tree-shaking & Bundle-size Tests

* [ ] Add or configure [size-limit](https://github.com/ai/size-limit) or [treeshake](https://www.npmjs.com/package/treeshake) for **key exports**.
* [ ] (Optional) Write a custom script to parse `index.ts` and verify tree-shakability for all exports (Rollup-based, see earlier responses).
* [ ] Add bundle-analyzer and a test/CI step that fails if unwanted code leaks into bundles.

### PHASE 5: Documentation & Examples

* [ ] Update README to show:

  * Unified facade and named export usage
  * Streaming/progressive examples (server + React/browser)
  * Validation, serialization, and error handling
  * Performance/treeshaking best practices
* [ ] Add recipes: “Replace JSON with Internet Object”, “Streaming large datasets”, “Schema validation”, etc.
* [ ] Point to [InternetObject.org](https://internetobject.org) for deeper docs/specs.

### PHASE 6: Testing, DX, and Release-Readiness

* [ ] Add/expand unit and integration tests for all core, streaming, and error flows.
* [ ] Add or refine linting, formatting, and pre-publish checks.
* [ ] Publish pre-releases (`beta`, `rc`) for community testing.
* [ ] Update license/copyright.
* [ ] Performance soft guard in CI (parser + Decimal):
  * Emit machine-readable perf JSON from `yarn perf` and `yarn perf:decimal`.
  * Compare against baselines and post warnings on PRs for regressions (do not fail by default).
  * Artifact current perf results and allow a manual “promote baseline” step after releases.

### PHASE 7: Community, Feedback, and Openness

* [ ] Open up for issues/PRs, with clear contributing guidelines.
* [ ] Maintain a **public roadmap** (GitHub Projects or issues).
* [ ] Engage with early adopters for feedback.
* [ ] Respond and evolve based on user needs.

## Roadmap Table (TL;DR Version)

| Phase                       | Key Goals                                   | Outcome                                |
| --------------------------- | ------------------------------------------- | -------------------------------------- |
| 1. Core API                 | Finalize, document, type all public APIs    | Stable, modern entrypoint              |
| 2. Streaming                | Add chunked streaming parse/serialize       | Real-time, scalable, modern data flows |
| 3. Serialization/Validation | Standardize, document, test                 | Rock-solid dev experience              |
| 4. Tree-shaking             | Automate tests for minimal bundles          | Zero-bloat for consumers               |
| 5. Docs                     | Comprehensive examples & usage patterns     | Adoption and ease-of-use               |
| 6. Testing                  | DX, linting, CI, pre-release                | Reliable, production-ready             |
| 7. Community                | Openness, feedback, contributing guidelines | Sustainable, trusted open source       |
