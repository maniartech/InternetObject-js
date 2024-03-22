# API Response Employees Collection Sample - JSON vs Internet Object

```json
{
  "result": "success",
  "count": 103,
  "currentPage": 11,
  "pageSize": 10,
  "prevPage": "/api/v1/employees?page=10",
  "nextPage": null,
  "employees": [
    {
      "name": "Robert Miller", "age": 29, "isActive": true, "gender": "male",
      "address": {
        "street": "606 Spruce St", "city": "Houston", "state": "TX", "zip": 77001
      },
    },
    {
      "name": "Jennifer Wilson", "age": 35, "isActive": true, "gender": "female",
      "address": {
        "street": "707 Pine St", "city": "Portland", "state": "OR", "zip": 97035
      },
    },
    {
      "name": "Katrina Smith", "age": 24, "isActive": true, "gender": "female"
    }
  ]
}


```

```yaml
# Variables @m and @f. They can be used in the schema and data
# to represent the associated values.
~ @m: male
~ @f: female

# The address object schema
~ $address: {
  street  : string,                           # any string
  city    : string,                           # any string
  state   : string,                           # any string
  zip     : {number, min: 10000, max: 99999}, # 5 digit number
}

# The default schema for the employee object
~ $schema: {
  name      : string,                          # any string
  age       : { number, min: 20, max: 60 },    # number between 20 and 60
  isActive  : boolean,                         # boolean (T, F, true, false)
  gender    : { string, choices: [ @m, @f ] }, # gender with choices
  address*  : $address,                        # address object
}
```

```yaml
~ result: success
~ count: 10
~ currentPage: 1
~ pageSize: 10
~ prevPage: N
~ nextPage: "/api/v1/employees?page=2"
---
~ Robert Miller, 29, T, @m, { 606 Spruce St, Houston, TX, 77001 }
~ Jennifer Wilson, 35, T, @f, { 707 Pine St, Portland, OR, 97035 }
~ Katrina Smith, 24, T, @f
```
