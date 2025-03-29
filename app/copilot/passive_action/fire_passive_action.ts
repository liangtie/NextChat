import { WEBVIEW_MSG_HANDLES } from "../constant";
import { PASSIVE_ACTION_CONTAINER } from "./passive_action_container";

export const fire_passive_action = (action: PASSIVE_ACTION_CONTAINER) =>
  window[WEBVIEW_MSG_HANDLES.eda_host].postMessage(JSON.stringify(action));
