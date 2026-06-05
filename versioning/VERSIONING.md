# Versioning Policy

This is the normative policy for how Internet Object is versioned and how feature stability is governed.
For the current status of each feature, see [`FEATURE-STATUS.md`](./FEATURE-STATUS.md).

## 1. Two clocks: spec version vs package version

Internet Object is both a **specification** and a **reference implementation**. They version independently:

- **Spec / format version** — the IO data format and the Streaming Protocol each carry their own major
  version (e.g. "IO format v1", "Streaming Protocol v1"). A breaking change to the *format or protocol*
  requires a new spec major (v2).
- **Package version** — the `internet-object` npm package follows **Semantic Versioning** (below). A
  release implements a stated spec version; bindings/docs declare which spec version they target.

The two are cross-referenced but move on separate clocks: the package may go `0.3 → 0.4 → 1.0` while still
implementing Streaming Protocol v1.

## 2. Semantic Versioning (the package)

The package follows [SemVer 2.0.0](https://semver.org): `MAJOR.MINOR.PATCH`.

- **PATCH** — backward-compatible bug fixes.
- **MINOR** — backward-compatible additions (new features, new Experimental features, graduating a feature
  to Stable).
- **MAJOR** — backward-incompatible changes to **Stable** surface.

**Pre-1.0 (`0.y.z`):** per SemVer, the API is still stabilizing — a breaking change bumps the **minor**
(`0.2 → 0.3`) and is recorded in the changelog. This is a released, usable state, not a draft.

**Experimental features are exempt from SemVer** (see §3): they may change or be removed in any release.

## 3. Stability tiers

Every feature carries exactly one tier. Tiers are tracked **per feature**, not per release.

| Tier | Guarantee | May change… | Conformance |
|---|---|---|---|
| **Experimental** | None. Use at your own risk. | in **any** release (incl. patch) | tested but **not** guaranteed |
| **Stable** | Covered by SemVer and the spec contract | only in a **MAJOR** release | **guaranteed** by the conformance suite |
| **Deprecated** | Still works; scheduled for removal | removed in the next **MAJOR**; warns meanwhile | guaranteed until removal |
| **Reserved** | Syntax reserved, not yet implemented | may be defined in any release | n/a |

Analogues: Experimental ≈ Kubernetes *alpha* / TC39 *Stage 1–3*; Stable ≈ *GA* / *Stage 4*; Deprecated ≈
*deprecated*. Node.js's stability index (0/1/2) is the same idea.

## 4. Core rules

- A **Stable** feature MUST NOT change incompatibly except in a major version.
- An **Experimental** feature MAY change or be removed at any time; it MUST be clearly marked as such.
- A feature MUST be **Deprecated for at least one major cycle** (with a warning where feasible) before
  removal. Removal happens in a major.
- The **conformance suite** is the contract for Stable features: every Stable feature MUST have guaranteed
  conformance cases; Experimental features live in a separate, clearly-labeled group.
- Stability is recorded in three synchronized places (see §7): the status table, an inline annotation at
  the feature's definition, and a machine-readable marker in code.

## 5. Graduation & deprecation lifecycle

```
(proposed) → Experimental → Stable → Deprecated → Removed
                    │                     ▲
                    └─────── may be removed while Experimental
```

- **Experimental → Stable:** the feature's behavior is final, it has guaranteed conformance cases, and its
  errors/codes are finalized. Graduation is **additive** (a MINOR bump) and announced in the changelog.
- **Stable → Deprecated:** announced in the changelog with a replacement and a target removal major.
- **Deprecated → Removed:** in the next major.

## 6. 1.0 readiness checklist

Cut `1.0.0` when all of the following hold (until then, stay on `0.x`):

- [ ] The **Stable** surface (format constructs, core types, validation, streaming) is one the project will
      commit to keeping until 2.0.
- [ ] Every Stable feature has **guaranteed conformance cases**.
- [ ] The **error-code registry is finalized** (see [`../src/errors/FINALIZATION.md`](../src/errors/FINALIZATION.md)).
- [ ] All not-yet-final features are explicitly marked **Experimental** (not silently shipped as stable).
- [ ] `FEATURE-STATUS.md` is complete and machine-verified against the code.
- [ ] The deprecation/breaking-change process in this document is adopted.

After 1.0, break Stable surface only in a major; keep iterating freely on Experimental features.

## 7. How feature status is recorded (and kept honest)

To prevent the status table from rotting, stability is recorded in three places that MUST agree:

1. **The index** — [`FEATURE-STATUS.md`](./FEATURE-STATUS.md), the human-readable table.
2. **Inline** — a "Stability: <tier>" line at each feature's definition in the spec, and
   `@experimental` / `@deprecated` JSDoc on the corresponding code (so IDEs surface it).
3. **Machine-readable** — a `stability` marker on the relevant registry entries (typedefs, error codes),
   with a test that asserts the table and the code agree. (Planned; see FEATURE-STATUS "Maintenance".)

## 8. Prerelease channels

To release without committing to a tier's guarantees, use SemVer prereleases (`1.0.0-rc.1`,
`1.0.0-beta.1`) and/or the npm `next` dist-tag. Prereleases carry no stability guarantee.

## 9. Changelog

Every release records its changes in [`../CHANGELOG.md`](../CHANGELOG.md). Breaking changes (including
minor-version breaks while in `0.x`) and feature graduations MUST be listed.
