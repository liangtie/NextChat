import { AGENT_ACTION_TYPE } from "./agent_action_type";
import { fire_agent_action } from "./fire_agent_action";

export const highlight_symbol = (designator: string) =>
  fire_agent_action({
    action: AGENT_ACTION_TYPE.highlight_symbol,
    context: {
      designator,
    },
  });
