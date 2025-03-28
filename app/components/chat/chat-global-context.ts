import { COPILOT_GLOBAL_CONTEXT } from "@/app/copilot";
import {
  fire_kicad_desktop_cmd,
  KICAD_DESKTOP_CMD_TYPE,
} from "@/app/copilot/cmd/kicad_desktop";
import { WEBVIEW_FUNCTIONS } from "@/app/copilot/constant";

class ChatGlobalContext {
  private _global_ctx: COPILOT_GLOBAL_CONTEXT | null = null;

  public constructor() {
    import("./test/example_ctx.json").then(
      (m) => (this._global_ctx = m.default),
    );

    window[WEBVIEW_FUNCTIONS.update_global_ctx] = (
      ctx: COPILOT_GLOBAL_CONTEXT,
    ) => {
      this._global_ctx = ctx;
    };
    window.onfocus = () => {
      fire_kicad_desktop_cmd({
        type: KICAD_DESKTOP_CMD_TYPE.update_global_context,
      });
    };
  }

  public get global_ctx() {
    return this._global_ctx;
  }
}

export const chatGlobalContext = new ChatGlobalContext();
