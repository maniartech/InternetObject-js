
import AnyDef from "./any";
import StringDef from "./string";
import NumberDef from "./number";

import TypedefRegistry from "./typedef-registry";


TypedefRegistry.register(new AnyDef())
TypedefRegistry.register(new StringDef())
TypedefRegistry.register(new NumberDef())
