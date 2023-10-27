import AnyDef from './any'
// import ArrayDef from './array'
import BooleanDef from './boolean'
import NumberDef from './number'
import ObjectDef from './object'
import StringDef from './string'
// import DateTimeDef from './datetime'

import TypedefRegistry from './typedef-registry'

let registered = false

export default function registerTypes() {
  if (registered) return

  TypedefRegistry.register('any', new AnyDef())

  TypedefRegistry.register('bool', new BooleanDef('bool'))

  TypedefRegistry.register('string', new StringDef('string'))
  TypedefRegistry.register('email', new StringDef('email'))
  TypedefRegistry.register('url', new StringDef('url'))

  TypedefRegistry.register('number', new NumberDef('number'))
  TypedefRegistry.register('byte', new NumberDef('byte'))
  TypedefRegistry.register('int16', new NumberDef('int16'))
  TypedefRegistry.register('int32', new NumberDef('int32'))
  TypedefRegistry.register('int', new NumberDef('int'))

  // TypedefRegistry.register('datetime', new DateTimeDef('datetime'))
  // TypedefRegistry.register('date', new DateTimeDef('date'))
  // TypedefRegistry.register('time', new DateTimeDef('time'))

  // TypedefRegistry.register('array', new ArrayDef())
  TypedefRegistry.register('object', new ObjectDef())

  // TODO: Include Date and DateTime Types

  registered = true
}


