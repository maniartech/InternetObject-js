import IODefinitions    from '../../core/definitions';
import MemberNode       from '../../parser/nodes/members';
import TypedefRegistry  from '../typedef-registry';
import MemberDef        from '../types/memberdef';
import IOError          from '../../errors/io-error';
import ErrorCodes       from '../../errors/io-error-codes';
import { unusableTypeCode } from '../types/common-number'
import ValidationError from '../../errors/io-validation-error'

export function processMember(member: MemberNode, memberDef: MemberDef, defs?: IODefinitions): any {
  const typeDef = TypedefRegistry.get(memberDef.type);
  if (!typeDef) {
    throw new ValidationError(unusableTypeCode(memberDef.type), `Type '${memberDef.type}' is not registered.`);
  }
  let valueNode = member?.value;
  return typeDef.parse(valueNode, memberDef, defs);
}
