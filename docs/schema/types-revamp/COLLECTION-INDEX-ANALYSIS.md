# Collection Index Simplification

Document Version: 2.1
Date: November 18, 2025
Decision: REMOVED ✅ (Parameter eliminated from TypeDef signatures)

## Finalized Plan

The former `collectionIndex` argument has been removed from all TypeDef method signatures (`parse`, `load`, `stringify`). Positional context is now applied only at the collection/object processing boundary when wrapping validation errors into the public error envelope. TypeDefs remain purely concerned with value normalization and constraint enforcement.

## Rationale

- Reduces signature noise and cognitive overhead.
- Prevents fragile, inconsistent forwarding of an optional index.
- Reinforces separation of concerns (structural iteration vs value validation).
- Simplifies future streaming and incremental parsing—iterator owns item position.

## Boundary Pattern (Authoritative)

```typescript
for (let i = 0; i < items.length; i++) {
  try {
    const value = itemTypeDef.parse(nodes[i], itemMemberDef, defs)
    results.push(value)
  } catch (err) {
    // Only here we attach collectionIndex when building the envelope.
    results.push(wrapValidationError(err, { index: i }, itemMemberDef))
  }
}
```

`wrapValidationError` attaches `collectionIndex: i` to the envelope. Path building continues to rely solely on existing `memberDef.path` composition logic outside TypeDefs; no path logic uses or requires `collectionIndex`.

## Error Envelope (Focused Example)

```jsonc
{
  "__error": true,
  "code": "invalid-email",
  "category": "validation",
  "message": "Invalid email 'bob@@example.com'",
  "path": "users[1].email",
  "collectionIndex": 1
}
```

Meaning of fields (only those tied to this decision):

- `collectionIndex`: Position of the top-level collection item (record) producing the error.
- `path`: Already handled elsewhere; unaffected by removal of the parameter.

## Migration Steps (Completed)

1. Removed `collectionIndex` from TypeDef interface & docs.
2. Deleted index parameter threading in all example signatures & common checks.
3. Established boundary-only wrapping using a lightweight context `{ index }`.
4. Updated architecture & implementation guides; examples reflect simplified form.
5. Pending (code): Refactor actual TypeDefs + add tests ensuring envelope still carries `collectionIndex` from boundary wrapper.

## FAQ (Scope-Limited)

Q: Do nested arrays get their own `collectionIndex`? A: No—only top-level collection items. Inner positions appear solely in `path`.
Q: Special rules for the first item? Handle with `if (i === 0)` inside the boundary loop.
Q: Performance impact? Negligible—no extra parameter propagation.
Q: Streaming? Iterator yields `{ index, node }`; wrapper logic identical.

## Deprecated References

Any remaining code or docs showing `collectionIndex` in TypeDef signatures must be updated via `MIGRATION-COLLECTION-INDEX.md` (to be added).

---

This file intentionally contains only the finalized simplification plan for the collection index removal. Path-building details are documented elsewhere and are not part of this concern.
