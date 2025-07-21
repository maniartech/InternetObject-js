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
