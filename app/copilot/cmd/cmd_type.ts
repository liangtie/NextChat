export enum CMD_TYPE {
  GENERIC_CHAT = "chat.user.generic_chat",

  DESIGN_INTENTION = "chat.design.intention",
  CORE_COMPONENTS = "chat.design.core_components",
  USR_CHAT_WITH_DESIGN = "chat.design.usr_chat",

  CURRENT_COMPONENT = "chat.components.current_component",
  SIMILAR_COMPONENTS = "chat.components.similar_components",
  CHECK_SYMBOL_CONNECTIONS = "chat.components.check_symbol_connections",
  COMPONENT_PINS_DETAILS = "chat.components.component_pins_details",
  SYMBOL_UNCONNECTED_PINS = "chat.components.symbol_unconnected_pins",
  USR_CHAT_WITH_COMPONENT = "chat.components.usr_chat",
}

export type SYMBOL_CMD_TYPE =
  | CMD_TYPE.CURRENT_COMPONENT
  | CMD_TYPE.SIMILAR_COMPONENTS
  | CMD_TYPE.CHECK_SYMBOL_CONNECTIONS
  | CMD_TYPE.COMPONENT_PINS_DETAILS
  | CMD_TYPE.SYMBOL_UNCONNECTED_PINS;

export function get_readable_cmd(cmd: CMD_TYPE) {
  switch (cmd) {
    case CMD_TYPE.DESIGN_INTENTION:
      return "设计意图";
    case CMD_TYPE.CORE_COMPONENTS:
      return "核心组件";
    case CMD_TYPE.CURRENT_COMPONENT:
      return "当前组件";
    case CMD_TYPE.SIMILAR_COMPONENTS:
      return "相似器件推荐";
    case CMD_TYPE.CHECK_SYMBOL_CONNECTIONS:
      return "连接关系检查";
    case CMD_TYPE.COMPONENT_PINS_DETAILS:
      return "引脚详情";
    case CMD_TYPE.SYMBOL_UNCONNECTED_PINS:
      return "未连接引脚检查";
    default:
      return undefined;
  }
}
