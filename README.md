<img src="/logo/internet-object.png" height="70px" alt="Internet Object" title="Internet Object">

> **Thin, simple & robust data interchange format for Internet. Best JSON alternative!**


## Internet Object JavaScript Parser

### ⚠ NOT YET READY - This project is under heavy development

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

const o = IO.parse("Spiderman,25,{Bond Street, New York, NY, 50005}", schema).data

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
    "zip": 50005
  }
}
```

### Geting Started (⚠ Not Ready):

1. Fork repository from https://github.com/maniartech/InternetObject-js
1. Install dependencies `npm install` or `yarn install`
1. Make changes in `./src`
1. Update tests in `./tests/`
1. Run tests, `npm test` or `yarn test`
1. Send pull request(s)

For more information about Internet Object architecture - InternetObject.org

> **MIT License:**
© ManiarTechⓇ 2018-2019
