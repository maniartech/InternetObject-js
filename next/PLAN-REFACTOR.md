# Plan: Refactor Architecture & Standardize Serialization

**Objective:**
Reorganize the project structure into functional modules (`core`, `parser`, `loader`, `serializer`, `schema`) to reduce complexity, eliminate circular dependencies, and standardize `toString()` across the library.

---

### 1. New Directory Structure

| Module | Use Case | Contains |
| :--- | :--- | :--- |
| `src/core` | **Result Objects** | `IOObject`, `IOCollection`, `Document`, `Decimal` |
| `src/parser` | **Source → AST** | `Tokenizer`, `AST Nodes`, `Parsing Logic` |
| `src/loader` | **AST/POJO → Core** | `load()`, `loadObject()`, `Hydration Logic` |
| `src/serializer` | **Core → String** | `stringify()`, `Formatter`, `IO-Syntax Generation` |
| `src/schema` | **Validation** | `Schema`, `Typedefs`, `validate()` |
| `src/facade.ts` | **Public API** | Clean re-exports of all the above. |

---

### 2. Implementation Steps

#### Phase 1: Create Packages & Move Files
- [x] **Step 1.1**: Create `src/serializer` and move `stringify` related files.
    - Moves: `src/facade/stringify*`, `io-formatter.ts`, `serialization-constants.ts`.
- [x] **Step 1.2**: Create `src/loader` and move `load` related files.
    - Moves: `src/facade/load*`.
- [x] **Step 1.3**: Move validation logic to `src/schema`.
    - Moves: `src/facade/validate.ts` → `src/schema/validate.ts`.
- [x] **Step 1.4**: Update `src/facade.ts` imports to point to new locations.
- [x] **Step 1.5**: Update internal imports (Fix breaking paths).

#### Phase 2: Implement Serialization Logic
- [x] **Step 2.1**: Update `Serializer` to expose a generic `toString(value, options)` function.
- [x] **Step 2.2**: Ensure `Serializer` does **NOT** import `Core` classes (use Interfaces/Duck Typing) to perform formatting.
- [x] **Step 2.3**: Update `IOObject` / `IOCollection` in Core.
    - **Crucial**: Standardize `toString(options?: SerializerOptions)`.
    - Use `valueToString` (or simple recursive logic) for the default compact output without circular dependency.
    - **Optimization**: We will *not* depend on the full Serializer package in Core for the basic `toString()` to keep Core lightweight. Core classes will implement a standard recursive "Compact IO Syntax" method locally or via a small helper.

#### Phase 3: Connect High-Level Stringify
- [x] **Step 3.1**: Update `src/serializer/stringify.ts` to check if an object has a `toString` method that accepts options.
- [x] **Step 3.2**: If no specific formatting (indentation) is requested, delegate to `obj.toString()`.

#### Phase 4: Verification
- [x] **Step 4.1**: Run existing tests (`yarn test`) to ensure refactoring didn't break things.
- [x] **Step 4.2**: Add new tests for `toString()` round-trip.

---

### 3. Serialization Strategy (Deep Dive)

**The `toString()` Contract:**
Every Core class must return **Valid Internet Object Syntax**.
*   `Decimal`: `"10.5"`
*   `IOObject`: `"{k:v}"`
*   `IOCollection`: `"[a,b]"`

**Handling Options:**
*   `obj.toString()` → Compact string.
*   `obj.toString({ indent: 2 })` → Pretty string.
*   `obj.toString({ isRoot: true })` → "name: Alice" (Unwrapped)
*   `obj.toString({ isRoot: false })` → "{ name: Alice }" (Wrapped)

> **FIRM NOTE:** This is strictly a restructuring and refinement of the architecture. All existing tests MUST pass. Any changes to the public API behavior (beyond the new `toString` capability) are out of scope. Backward compatibility is paramount.

---

### 4. Validation
- [ ] Check if `IOSection` needs the `---` separator in `toString()` (Decision: No, keep it standalone).
- [ ] Verify `Decimal` formatting.
