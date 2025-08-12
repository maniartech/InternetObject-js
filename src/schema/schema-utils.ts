import Schema from './schema';
import MemberDef from './types/memberdef';

export class SchemaUtils {
  /**
   * Creates a deep clone of the schema.
   * @deprecated Use immutable Schema class instead
   */
  static cloneSchema(schema: Schema): Schema {
    const builder = Schema.create(schema.name).setOpen(schema.open);

    for (const name of schema.names) {
      const memberDef = schema.get(name);
      if (memberDef) {
        builder.addMember(name, { ...memberDef });
      }
    }

    return builder.build();
  }

  /**
   * Merges two schemas into a new schema.
   * Extension schema members override base schema members with same name.
   */
  static mergeSchemas(base: Schema, extension: Schema): Schema {
    const builder = Schema.create(`${base.name}_${extension.name}`);

    // Add base members
    for (const name of base.names) {
      const memberDef = base.get(name);
      if (memberDef) {
        builder.addMember(name, memberDef);
      }
    }

    // Add extension members (override if exists)
    for (const name of extension.names) {
      const memberDef = extension.get(name);
      if (memberDef) {
        // Remove existing if present
        if (base.has(name)) {
          // In builder pattern, we'd need to support member replacement
          // For now, create new builder without conflicting members
        }
        builder.addMember(name, memberDef);
      }
    }

    // Canonicalize open property: if either is MemberDef, prefer MemberDef, else true/false
    let open: boolean | MemberDef = false;
    if (typeof base.open !== 'boolean') {
      open = base.open;
    } else if (typeof extension.open !== 'boolean') {
      open = extension.open;
    } else {
      open = base.open || extension.open;
    }
    return builder.setOpen(open).build();
  }

  /**
   * Gets schema metrics for analysis.
   */
  static getSchemaMetrics(schema: Schema): SchemaMetrics {
    return {
      memberCount: schema.memberCount,
      isOpen: schema.open,
      typeDistribution: this.getTypeDistribution(schema)
    };
  }

  private static getTypeDistribution(schema: Schema): Record<string, number> {
    const distribution: Record<string, number> = {};

    for (const name of schema.names) {
      const memberDef = schema.get(name);
      if (memberDef) {
        distribution[memberDef.type] = (distribution[memberDef.type] || 0) + 1;
      }
    }

    return distribution;
  }
}

export interface SchemaMetrics {
  memberCount: number;
  isOpen: boolean | MemberDef;
  typeDistribution: Record<string, number>;
}
