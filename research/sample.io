

~ $address: { street: string, zip:{string, maxLength:5}, city: string}
~ $schema: { name:string, age:int, address?:$address}
---
~ Spiderman, 25, {Queens, 50010, New York}
~ Batman, 30, {Gotham, 50011, New York}
~ Superman, 35
~ Hulk, 40, {Cal, 40010, California}