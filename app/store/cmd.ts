import Fuse from "fuse.js";
import { nanoid } from "nanoid";
import { StoreKey } from "../constant";
import { getLang } from "../locales";
import { createPersistStore } from "../utils/store";

export interface CMD_BASE {
  id: string;
  title: string;
  priority: number;
}

export interface SystemCMD extends CMD_BASE {}

export interface UserCMD extends CMD_BASE {
  content: string;
  isUser: true;
  createdAt: number;
}

export type APP_CMD = SystemCMD | UserCMD;

export const SearchService = {
  ready: false,
  builtinEngine: new Fuse<APP_CMD>([], { keys: ["title"] }),
  userEngine: new Fuse<APP_CMD>([], { keys: ["title"] }),
  count: {
    builtin: 0,
  },
  allCMD: [] as APP_CMD[],
  builtinCMD: [] as APP_CMD[],

  init(builtinCMD: APP_CMD[], userCMD: APP_CMD[]) {
    if (this.ready) {
      return;
    }
    this.allCMD = userCMD.concat(builtinCMD);
    this.builtinCMD = builtinCMD.slice();
    this.builtinEngine.setCollection(builtinCMD);
    this.userEngine.setCollection(userCMD);
    this.ready = true;
  },

  remove(id: string) {
    this.userEngine.remove((doc) => doc.id === id);
  },

  add(prompt: APP_CMD) {
    this.userEngine.add(prompt);
  },

  search(text: string) {
    const userResults = this.userEngine.search(text);
    const builtinResults = this.builtinEngine.search(text);
    return userResults.concat(builtinResults).map((v) => v.item);
  },
};

export const usePromptStore = createPersistStore(
  {
    counter: 0,
    cmds: {} as Record<string, APP_CMD>,
  },

  (set, get) => ({
    add(cmd: UserCMD) {
      const prompts = get().cmds;
      cmd.id = nanoid();
      cmd.isUser = true;
      cmd.createdAt = Date.now();
      prompts[cmd.id] = cmd;

      set(() => ({
        cmds: prompts,
      }));

      return cmd.id!;
    },

    get(id: string) {
      const targetPrompt = get().cmds[id];

      if (!targetPrompt) {
        return SearchService.builtinCMD.find((v) => v.id === id);
      }

      return targetPrompt;
    },

    remove(id: string) {
      const prompts = get().cmds;
      delete prompts[id];

      Object.entries(prompts).some(([key, prompt]) => {
        if (prompt.id === id) {
          delete prompts[key];
          return true;
        }
        return false;
      });

      SearchService.remove(id);

      set(() => ({
        cmds: prompts,
        counter: get().counter + 1,
      }));
    },

    getUserCMDS() {
      const userCMD = Object.values(get().cmds ?? {});
      userCMD.sort((a, b) => (b.id && a.id ? b.priority - a.priority : 0));
      return userCMD;
    },

    updateCMD(id: string, updater: (prompt: UserCMD) => void) {
      const prompt = {
        ...(get().cmds[id] ?? {
          title: "",
          content: "",
          id,
        }),
        content: "",
        isUser: true,
      } as UserCMD;

      SearchService.remove(id);
      updater(prompt);
      const prompts = get().cmds;
      prompts[id] = prompt;
      set(() => ({ cmds: prompts }));
      SearchService.add(prompt);
    },

    search(text: string) {
      if (text.length === 0) {
        // return all rompts
        return this.getUserCMDS().concat(SearchService.builtinCMD);
      }
      return SearchService.search(text) as APP_CMD[];
    },
  }),
  {
    name: StoreKey.Prompt,
    version: 3,

    migrate(state, version) {
      const newState = JSON.parse(JSON.stringify(state)) as {
        prompts: Record<string, APP_CMD>;
      };

      if (version < 3) {
        Object.values(newState.prompts).forEach((p) => (p.id = nanoid()));
      }

      return newState as any;
    },

    onRehydrateStorage(state) {
      // Skip store rehydration on server side
      if (typeof window === "undefined") {
        return;
      }

      const PROMPT_URL = "./cmds.json";

      fetch(PROMPT_URL)
        .then((res) => res.json())
        .then((res) => {
          const builtinCMD: Array<CMD_BASE> =
            getLang() === "cn" ? res.cn : res.en;

          const userCMD = usePromptStore.getState().getUserCMDS() ?? [];
          SearchService.count.builtin = res.en.length + res.cn.length;
          SearchService.init(builtinCMD, userCMD);
        });
    },
  },
);
