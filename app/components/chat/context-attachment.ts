import { BUILTIN_REFERENCE } from "../../kicad";

export enum AttachmentType {
  FILE,
  CONTEXT_OPTION,
}

export interface AttachItemBase {
  icon?: React.ReactNode;
}

export interface FileAttachmentItem extends AttachItemBase {
  type: AttachmentType.FILE;
  data: File;
}

export interface ContextAttachmentItem extends AttachItemBase {
  type: AttachmentType.CONTEXT_OPTION;
  data: {
    opt: BUILTIN_REFERENCE;
    name: string;
  };
}

export type AttachmentItem = FileAttachmentItem | ContextAttachmentItem;
