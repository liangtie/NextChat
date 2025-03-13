export const WEBSOCKET_URI = "ws://www.fdatasheets.com/kicad/chat";

export function get_runtime_websocket_url() {
  return `${WEBSOCKET_URI}/${Math.random().toString().substring(3, 8)}`;
}
