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
