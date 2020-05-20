<img src="/logo/internet-object.png" height="50px" alt="Internet Object" title="Internet Object">

[![Build Status](https://travis-ci.org/maniartech/InternetObject-js.svg?branch=master)](https://travis-ci.org/maniartech/InternetObject-js)

> **Thin, robust, schema-first yet simple data interchange format for Internet. Best well-planned alternative to JSON!**

## Internet Object TypeScript/JavaScript Parser

### ⚠ NOT YET READY - This project is under active development! Don't use, not yet ready!

```JS
import InternetObject from 'internet-object'

const schema = "name,age"

const o = new InternetObject("Spiderman,25", schema)


// Prints Spiderman
console.log(o.data.name);

// Prints 25
console.log(o.data.age);
```

```JS
import InternetObject from 'internet-object'

const schema = "name,age,address:{street,city,state,zip}"

const o = new InternetObject("Spiderman,25,{Bond Street, New York, NY, 50005}", schema)

// Print o
console.log(o.data);
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
    "zip": 50005
  }
}
```

### Work in Progress

- [x] Tokenizer
- [x] Tree Parser
- [x] Schema Parser
- [x] Number
- [x] Strings
- [x] Boolean and Nulls
- [x] DateTime
- [x] Collections (WIP)
- [ ] Definitions (WIP)
- [ ] Serialization (WIP)
- [ ] Optimization (WIP)
- [ ] Testing (WIP)

### Geting Started (⚠ Not Ready):

1. Fork repository from https://github.com/maniartech/InternetObject-js
1. Install dependencies `npm install` or `yarn install`
1. Make changes in `./src`
1. Update tests in `./tests/`
1. Run tests, `npm test` or `yarn test`
1. Send pull request(s)

For more information about Internet Object architecture - InternetObject.org

**ISC License:**
© ManiarTechⓇ 2018-2020
