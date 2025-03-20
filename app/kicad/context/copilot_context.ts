export interface DESIGN_GLOBAL_CONTEXT {
  uuid: string;
  bom: string;
  net_list: string;
  kicad_version_info: unknown;
}

export interface SYMBOL_CMD_CONTEXT {
  designator: string;
  symbol_properties: unknown;
}
