export interface PROJECT_FILE {
  name: string;
  ext: string;
  path: string;
}

export interface PROJECT_CONTEXT {
  project_name: string;
  project_path: string;
  files: PROJECT_FILE[];
}

export interface NET_DETAIL {
  name: string;
}

export interface NETLIST_DETAILS {
  designators: string[];
  nets: NET_DETAIL[];
}

export interface DESIGN_GLOBAL_CONTEXT_TRAITS {
  net_list_details: NETLIST_DETAILS;
}

export interface DESIGN_GLOBAL_CONTEXT {
  uuid: string;
  net_list: string;
  kicad_version_info: unknown;
  project_context: PROJECT_CONTEXT;
  traits: DESIGN_GLOBAL_CONTEXT_TRAITS;
}
