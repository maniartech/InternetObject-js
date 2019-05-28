import AnyDef from './any';
import ArrayDef from './array';
import NumberDef from './number';
import ObjectDef from './object';
import StringDef from './string';

import TypedefRegistry from './typedef-registry';

TypedefRegistry.register("any", new AnyDef())

TypedefRegistry.register("string", new StringDef())
TypedefRegistry.register("email", new StringDef())
TypedefRegistry.register("url", new StringDef())

TypedefRegistry.register("number", new NumberDef())
TypedefRegistry.register("byte", new NumberDef("byte"))
TypedefRegistry.register("int16", new NumberDef("int16"))
TypedefRegistry.register("int32", new NumberDef("int32"))
TypedefRegistry.register("int", new NumberDef("int"))


TypedefRegistry.register("object", new ObjectDef())
TypedefRegistry.register("array", new ArrayDef())
