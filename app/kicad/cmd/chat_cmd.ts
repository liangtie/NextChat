import { DESIGN_CMD } from "./design";
import { GENERIC_CHAT_CMD } from "./generic_chat";
import { SYMBOL_CMD } from "./symbol";

export type CONTEXT_MENU_CMD = DESIGN_CMD | SYMBOL_CMD;

export type CHAT_CMD = DESIGN_CMD | SYMBOL_CMD | GENERIC_CHAT_CMD;
