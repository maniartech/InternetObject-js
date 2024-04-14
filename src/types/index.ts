import TypedefRegistry  from '../schema/typedef-registry'

import AnyDef           from './any'
import ArrayDef         from './array'
import BooleanDef       from './boolean'
import DateTimeDef      from './datetime'
import NumberDef        from './number'
import ObjectDef        from './object'
import StringDef        from './string'

let registered = false
const typeDefs:any = [
  AnyDef, ArrayDef, BooleanDef, NumberDef, ObjectDef, StringDef, DateTimeDef
]

export default function registerTypes() {
  if (registered) return

  for (let typeDef of typeDefs) {
    for (let type of typeDef.types) {
      TypedefRegistry.register(type, new typeDef(type))
    }
  }

  registered = true
}
