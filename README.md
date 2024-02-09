# <img src="./logo/internet-object-logo.png" height="24px" alt="Internet Object" title="Internet Object"> Internet Object

Thin, robust, schema-first yet simple data interchange format for Internet. Best well-planned alternative to JSON!

## 🚧 NOT READY (WIP) - API WILL CHANGE

## Example Usage

The following example demonstrates how to use Internet Object to parse a simp[le internet object document. Please note that the API is not yet ready and published. This is just a demonstration.

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

``` JSON
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
- [x] AST Parser
- [x] Schema Parser
- [x] Number
- [x] Strings
- [x] Boolean and Nulls
- [x] DateTime
- [x] Collections
- [x] Definitions
- [ ] Serialization (WIP)
- [ ] Deserialization (WIP)
- [ ] Optimization (WIP)
- [ ] Testing (WIP)

### Geting Started (⚠ Not Ready)

1. Fork repository from <https://github.com/maniartech/InternetObject-js>
1. Install dependencies `npm install` or `yarn install`
1. Make changes in `./src`
1. Update tests in `./tests/`
1. Run tests, `npm test` or `yarn test`
1. Send pull request(s)

For more information about Internet Object architecture - InternetObject.org

**ISC License:**
© ManiarTechⓇ 2018-2024. All rights reserved.
