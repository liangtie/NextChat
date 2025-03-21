import { WEBVIEW_MSG_HANDLES } from "../constant";

export enum KICAD_DESKTOP_CMD_TYPE {
  update_global_context = "update_global_context",
}

export interface KICAd_DESKTOP_CMD {
  type: string;
}

export function fire_kicad_desktop_cmd(cmd: KICAd_DESKTOP_CMD) {
  window[WEBVIEW_MSG_HANDLES.kicad_desktop].postMessage(JSON.stringify(cmd));
}
