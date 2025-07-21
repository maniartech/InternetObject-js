import MemberDef from "../types/memberdef";

export type MemberMap = Record<string, MemberDef>;

export interface SchemaConstructorArg {
  name: string;
  members?: MemberMap;
  open?: boolean;
}
