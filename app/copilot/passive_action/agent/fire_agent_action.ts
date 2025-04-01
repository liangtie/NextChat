import { fire_passive_action } from "../fire_passive_action";
import { PASSIVE_ACTION_CATEGORY } from "../passive_action_category";
import { AGENT_ACTION } from "./agent_action";

export const fire_agent_action = (data: AGENT_ACTION) =>
  fire_passive_action({
    category: PASSIVE_ACTION_CATEGORY.PA_AGENT,
    data,
  });
