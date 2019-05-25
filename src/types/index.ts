import AnyDef from './any';
import ArrayDef from './array';
import NumberDef from './number';
import ObjectDef from './object';
import StringDef from './string';


import TypedefRegistry from './typedef-registry';


TypedefRegistry.register("any", new AnyDef())
TypedefRegistry.register("string", new StringDef())
TypedefRegistry.register("number", new NumberDef())

TypedefRegistry.register("object", new ObjectDef())
TypedefRegistry.register("array", new ArrayDef())
