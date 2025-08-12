import Definitions from '../../core/definitions';
import MemberNode from '../../parser/nodes/members';
import TypedefRegistry from '../typedef-registry';
import MemberDef from '../types/memberdef';

export class MemberProcessorFactory {
  static process(member: MemberNode, memberDef: MemberDef, defs?: Definitions): any {
    const processor = this.getProcessor(memberDef.type);
    return processor.process(member, memberDef, defs);
  }

  private static getProcessor(type: string): MemberProcessor {
    const typeDef = TypedefRegistry.get(type);
    return new StandardMemberProcessor(typeDef);
  }
}

interface MemberProcessor {
  process(member: MemberNode, memberDef: MemberDef, defs?: Definitions): any;
}

class StandardMemberProcessor implements MemberProcessor {
  constructor(private typeDef: any) {}

  process(member: MemberNode, memberDef: MemberDef, defs?: Definitions): any {
    return this.typeDef.parse(member?.value, memberDef, defs);
  }
}
