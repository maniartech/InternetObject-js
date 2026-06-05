# Feature Status

The stability tier of every Internet Object feature. Tiers and their guarantees are defined in
[`VERSIONING.md`](./VERSIONING.md) §3.

**Legend:** 🟢 **Stable** · 🔵 **Beta** (feature-complete, under testing, not yet guaranteed) ·
🧪 **Experimental** (may change any release) · 🟡 **Deprecated** · ⚪ **Reserved** (syntax reserved, not built).

> ⚠️ **All tiers below are conservative provisional defaults.** Nothing is treated as 🟢 Stable until the
> owner confirms it. The **Confirmed** column is `—` (pending sign-off) for every row; change it to ✅ when
> a row's tier is reviewed and locked. Promote tiers (Experimental → Beta → Stable) only on confirmation.
> This table is the living index of where things stand — it will grow as features land.
>
> **Planned: machine-verification.** A `stability` marker on the typedef/error registries plus a sync test
> will assert this table matches the code (the doc-as-tests approach used for streaming). Until then, update
> this table in the same change as any status change.

## 1. Format constructs (syntax)

| Feature | Tier | Confirmed | Notes |
|---|---|---|---|
| Document, header, `---` sections | 🔵 Beta | — | parses & tested; grammar finalization ongoing |
| Collections (`~` records) | 🔵 Beta | — | |
| Objects `{ … }`, open objects | 🔵 Beta | — | |
| Arrays `[ … ]` | 🔵 Beta | — | |
| Quoted / multiline strings, escapes | 🔵 Beta | — | |
| Open strings | 🔵 Beta | — | edge rules (merges, trimming) under review |
| Comments (`#`) | 🔵 Beta | — | |
| Annotated strings `r"…"`, `b"…"` | 🔵 Beta | — | raw, binary/base64 |
| Annotated datetime `dt"…"`, `d"…"`, `t"…"` | 🔵 Beta | — | |

## 2. Types — core

| Type | Tier | Confirmed | Notes |
|---|---|---|---|
| `string` | 🔵 Beta | — | base type works; option set see §4/§5 |
| `bool` | 🔵 Beta | — | |
| `number`, `float` | 🔵 Beta | — | |
| `int` | 🔵 Beta | — | |
| `bigint` | 🔵 Beta | — | |
| `decimal` | 🧪 Experimental | — | `precision`/`scale` semantics not finalized |
| `datetime`, `date`, `time` | 🔵 Beta | — | |
| `object`, `array` | 🔵 Beta | — | |
| `any` | 🧪 Experimental | — | semantics/finalization pending |

## 3. Types — subtypes & aliases

| Feature | Tier | Confirmed | Notes |
|---|---|---|---|
| Sized ints `int8` `int16` `int32` `int64` | 🧪 Experimental | — | range/overflow semantics not finalized |
| Unsigned ints `uint` `uint8` `uint16` `uint32` `uint64` | 🧪 Experimental | — | not finalized |
| Validation alias spellings `len` / `minLen` / `maxLen` | 🧪 Experimental | — | vs canonical `length`/`minLength`/`maxLength` |
| Type aliases (any other short forms) | 🧪 Experimental | — | naming/coverage not finalized |

## 4. Member definitions (modifiers)

The universal memberdef modifiers (apply to all types).

| Feature | Tier | Confirmed | Notes |
|---|---|---|---|
| `optional` | 🔵 Beta | — | |
| `null` | 🔵 Beta | — | |
| `default` | 🔵 Beta | — | |
| `choices` | 🔵 Beta | — | |
| Overall memberdef grammar/model | 🧪 Experimental | — | finalization of the memberdef shape in progress |

## 5. Type definitions — per-type option contract (finalization)

Whether each type's accepted options/constraints (its typedef contract) are finalized.

