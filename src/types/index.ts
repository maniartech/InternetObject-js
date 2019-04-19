import AnyDef from './any';
import ArrayDef from './array';
import NumberDef from './number';
import ObjectDef from './object';
import StringDef from './string';


import TypedefRegistry from './typedef-registry';


TypedefRegistry.register(new AnyDef())
TypedefRegistry.register(new StringDef())
TypedefRegistry.register(new NumberDef())

TypedefRegistry.register(new ObjectDef())
TypedefRegistry.register(new ArrayDef())
