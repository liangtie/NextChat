export enum CMD_TYPE {
  GENERIC_CHAT = "chat.user.generic_chat",

  DESIGN_INTENTION = "chat.design.intention",
  CORE_COMPONENTS = "chat.design.core_components",

  CURRENT_COMPONENT = "chat.components.current_component",
  SIMILAR_COMPONENTS = "chat.components.similar_components",
  CHECK_SYMBOL_CONNECTIONS = "chat.components.check_symbol_connections",
  COMPONENT_PINS_DETAILS = "chat.components.component_pins_details",
  SYMBOL_UNCONNECTED_PINS = "chat.components.symbol_unconnected_pins",
}

export type SYMBOL_CMD_TYPE =
  | CMD_TYPE.CURRENT_COMPONENT
  | CMD_TYPE.SIMILAR_COMPONENTS
  | CMD_TYPE.CHECK_SYMBOL_CONNECTIONS
  | CMD_TYPE.COMPONENT_PINS_DETAILS
  | CMD_TYPE.SYMBOL_UNCONNECTED_PINS;

export const READABLE_CMD = {
  [CMD_TYPE.DESIGN_INTENTION]: "设计意图",
  [CMD_TYPE.CORE_COMPONENTS]: "核心组件",
  [CMD_TYPE.CURRENT_COMPONENT]: "当前组件",
  [CMD_TYPE.SIMILAR_COMPONENTS]: "相似器件推荐",
  [CMD_TYPE.CHECK_SYMBOL_CONNECTIONS]: "连接关系检查",
  [CMD_TYPE.COMPONENT_PINS_DETAILS]: "引脚详情",
  [CMD_TYPE.SYMBOL_UNCONNECTED_PINS]: "未连接引脚检查",
};
