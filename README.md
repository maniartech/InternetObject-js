# Internet Object

JavaScript Parser of Internet Object.

### This project is under heavy development! Hence, it is not yet ready.

```JS
import IO from 'internet-object'

const schema = "name,age"

const o = IO.parse("Spiderman,25", schema)

// Prints Spiderman
console.log(o.name);

// Prints 25
console.log(o.age);
```

```JS
import IO from 'internet-object'

const schema = "name,age,address:{street,city,state,zip}"

const o = IO.parse("Spiderman,25,{Bond Street, New York, NY, 100000}", schema)

// Print o
console.log(o);
```
Outputs following object.
```
{
  "name": "Spiderman",
  "age": 25,
  "address": {
    "street": "Bond Street",
    "city": "New York",
    "state": "NY",
    "zip": 100000
  }
}
```

### Development Guide:

1. Fork repository from https://github.com/maniartech/internet-object
1. Install dependencies `npm install` or `yarn install`
1. Make changes into `./src` directory
1. Update tests
1. Run tests, `npm test` or `yarn test`
1. Send pull request

For more information about Internet Object architecture, check it out-
www.internetobject.org

MIT License -  `© Maniar Technologies`
