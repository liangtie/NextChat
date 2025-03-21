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

export interface COPILOT_GLOBAL_CONTEXT {
  uuid: string;
  kicad_version_info: unknown;
  project_context: PROJECT_CONTEXT;
}
