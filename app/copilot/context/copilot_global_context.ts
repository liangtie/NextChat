import { HOST_VERSION_INFO } from "./host_version_info";

export interface COPILOT_GLOBAL_CONTEXT {
  uuid: string;
  /**
   * @description The version of the host application, e.g. KiCad, Altium, etc.
   */
  host_version_info?: HOST_VERSION_INFO;
}
