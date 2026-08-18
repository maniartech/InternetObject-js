# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-08-17

Behavioural release. Several fixes change output that previously did not round-trip, so this is a
MINOR bump under 0.x semantics rather than a patch.

### Breaking

- An unnamed data section is now named **`data`**, not `unnamed`, matching the specification. The
  section name is the key a section is projected under, so JSON output changes for any document
  with more than one section.
- A duplicate section name now reports **`duplicate-section-name`** instead of `unexpected-token`.
  Consumers filtering on the old code must be updated. The old code described a lexical fault; a
  repeated section name is structural.
- A numeric member with a radix `format` is now written with its base prefix and type suffix
  (`0xffn`, not `ff`). The previous output was rejected by the member's own schema.
- A bigint with the explicit `format: decimal` keeps its `n` suffix; it previously lost it and read
  back as a plain number.

### Fixed

- **Data loss:** a second unnamed section silently overwrote the first. The duplicate-name rename
  was applied only to sections carrying a written name, so unnamed sections collided and all but
  the last were dropped.
- **Round-trip:** binary values are written as `b"<base64>"` rather than an object of byte indices;
  `Inf` / `-Inf` / `NaN` use the IO spellings instead of the JavaScript ones; a string containing
  `---` is quoted so it can no longer tear the document in two.
- A signed radix literal such as `-0xffn` threw `Cannot convert 0x-ff to a BigInt` — the sign was
  assembled inside the digits instead of before the base prefix.
- `emitKeys: 'all'` now applies at every depth, including objects reached through an array; it
  previously named only record-level members, leaving header-less output non-self-describing.
- A temporal value written without a schema keeps its kind (`d"…"` / `t"…"` / `dt"…"`) instead of
  being flattened to `dt"…"`, which also leaked the internal 1900-01-01 time sentinel into output.
- Errors raised for a duplicate section name now carry a position, so consumers can locate them.

### Added

- `format: scientific` for `bigint` (`1200000n` → `12e5n`), consistent with `number`.
- `stringifyHeader()` — library-owned separation of header and data.
- Wildcard/map and multi-section schema inference.

### Documentation

- `format` is **write-only** and never constrains input; MemberDef options are either constraints
  or presentation. Specified in io-specs, along with a new Serialization part.

## [1.0.0-beta.1] - 2025-12-01

### Added

- Complete Internet Object parser and serializer
- Schema-first validation with comprehensive type system
- Support for all core types: `string`, `number`, `int`, `bool`, `decimal`, `bigint`, `datetime`
- Collection support with error recovery
- `load()` and `loadObject()` APIs for validating JavaScript objects against schemas
- `loadCollection()` for batch validation with error collection
- `stringify()` for serializing Internet Object documents
- `parseDefinitions()` for working with schemas and variables
- Nested object and array support
- Variable resolution (`@varName` syntax)
- Schema references (`$schemaName` syntax)
- Optional fields with `?` modifier
- Nullable fields with `*` modifier
- Comprehensive error messages with position information

### Technical

- ESM and CommonJS dual package support
- TypeScript definitions included
- Tree-shakeable exports
- Zero runtime dependencies
- Node.js 18+ support

## [Unreleased]

### Planned

- Additional type constraints
- Custom type definitions
- Performance optimizations
