import Definitions from '../core/definitions';
import TokenNode from '../parser/nodes/tokens';
import MemberDef from './types/memberdef';

/**
 * Resolves variable references in memberDef fields like default, min, max, choices.
 * Variables are strings starting with @ that reference definitions.
 */
export default function resolveMemberDefVariables(memberDef: MemberDef, defs?: Definitions): MemberDef {
  if (!memberDef || !defs) return memberDef;

  const resolved = { ...memberDef };

  // Resolve default value if it's a variable reference
  if (typeof resolved.default === 'string' && resolved.default.startsWith('@')) {
    resolved.default = defs.getV(resolved.default);
    // Unwrap TokenNode if needed
    if (resolved.default instanceof TokenNode) {
      resolved.default = resolved.default.value;
    }
  }

  // Resolve choices if they contain variable references
  if (Array.isArray(resolved.choices)) {
    resolved.choices = resolved.choices.map(choice => {
      if (typeof choice === 'string' && choice.startsWith('@')) {
        let resolved = defs.getV(choice);
        return resolved instanceof TokenNode ? resolved.value : resolved;
      }
      return choice;
    });
  }

  // Resolve min/max if they're variable references
  if (typeof resolved.min === 'string' && resolved.min.startsWith('@')) {
    resolved.min = defs.getV(resolved.min);
    if (resolved.min instanceof TokenNode) {
      resolved.min = resolved.min.value;
    }
  }
  if (typeof resolved.max === 'string' && resolved.max.startsWith('@')) {
    resolved.max = defs.getV(resolved.max);
    if (resolved.max instanceof TokenNode) {
      resolved.max = resolved.max.value;
    }
  }

  return resolved;
}
