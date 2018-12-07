# Internet Object

JavaScript Parser of Internet Object.

```JS
import IO from 'internet-object'

const schema = "name,age"

const o = IO.parse("Spiderman,25", schema)

// Prints Spiderman
console.log(o.name);

// Prints 25
console.log(o.age);
```

> This project is under heavy development! Hence, it is not ready for productio yet.

For more information, check it out-
www.internetobject.org

MIT License -  `© Maniar Technologies`
