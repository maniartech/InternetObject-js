import 'jest'

import { isDateTime } from '../../src/utils/is'

describe('Tet Datetime Utilities', () => {
  it('tests the datatime validity', () => {
    // Test anything here, just don't push changes to the server!
    const dt1 = '2020-04-12T08:43:46.619Z'
    const dt2 = '20200412T084346.619Z'
    const date = '2020-12-20'
    const time = '18:20:30'
    const invalidDate = 'not-a-date'

    expect(isDateTime(dt1)).toBeTruthy()
    expect(isDateTime(dt2)).toBeTruthy()

    expect(isDateTime(date)).toBeFalsy()
    expect(isDateTime(time)).toBeFalsy()
    expect(isDateTime(invalidDate)).toBeTruthy()
  })
})
