import MemberDef from '../types/memberdef';
import TokenNode from '../../parser/nodes/tokens';
import ObjectNode from '../../parser/nodes/objects';
import ArrayNode from '../../parser/nodes/array';
import TypedefRegistry from '../typedef-registry';

/**
 * Converts additional property schema node to canonical MemberDef.
 * Supports: string, object, array, MemberDef with constraints, open forms,
 * and schema variable references ($schemaName).
 */
export function canonicalizeAdditionalProps(node: any, path: string = '*'): MemberDef {
  // Switch on node type
  if (node instanceof TokenNode) {
    if (typeof node.value === 'string') {
      // Built-in types (string, int, bool, etc.)
      if (TypedefRegistry.isRegisteredType(node.value)) {
        return { type: node.value, path };
      }
      // Open form: *
      if (node.value === '*') {
        return { type: 'any', path };
      }
      // Schema variable reference: $schemaName
      // Store the TokenNode as schema for later resolution during processing
      if (node.value.startsWith('$')) {
        return { type: 'object', schema: node, path };
      }
    }
    return { type: 'any', path };
  }
  if (node instanceof ObjectNode) {
    // Open object form: {}
    if (node.children.length === 0) {
      return { type: 'object', path, open: true };
    }
    // Check if first child is a MemberNode with no key and value is TokenNode (type)
    const firstChild = node.children[0] as import('../../parser/nodes/members').default;
    if (firstChild && !firstChild.key && firstChild.value instanceof TokenNode) {
      const typeToken = firstChild.value as TokenNode;
      if (typeof typeToken.value === 'string') {
        // Schema variable reference in object form: { $schemaName, ... }
        if (typeToken.value.startsWith('$')) {
          return { type: 'object', schema: typeToken, path };
        }
        if (TypedefRegistry.isRegisteredType(typeToken.value)) {
          // Collect constraints from other children (MemberNode with key)
          const memberDef: MemberDef = { type: typeToken.value, path };
          for (let i = 1; i < node.children.length; i++) {
            const child = node.children[i] as import('../../parser/nodes/members').default;
            if (child && child.key && child.value instanceof TokenNode) {
              (memberDef as any)[child.key.value as string] = (child.value as any).value;
            }
          }
          return memberDef;
        }
      }
    }
    // MemberDef with constraints (fallback)
    return { type: 'object', path };
  }
  if (node instanceof ArrayNode) {
    // Open array form: []
    if (node.children.length === 0) {
      return { type: 'array', path, of: { type: 'any' } };
    }
    // Array of type: [string]
    const child = node.children[0];
    if (child instanceof TokenNode && typeof child.value === 'string') {
      return { type: 'array', path, of: { type: child.value } };
    }
    return { type: 'array', path };
  }
  // Already a MemberDef or unknown node
  if (typeof node === 'object' && (node as any).type) {
    return { ...(node as any), path };
  }
  return { type: 'any', path };
}
