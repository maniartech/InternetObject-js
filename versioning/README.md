# Versioning & Stability

This section defines how Internet Object is versioned and how the stability of each feature is
tracked, so the project can ship and improve continuously without ever being a perpetual "draft".

It follows the model used by mature standards-with-implementations (Kubernetes alpha/beta/GA,
TC39 stages, Node.js stability index, CSS module maturity): **a written policy plus a per-feature
status index**, with stability tracked per feature rather than as one global stamp.

## Contents

| Document | What it is |
|---|---|
| [`VERSIONING.md`](./VERSIONING.md) | The policy: SemVer rules, spec-vs-package versioning, the stability tiers and their guarantees, the deprecation and graduation process, and the 1.0 readiness checklist. |
| [`FEATURE-STATUS.md`](./FEATURE-STATUS.md) | The index: every feature (format constructs, types, validation, streaming, errors) with its stability tier, since-version, and spec link. |

## In one paragraph

The **spec** (IO format, Streaming Protocol) and the **package** (`internet-object` on npm) version on
two separate clocks. The package follows **SemVer**. Every feature carries a **stability tier** —
**Experimental**, **Stable**, or **Deprecated** — and only *Stable* features are covered by SemVer and
the conformance guarantee. *Experimental* features may change in any release. This is what lets a stable
core ship as `1.0` while a few features (e.g. sized integer subtypes, some validation aliases) keep
evolving without forcing a major bump. See [`VERSIONING.md`](./VERSIONING.md) for the precise rules and
[`FEATURE-STATUS.md`](./FEATURE-STATUS.md) for where each feature stands today.

## Related

- Streaming protocol versioning: [`../src/streaming/specs/PROTOCOL.md`](../src/streaming/specs/PROTOCOL.md) (§ Versioning) and [`../src/streaming/specs/README.md`](../src/streaming/specs/README.md)
- Error-code finalization (feeds validation feature status): [`../src/errors/FINALIZATION.md`](../src/errors/FINALIZATION.md)
- Changelog: [`../CHANGELOG.md`](../CHANGELOG.md)
