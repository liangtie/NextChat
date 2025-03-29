import { WEBVIEW_MSG_HANDLES } from "../constant";

export enum WEB_HOST_INTERNAL_CMD_TYPE {
  fetch_global_context_from_host = "fetch_global_context_from_host",
}

export interface WEB_HOST_INTERNAL_CMD {
  type: string;
}

export function fire_web_host_internal_cmd(cmd: WEB_HOST_INTERNAL_CMD) {
  window[WEBVIEW_MSG_HANDLES.eda_host].postMessage(JSON.stringify(cmd));
}
