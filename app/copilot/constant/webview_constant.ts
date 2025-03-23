export enum WEBVIEW_MSG_HANDLES {
  kicad_desktop = "kicad_desktop",
  function_call = "function_call",
}

export enum WEBVIEW_FUNCTIONS {
  fire_copilot_cmd = "fire_copilot_cmd",
  fire_session_cmd = "fire_session_cmd",
  new_session = "new_session",
  get_current_session_id = "get_current_session_id",
  update_global_ctx = "update_global_ctx",
}

export const ASSISTANT_NAME = "芯灵小助手";
