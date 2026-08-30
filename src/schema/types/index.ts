import TypedefRegistry  from '../../schema/typedef-registry'

import AnyDef           from './any'
import ArrayDef         from './array'
import BooleanDef       from './boolean'
import DateTimeDef      from './datetime'
import NumberDef        from './number'
import ObjectDef        from './object'
import StringDef        from './string'

// B1/B2: installs the validating write and adopt-on-insert into the core containers. Imported
// here because a `Schema` cannot exist without this module having been loaded -- compiling one
// calls `registerTypes()` -- so there is no window in which a schema is attached and the check is
// missing. See `src/core/schema-hooks.ts` for why it is injected rather than imported.
import '../write-hooks'

let registered = false

export default function registerTypes() {
  if (registered) return

  TypedefRegistry.register(
    AnyDef, ArrayDef, BooleanDef, NumberDef, ObjectDef, StringDef, DateTimeDef
  )

  registered = true
}

// Register on import, not just when someone remembers to call registerTypes().
//
// Bundlers tree-shake an explicit `registerTypes()` call away: the call's return value is
// unused, so it survives only if the bundler believes it has side effects. This module is
// therefore listed in the package's `sideEffects` array, which keeps this statement — and
// thus the registry populated for every consumer, however deeply they tree-shake.
//
// Without this, a consumer importing only named exports (e.g. `loadInferred`) gets an empty
// registry and every type lookup throws "Type 'string' is not registered".
registerTypes()
