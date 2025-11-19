
import { toAutoString } from './src/utils/strings';

console.log("val ->", toAutoString("val", false));
console.log("1.0 ->", toAutoString("1.0", false));
console.log("val:ue ->", toAutoString("val:ue", false));
console.log("hello, world ->", toAutoString("hello, world", false));
