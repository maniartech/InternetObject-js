# Writing Internet Object inline

For tests, fixtures and small constants, putting the document directly in your code beats keeping a separate file in step with it.

```ts
import io from 'internet-object';

const doc = io.doc`
  name: string, age: int
  ---
  ~ Alice, 30
  ~ Bob, 25
`;
```

## Four tags, four scopes

| Tag | Gives you |
| --- | --------- |
| ``io.doc`…` `` | a whole document — header and data |
| ``ioObject`…` `` | a single object |
| ``ioSchema`…` `` | a schema |
| ``ioDefinitions`…` `` | header definitions |

Pick the smallest one that says what you mean. A fixture that only needs one record reads better as `ioObject` than as a document with a header attached.

## Interpolation

Values interpolate, so a fixture can be built from real variables:

```ts
const city = 'NYC';
io.doc`name: Alice, city: ${city}`;
```

## When to use this, and when not

**Good for**: unit tests, fixtures, small defaults, examples like these.

**Less good for**: anything a non-programmer edits, or anything large. A schema shared across services belongs in its own file, where it can be reviewed and versioned without a rebuild.

Next: **14 — Streaming**.
