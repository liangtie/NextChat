import {
  fire_web_host_internal_cmd,
  WEB_HOST_INTERNAL_CMD_TYPE,
  COPILOT_GLOBAL_CONTEXT,
} from "@/app/copilot";

import { WEBVIEW_FUNCTIONS } from "@/app/copilot/constant";

class ChatGlobalContext {
  private _global_ctx: COPILOT_GLOBAL_CONTEXT | null = null;

  public constructor() {
    import("./test/example_ctx.json").then(
      (m) => (this._global_ctx = m.default),
    );

    window[WEBVIEW_FUNCTIONS.update_copilot_global_context] = (
      ctx: COPILOT_GLOBAL_CONTEXT,
    ) => {
      this._global_ctx = ctx;
    };
    window.onfocus = () => {
      fire_web_host_internal_cmd({
        type: WEB_HOST_INTERNAL_CMD_TYPE.fetch_global_context_from_host,
      });
    };
  }

  public get global_ctx() {
    return this._global_ctx;
  }
}

export const chatGlobalContext = new ChatGlobalContext();
