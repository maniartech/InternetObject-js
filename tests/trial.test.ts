

import { parse } from '../src'

describe('Deep Nested Variable Resolution', () => {

  it('resolves variables in nested schema choices', () => {
    const doc = `
~ @gj: Gujarat
~ @mh: Maharastra
~ @rj: Rajasthan
~ $schema: {
  State: { string, , [@gj, @mh, @rj] }
}
---
~ Gujarat
    `.trim()

    const result = parse(doc, null).toJSON()
    expect(result[0].State).toBe('Gujarat')
  });

  it('resolves variables in nested schema defaults', () => {
    const doc = `
~ @country: India
~ $schema: {
  country?: { string, @country }
}
---
~
    `.trim()

    const result = parse(doc, null).toJSON()
    expect(result[0].country).toBe('India')
  });

  it('resolves variables in top-level data', () => {
    const doc = `
~ @r: red
~ $schema: {
  color: string
}
---
~ @r
    `.trim()

    const result = parse(doc, null).toJSON()
    expect(result[0].color).toBe('red')
  });

  it('resolves variables in nested data', () => {
    const doc = `
~ @gj: Gujarat
~ $schema: {
  State: string
}
---
~ @gj
    `.trim()

    const result = parse(doc, null).toJSON()
    expect(result[0].State).toBe('Gujarat')
  });

  it('resolves variables at multiple nesting levels (comprehensive test)', () => {
    const doc = `
~ @r: red
~ @country: India
~ @gj: Gujarat
~ @mh: Maharastra
~ @rj: Rajasthan
~ $schema: {
  address: {
    street: string,
    city: string,
    State: { string, , [@gj, @mh, @rj] },
    pincode: { string, len: 6 },
    country?: { string, @country }
  },
  color: string
}
---
~ {Gandhi Road, Ahmedabad, @gj, "380001"}, @r
    `.trim()

    const result = parse(doc, null).toJSON()

    // Verify all variable resolutions work
    expect(result[0].address.street).toBe('Gandhi Road')
    expect(result[0].address.city).toBe('Ahmedabad')
    expect(result[0].address.State).toBe('Gujarat')  // Variable in data
    expect(result[0].address.pincode).toBe('380001')
    expect(result[0].address.country).toBe('India')  // Variable in default
    expect(result[0].color).toBe('red')  // Variable in top-level data
  });

  it('resolves numeric and boolean variables in nested schemas', () => {
    const doc = `
~ @defaultQty: 10
~ @active: T
~ $schema: {
  name: string,
  quantity?: { number, @defaultQty },
  active?: { bool, @active }
}
---
~ Laptop
~ Mouse, 5, F
    `.trim()

    const result = parse(doc, null).toJSON()

    expect(result[0].name).toBe('Laptop')
    expect(result[0].quantity).toBe(10)
    expect(result[0].active).toBe(true)

    expect(result[1].name).toBe('Mouse')
    expect(result[1].quantity).toBe(5)
    expect(result[1].active).toBe(false)
  });

  it('STRESS TEST: Variables at 5 nesting levels with mixed types', () => {
    const doc = `
~ @org: TechCorp
~ @defaultCity: San Francisco
~ @defaultZip: "94105"
~ @defaultStreet: "123 Main St"
~ @us: USA
~ @uk: UK
~ @india: India
~ @defaultSalary: 120000
~ @active: T
~ @remote: F
~ @senior: senior
~ @junior: junior
~ @mid: mid-level
~ $schema: {
  name: string,
  location: {
    street?: { string, @defaultStreet },
    city?: { string, @defaultCity },
    zip?: { string, @defaultZip },
    country?: { string, @us, [@us, @uk, @india] }
  },
  employee: {
    empId: string,
    info: {
      name: string,
      role: { string, , [@senior, @junior, @mid] },
      details: {
        type?: { string, fulltime, [fulltime, contract, intern] },
        remote?: { bool, @remote },
        active?: { bool, @active },
        pay: {
          amount?: { number, @defaultSalary },
          currency: { string, USD, [USD, EUR, INR] }
        }
      }
    }
  }
}
---
~ @org, {}, {EMP001, {Alice Johnson, @senior, {, , , {, USD}}}}
~ @org, {, , , @uk}, {EMP002, {Bob Smith, @junior, {contract, T, , {90000, EUR}}}}
~ @org, {456 Park Ave, Mumbai, "400001", @india}, {EMP003, {Charlie Brown, @mid, {, , , {, INR}}}}
    `.trim()

    const result = parse(doc, null).toJSON()
    console.log('STRESS TEST Result:', JSON.stringify(result, null, 2))

    // Test first employee with all defaults
    expect(result[0].name).toBe('TechCorp')
    expect(result[0].location.street).toBe('123 Main St')
    expect(result[0].location.city).toBe('San Francisco')
    expect(result[0].location.zip).toBe('94105')
    expect(result[0].location.country).toBe('USA')
    expect(result[0].employee.empId).toBe('EMP001')
    expect(result[0].employee.info.name).toBe('Alice Johnson')
    expect(result[0].employee.info.role).toBe('senior')
    expect(result[0].employee.info.details.type).toBe('fulltime')
    expect(result[0].employee.info.details.remote).toBe(false)
    expect(result[0].employee.info.details.active).toBe(true)
    expect(result[0].employee.info.details.pay.amount).toBe(120000)
    expect(result[0].employee.info.details.pay.currency).toBe('USD')

    // Test second employee with overrides and UK
    expect(result[1].location.country).toBe('UK')
    expect(result[1].employee.empId).toBe('EMP002')
    expect(result[1].employee.info.role).toBe('junior')
    expect(result[1].employee.info.details.type).toBe('contract')
    expect(result[1].employee.info.details.remote).toBe(true)
    expect(result[1].employee.info.details.pay.amount).toBe(90000)
    expect(result[1].employee.info.details.pay.currency).toBe('EUR')

    // Test third employee with India and custom address
    expect(result[2].location.street).toBe('456 Park Ave')
    expect(result[2].location.city).toBe('Mumbai')
    expect(result[2].location.zip).toBe('400001')
    expect(result[2].location.country).toBe('India')
    expect(result[2].employee.info.role).toBe('mid-level')
  });

  it('STRESS TEST: Variables at 4 nesting levels with choices and defaults', () => {
    const doc = `
~ @red: "#FF0000"
~ @green: "#00FF00"
~ @blue: "#0000FF"
~ @yellow: "#FFFF00"
~ @white: "#FFFFFF"
~ @black: "#000000"
~ @small: 10
~ @medium: 20
~ @large: 30
~ @xlarge: 40
~ $schema: {
  palette: {
    primary: { string, , [@red, @blue, @green] },
    secondary: { string, , [@yellow, @white, @black] },
    text: {
      heading?: { string, @black },
      body?: { string, @black },
      accent?: { string, @blue }
    }
  },
  sizes: {
    h1?: { number, @large },
    h2?: { number, @medium },
    p?: { number, @small }
  }
}
---
~ {@red, @yellow, {}}, {}
~ {@blue, @black, {@green, @white, @red}}, {@xlarge, @small, @small}
~ {@green, @white, {}}, {15, 12, 8}
    `.trim()

    const result = parse(doc, null).toJSON()
    console.log('STRESS TEST 4-Level:', JSON.stringify(result, null, 2))

    // First design - uses variables and defaults
    expect(result[0].palette.primary).toBe('#FF0000')
    expect(result[0].palette.secondary).toBe('#FFFF00')
    expect(result[0].palette.text.heading).toBe('#000000')
    expect(result[0].palette.text.body).toBe('#000000')
    expect(result[0].palette.text.accent).toBe('#0000FF')
    expect(result[0].sizes.h1).toBe(30)
    expect(result[0].sizes.h2).toBe(20)
    expect(result[0].sizes.p).toBe(10)

    // Second design - custom colors and sizes using variables
    expect(result[1].palette.primary).toBe('#0000FF')
    expect(result[1].palette.secondary).toBe('#000000')
    expect(result[1].palette.text.heading).toBe('#00FF00')
    expect(result[1].palette.text.body).toBe('#FFFFFF')
    expect(result[1].palette.text.accent).toBe('#FF0000')
    expect(result[1].sizes.h1).toBe(40)
    expect(result[1].sizes.h2).toBe(10)
    expect(result[1].sizes.p).toBe(10)

    // Third design - mix of variables and literal values
    expect(result[2].palette.primary).toBe('#00FF00')
    expect(result[2].palette.secondary).toBe('#FFFFFF')
    expect(result[2].sizes.h1).toBe(15)
    expect(result[2].sizes.h2).toBe(12)
    expect(result[2].sizes.p).toBe(8)
  });

  it('STRESS TEST: Variables with extreme nesting (7 levels deep)', () => {
    const doc = `
~ @v1: Level1Value
~ @v2: Level2Value
~ @v3: Level3Value
~ @v4: Level4Value
~ @v5: Level5Value
~ @v6: Level6Value
~ @v7: Level7Value
~ @default7: DeepDefault
~ $schema: {
  L1: {
    L2: {
      L3: {
        L4: {
          L5: {
            L6: {
              L7?: { string, @default7 }
            }
          }
        }
      }
    }
  }
}
---
~ {{{{{{@v7}}}}}}
~ {{{{{{}}}}}}
~ {{{{{{CustomValue}}}}}}
    `.trim()

    const result = parse(doc, null).toJSON()
    console.log('STRESS TEST Extreme Nesting:', JSON.stringify(result, null, 2))

    // All levels with explicit variable
    expect(result[0].L1.L2.L3.L4.L5.L6.L7).toBe('Level7Value')

    // Missing deepest level - should use default
    expect(result[1].L1.L2.L3.L4.L5.L6.L7).toBe('DeepDefault')

    // Deepest level with custom value
    expect(result[2].L1.L2.L3.L4.L5.L6.L7).toBe('CustomValue')
  });

  it('STRESS TEST: Mixed variables at all levels (schema + data)', () => {
    const doc = `
~ @companyName: MegaCorp
~ @deptName: Research
~ @teamLead: Jane Doe
~ @defaultBudget: 500000
~ @projectA: Project Alpha
~ @projectB: Project Beta
~ @projectC: Project Gamma
~ @active: T
~ @inactive: F
~ $schema: {
  company: string,
  department: {
    name: string,
    budget?: { number, @defaultBudget },
    team: {
      lead: string,
      active?: { bool, @active },
      project: {
        name: { string, , [@projectA, @projectB, @projectC] },
        status: string
      }
    }
  }
}
---
~ @companyName, {@deptName, , {@teamLead, , {@projectA, running}}}
~ @companyName, {IT, 750000, {John Smith, @inactive, {@projectB, completed}}}
~ @companyName, {Marketing, , {Alice Brown, , {@projectC, @projectA}}}
    `.trim()

    const result = parse(doc, null).toJSON()
    console.log('STRESS TEST Mixed:', JSON.stringify(result, null, 2))

    // First - all defaults and variables
    expect(result[0].company).toBe('MegaCorp')
    expect(result[0].department.name).toBe('Research')
    expect(result[0].department.budget).toBe(500000)
    expect(result[0].department.team.lead).toBe('Jane Doe')
    expect(result[0].department.team.active).toBe(true)
    expect(result[0].department.team.project.name).toBe('Project Alpha')
    expect(result[0].department.team.project.status).toBe('running')

    // Second - overrides with variables
    expect(result[1].department.name).toBe('IT')
    expect(result[1].department.budget).toBe(750000)
    expect(result[1].department.team.lead).toBe('John Smith')
    expect(result[1].department.team.active).toBe(false)
    expect(result[1].department.team.project.name).toBe('Project Beta')

    // Third - mixed variables in data
    expect(result[2].department.name).toBe('Marketing')
    expect(result[2].department.team.lead).toBe('Alice Brown')
    expect(result[2].department.team.project.name).toBe('Project Gamma')
    expect(result[2].department.team.project.status).toBe('Project Alpha')  // Variable used as data value
  });
});