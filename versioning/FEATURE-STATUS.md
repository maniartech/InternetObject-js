# Feature Status

The stability tier of every Internet Object feature. Tiers and their guarantees are defined in
[`VERSIONING.md`](./VERSIONING.md) §3.

**Legend:** 🟢 **Stable** (SemVer-guaranteed, breaks only in a major, conformance-guaranteed) ·
🧪 **Experimental** (may change in any release, not guaranteed) · 🟡 **Deprecated** (removed next major) ·
⚪ **Reserved** (syntax reserved, not implemented).

> ⚠️ **Working draft.** This table is the first pass of statuses and is **provisional pending owner
> confirmation**, especially the 🧪 rows. It will be made machine-verified against the code (see
> *Maintenance* below) so it can never silently drift. Exact "since" versions and spec-section links are to
> be backfilled as the format spec documents land.

## Format constructs

| Feature | Status | Conformance | Notes |
|---|---|---|---|
| Document / header / `---` sections | 🟢 Stable | ✅ tested | |
| Collections (`~` records) | 🟢 Stable | ✅ tested | |
| Objects `{ … }`, open objects | 🟢 Stable | ✅ tested | |
| Arrays `[ … ]` | 🟢 Stable | ✅ tested | |
| Quoted strings, multiline strings, escapes | 🟢 Stable | ✅ tested | |
| Open strings | 🟢 Stable | ✅ tested | |
| Comments (`#`) | 🟢 Stable | ✅ tested | |
| Header definitions: `$schema`, `$Name` schemas, `@` variables | 🟢 Stable | ✅ tested | |
| Annotated strings: `r"…"` (raw), `b"…"` (binary/base64) | 🟢 Stable | ✅ tested | |
| Annotated datetime: `dt"…"`, `d"…"`, `t"…"` | 🟢 Stable | ✅ tested | |

## Types

| Type | Status | Conformance | Notes |
|---|---|---|---|
| `string` | 🟢 Stable | ✅ tested | |
| `bool` | 🟢 Stable | ✅ tested | |
| `number`, `float` | 🟢 Stable | ✅ tested | |
| `int` | 🟢 Stable | ✅ tested | |
| `bigint` | 🟢 Stable | ✅ tested | |
| `decimal` | 🟢 Stable | ✅ tested | base type stable; `precision`/`scale` see Validation |
| `datetime`, `date`, `time` | 🟢 Stable | ✅ tested | |
| `object`, `array` | 🟢 Stable | ✅ tested | |
| `any` | 🟢 Stable | ✅ tested | |
| **Sized integers** `int8` `int16` `int32` `int64` | 🧪 Experimental | partial | range/overflow semantics not finalized |
| **Sized integers** `uint` `uint8` `uint16` `uint32` `uint64` | 🧪 Experimental | partial | range/overflow semantics not finalized |

## Validation

| Feature | Status | Conformance | Notes |
|---|---|---|---|
| `optional`, `null`, `default` | 🟢 Stable | ✅ tested | |
| `choices` | 🟢 Stable | ✅ tested | |
| String: `minLength`, `maxLength`, `length` | 🟢 Stable | ✅ tested | canonical spellings |
| String: `pattern` | 🟢 Stable | ✅ tested | |
| String formats: `email`, `url` | 🟢 Stable | ✅ tested | |
| Number range: `min`, `max` | 🟢 Stable | ✅ tested | |
| **Validation alias spellings** `len`, `minLen`, `maxLen` | 🧪 Experimental | partial | alias naming not finalized vs `length`/`minLength`/`maxLength` |
| **Decimal** `precision`, `scale` | 🧪 Experimental | partial | semantics/finalization pending |

## Streaming

| Feature | Status | Conformance | Notes |
|---|---|---|---|
| Streaming Protocol **v1** (framing, `StreamItem`, error model) | 🟢 Stable | ✅ guaranteed | [PROTOCOL.md](../src/streaming/specs/PROTOCOL.md); 27-case corpus across chunkings |
| Reader (`createStreamReader`), Writer (`createStreamWriter`) | 🟢 Stable | ✅ tested | |
| Adapters: `createPushSource`, `BufferTransport`, `nodeHttpTransport`, `webSocketTransport` | 🟢 Stable | ✅ tested | |
| `IOStreamError` + `stream-*` codes | 🟢 Stable | ✅ tested | |

## Errors

Error codes are part of the contract for the features that raise them. Their finalization (registry, freeze
policy, the validation codes tied to the Experimental aliases above) is tracked in
[`../src/errors/FINALIZATION.md`](../src/errors/FINALIZATION.md). Codes for 🧪 features inherit that tier.

## Maintenance

This table MUST stay truthful (VERSIONING.md §7). Planned: a `stability` marker on the typedef and
error-code registries plus a sync test asserting this table matches the code — the same doc-as-tests
approach used for the streaming examples (`tests/streaming/doc-examples.test.ts`). Until that lands, update
this table in the same PR as any change to a feature's status.