| Type's option contract | Tier | Confirmed | Notes |
|---|---|---|---|
| `string` (length/pattern/format options) | 🧪 Experimental | — | option set & alias naming not finalized |
| `number`/`int`/`float` (range/precision options) | 🧪 Experimental | — | |
| `decimal` (`precision`, `scale`) | 🧪 Experimental | — | |
| sized integers | 🧪 Experimental | — | |
| `array` (element type, length options) | 🧪 Experimental | — | |
| `object` (open/closed, nested schema options) | 🧪 Experimental | — | |
| `datetime`/`date`/`time` options | 🧪 Experimental | — | |

## 6. Variables & references

| Feature | Tier | Confirmed | Notes |
|---|---|---|---|
| `@variable` definitions (header) | 🧪 Experimental | — | handling/finalization in progress |
| `@variable` references (in data/schema) | 🧪 Experimental | — | resolution rules under review |
| `$Name` schema definitions | 🧪 Experimental | — | |
| `$Name` schema references (e.g. `address: $address`) | 🧪 Experimental | — | |
| `$schema` (default schema) | 🧪 Experimental | — | |
| Nested / recursive schema references | 🧪 Experimental | — | |
| Forward references within the header | 🧪 Experimental | — | order-independence to confirm per type |
| External / preloaded definitions (`parse(text, defs)`) | 🧪 Experimental | — | precedence rules to confirm |
| Variable resolution / scoping | 🧪 Experimental | — | |

## 7. Validation & constraints

| Feature | Tier | Confirmed | Notes |
|---|---|---|---|
| String `minLength`, `maxLength`, `length` | 🔵 Beta | — | canonical spellings |
| String `pattern` | 🔵 Beta | — | |
| String formats `email`, `url` | 🔵 Beta | — | |
| Number `min`, `max` | 🔵 Beta | — | |
| `choices` | 🔵 Beta | — | |
| Decimal `precision`, `scale` | 🧪 Experimental | — | |
| Alias spellings (`len`/`minLen`/`maxLen`) | 🧪 Experimental | — | see §3 |

## 8. Streaming

| Feature | Tier | Confirmed | Notes |
|---|---|---|---|
| Streaming **Protocol v1** (framing, `StreamItem`, error model) | 🔵 Beta | — | implementation conformance-tested (27-case corpus across chunkings); protocol **under real-world testing** before GA |
| Reader (`createStreamReader`) | 🔵 Beta | — | |
| Writer (`createStreamWriter`) | 🔵 Beta | — | |
| Adapters (`createPushSource`, `BufferTransport`, `nodeHttpTransport`, `webSocketTransport`) | 🔵 Beta | — | |
| `IOStreamError` + `stream-*` codes | 🔵 Beta | — | |

## 9. Errors

| Feature | Tier | Confirmed | Notes |
|---|---|---|---|
| Error classes (`IOError`, `IOSyntaxError`, `IOValidationError`, `IOStreamError`) | 🔵 Beta | — | class model settled; see FINALIZATION |
| Error-code registry (codes + categories) | 🧪 Experimental | — | not finalized — [`../src/errors/FINALIZATION.md`](../src/errors/FINALIZATION.md) |
| Codes for 🧪 features (sized-int range, alias validation, …) | 🧪 Experimental | — | inherit their feature's tier |

## 10. Planned / Reserved (things to come)

Not yet built, or reserved for future definition. (List grows as the roadmap firms up.)

| Item | Tier | Notes |
|---|---|---|
| Sub-record (intra-record) incremental streaming parser | ⚪ Reserved | only record-granularity streaming today (ADR 0005) |
| Midstream definition mutation in streams | ⚪ Reserved | disallowed in Protocol v1; may be defined later |
| Additional types / formats | ⚪ Reserved | TBD |
| `defsId` / stable definitions identity | ⚪ Reserved | removed for now (Gap 16); may return, specified |
| _(add roadmap items here)_ | | |

## Maintenance

See [`VERSIONING.md`](./VERSIONING.md) §7. Update this table in the same change as any status change; a
machine-sync test against the registries is planned to keep it honest automatically.
