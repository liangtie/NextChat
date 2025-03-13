import { GENERIC_CHAT_OPTIONS } from "./generic_chat_options";

export interface USER_INPUT {
  input_text: string;
  options: GENERIC_CHAT_OPTIONS;
}

export interface GENERIC_CHAT_CONTEXT {
  chat: USER_INPUT;
}
