import { parse } from '../../../src'

describe('Variable References in Defaults', () => {
  test('should resolve variable references in default values', () => {
    const io = `
~ @r: red
~ $schema: {itemName: string, color?: { string, default: @r }}
---
~ Printer, Black
~ Book
    `.trim()

    const result = parse(io, null).toJSON()

    expect(result).toEqual([
      {
        itemName: 'Printer',
        color: 'Black'
      },
      {
        itemName: 'Book',
        color: 'red'
      }
    ])
  })

  test('should handle multiple string variable references', () => {
    const io = `
~ @defaultColor: blue
~ @defaultSize: medium
~ $schema: {name: string, color?: { string, default: @defaultColor }, size?: { string, default: @defaultSize }}
---
~ Shirt, red
~ Pants, , large
~ Hat
    `.trim()

    const result = parse(io, null).toJSON()

    expect(result).toEqual([
      {
        name: 'Shirt',
        color: 'red',
        size: 'medium'
      },
      {
        name: 'Pants',
        color: 'blue',
        size: 'large'
      },
      {
        name: 'Hat',
        color: 'blue',
        size: 'medium'
      }
    ])
  })

  test('should resolve numeric variable in defaults', () => {
    const io = `
~ @defaultQty: 1
~ $schema: {product: string, quantity?: { number, default: @defaultQty }}
---
~ Laptop, 5
~ Mouse
    `.trim()

    const result = parse(io, null).toJSON()

    expect(result).toEqual([
      {
        product: 'Laptop',
        quantity: 5
      },
      {
        product: 'Mouse',
        quantity: 1
      }
    ])
  })

  test('should resolve boolean variable in defaults', () => {
    const io = `
~ @yes: T
~ $schema: {name: string, active?: { bool, default: @yes }}
---
~ Alice, F
~ Bob
    `.trim()

    const result = parse(io, null).toJSON()

    expect(result).toEqual([
      {
        name: 'Alice',
        active: false
      },
      {
        name: 'Bob',
        active: true
      }
    ])
  })
})
