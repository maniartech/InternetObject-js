import SyntaxError from '../../errors/io-syntax-error'
import ErrorCodes from '../../errors/io-error-codes'
import MemberDef from './memberdef'

export interface CreateMemberDefInput extends Partial<MemberDef> {
  name?: string
  type: string
  path?: string
  optional?: boolean
  null?: boolean
}

export function createMemberDef(input: CreateMemberDefInput, opts?: { allowNameless?: boolean }): MemberDef {
  const allowNameless = opts?.allowNameless === true

  if (!input || typeof input !== 'object') {
    throw new SyntaxError(ErrorCodes.invalidMemberDef, 'Invalid member definition input provided.')
  }

  const { name, type } = input

  if (!type || typeof type !== 'string') {
    throw new SyntaxError(ErrorCodes.invalidType, 'MemberDef.type must be a non-empty string.')
  }

  if (!allowNameless && (!name || typeof name !== 'string' || name.trim() === '')) {
    throw new SyntaxError(ErrorCodes.invalidMemberDef, 'MemberDef must have a valid name.')
  }

  // Basic shape checks for common compound types
  if (type === 'array') {
    if (!('of' in input) || typeof (input as any).of !== 'object' || !(input as any).of) {
      throw new SyntaxError(ErrorCodes.invalidDefinition, "Array MemberDef must include an 'of' definition.")
    }
  }

  // Normalize boolean-like flags when provided
  const out: any = { ...input }
  if ('optional' in out && out.optional !== undefined) {
    out.optional = Boolean(out.optional)
  }
  if ('null' in out && out.null !== undefined) {
    out.null = Boolean(out.null)
  }

  return out as MemberDef
}

export default createMemberDef
