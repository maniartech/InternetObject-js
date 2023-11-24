
/**
 * Fails an assertion when the code is reached. This function is used to
 * ensure that the default case of a switch statement or the line is
 * never reached.
 */
export const assertInvalidReach = (msg:string = '') => {
  throw new Error('Invalid reach' + (msg ? ': ' + msg : ''))
}