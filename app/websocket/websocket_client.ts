import { CHAT_CMD } from "../kicad";
import { get_runtime_websocket_url } from "./websocket_cnf";
import {
  WEBSOCKET_MESSAGE_TYPE,
  WEBSOCKET_RESPONSE,
} from "./websocket_response";

export interface WEBSOCKET_CMD_OPTION {
  onFinish: () => void;
  onUpdate: (msg: string) => void;
}

class WebSocketStream {
  private animateResponseText() {
    const animateResponseText = () => {
      if (this.finished) {
        this.responseText += this.remainText;
        this.chat_opt.onUpdate(this.responseText);
        console.log("[Response Animation] finished");
        this.chat_opt.onFinish();
        return;
      }

      if (this.remainText.length > 0) {
        const fetchCount = Math.max(1, Math.round(this.remainText.length / 60));
        const fetchText = this.remainText.slice(0, fetchCount);
        this.responseText += fetchText;
        this.remainText = this.remainText.slice(fetchCount);
        this.chat_opt.onUpdate(this.responseText);
      }

      requestAnimationFrame(animateResponseText);
    };

    // start animaion
    animateResponseText();
  }

  public constructor(
    public chat_opt: WEBSOCKET_CMD_OPTION,
    public responseText = "",
    public remainText = "",
    public finished = false,
    public error = false,
  ) {
    this.animateResponseText();
  }

  public onmessage(msg: MessageEvent) {
    try {
      const res = JSON.parse(msg.data) as WEBSOCKET_RESPONSE;
      switch (res.type) {
        case WEBSOCKET_MESSAGE_TYPE.STOPPED:
          this.finished = true;
          break;
        case WEBSOCKET_MESSAGE_TYPE.STREAMING:
          this.remainText += res.msg;
          break;
      }
    } catch (e) {
      console.log("[Websocket] error", e);
    }
  }
}

class WebsocketClient {
  private socket?: WebSocket;
  private stream?: WebSocketStream;
  private consumed_ctx_ids = new Set<string>();

  public constructor(private websocketUrl: string) {}

  public send_cmd(cmd: CHAT_CMD, options: WEBSOCKET_CMD_OPTION) {
    this.stream = new WebSocketStream(options);
    const do_send = () => {
      this.socket!.onmessage = (ev) => {
        this.stream?.onmessage(ev);
      };

      if (
        cmd.design_global_context?.uuid &&
        this.consumed_ctx_ids.has(cmd.design_global_context.uuid)
      )
        cmd.design_global_context = undefined;

      this.socket!.send(JSON.stringify(cmd));

      if (cmd.design_global_context?.uuid)
        this.consumed_ctx_ids.add(cmd.design_global_context.uuid);
    };

    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.init(do_send);
      return;
    }

    do_send();
  }

  private init(onopen?: () => void) {
    this.consumed_ctx_ids.clear();
    this.socket = new WebSocket(this.websocketUrl);

    this.socket.onopen = () => {
      console.log("[Websocket] connected");
    };

    this.socket.onclose = () => {
      console.log("[Websocket] closed");
      this.init();
    };

    this.socket.onerror = (ev: Event) => {
      console.log("[Websocket] error", ev);
      this.consumed_ctx_ids.clear();
    };
    this.socket.onopen = (ev: Event) => {
      console.log("[Websocket] open", ev);
      if (onopen) {
        onopen();
      }
    };
  }
}

export const websocketClient = new WebsocketClient(get_runtime_websocket_url());
