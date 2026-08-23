import TypedefRegistry  from '../../schema/typedef-registry'

import AnyDef           from './any'
import ArrayDef         from './array'
import BooleanDef       from './boolean'
import DateTimeDef      from './datetime'
import NumberDef        from './number'
import ObjectDef        from './object'
import StringDef        from './string'

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
