import { useRef, useState, useEffect } from "react";
import Locale from "../../locales";
import styles from "./input-box.module.scss";
import { SendButton } from "./send-button";
import { SelectAttachmentButton } from "./select-attachment-button";
import { SelectContextButton } from "./select-context-button";
import { ContextMenu, ContextMenuItem } from "./context-menu";
import {
  AttachmentItem,
  AttachmentType,
  ContextAttachmentItem,
} from "./context-attachment";
import {
  BUILTIN_REFERENCE,
  CHAT_CMD,
  CMD_TYPE,
  CONTEXT_MENU_CMD,
  DESIGN_GLOBAL_CONTEXT,
  READABLE_CMD,
} from "../../kicad";
import { ASSISTANT_NAME, WEBVIEW_FUNCTIONS } from "../../kicad/constant";
import {
  fire_kicad_desktop_cmd,
  KICAD_DESKTOP_CMD_TYPE,
} from "../../kicad/cmd/kicad_desktop";
import { useSubmitHandler } from "./chat-utils";
import { autoGrowTextArea, useMobileScreen } from "@/app/utils";
import {
  ChatMessage,
  createMessage,
  useAppConfig,
  useChatStore,
} from "@/app/store";
import { useDebouncedCallback } from "use-debounce";
import { ChatControllerPool } from "@/app/client/controller";
import { Path } from "@/app/constant";
import { websocketClient } from "@/app/websocket";
import { useNavigate } from "react-router-dom";
import { isEmpty } from "lodash-es";

interface InputBoxProps {
  inputRef: React.RefObject<HTMLTextAreaElement>;
  userInput: string;
  scrollToBottom: () => void;
  setUserInput: (value: string) => void;
  setAutoScroll: (value: boolean) => void;
}

let global_ctx: DESIGN_GLOBAL_CONTEXT | null = null;

window[WEBVIEW_FUNCTIONS.update_global_ctx] = (ctx: DESIGN_GLOBAL_CONTEXT) => {
  global_ctx = ctx;
};

window.onfocus = () => {
  fire_kicad_desktop_cmd({
    type: KICAD_DESKTOP_CMD_TYPE.update_global_context,
  });
};

export function InputBox({
  inputRef,
  userInput,
  scrollToBottom,
  setUserInput,
  setAutoScroll,
}: InputBoxProps) {
  const chatStore = useChatStore();
  const [refs, setRefs] = useState(new Set<BUILTIN_REFERENCE>());
  const [attachedItems, setAttachedItems] = useState<AttachmentItem[]>([]);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState<{
    x: number;
    y: number;
  }>();
  const [attachImages, setAttachImages] = useState<string[]>([]);
  const isMobileScreen = useMobileScreen();

  const process_cmd = async (cmd: CHAT_CMD) => {
    const userMessage: ChatMessage = createMessage({
      role: "user",
      content:
        cmd.type !== CMD_TYPE.GENERIC_CHAT
          ? READABLE_CMD[cmd.type]
          : cmd.context.chat.input_text,
      isMcpResponse: false,
    });

    const botMessage: ChatMessage = createMessage({
      role: "assistant",
      streaming: true,
      model: ASSISTANT_NAME,
    });

    const session = chatStore.currentSession();
    chatStore.updateTargetSession(session, (session) => {
      const savedUserMessage = {
        ...userMessage,
      };
      session.messages = session.messages.concat([
        savedUserMessage,
        botMessage,
      ]);
    });

    websocketClient.send_cmd(cmd, {
      onFinish: () => {
        botMessage.streaming = false;
        ChatControllerPool.remove(session.id, botMessage.id);
      },
      onUpdate: (message: string) => {
        botMessage.streaming = true;
        botMessage.content = message;
        chatStore.updateTargetSession(session, (session) => {
          session.messages = session.messages.concat();
        });
      },
    });
  };

  useEffect(() => {
    window[WEBVIEW_FUNCTIONS.fire_copilot_cmd] = (cmd: CONTEXT_MENU_CMD) => {
      navigate(Path.Chat);
      process_cmd(cmd);
    };
  }, []);

  const onInput = (text: string) => {
    setUserInput(text);

    if (!inputRef.current) return;

    const cursorPosition = inputRef.current.selectionStart || 0;
    const lastChar = text[cursorPosition - 1] || ""; // Current cursor character

    if (lastChar === "@") {
      const editorRect = inputRef.current.getBoundingClientRect();
      const menuWidth = 400; // Approximate width of the context menu

      // Create a hidden span to measure the text width before "@"
      const tempSpan = document.createElement("span");
      tempSpan.style.visibility = "hidden";
      tempSpan.style.whiteSpace = "pre";
      tempSpan.style.font = getComputedStyle(inputRef.current).font;
      tempSpan.textContent = text.slice(0, cursorPosition);
      document.body.appendChild(tempSpan);

      const textWidth = tempSpan.offsetWidth;
      document.body.removeChild(tempSpan);

      let x = editorRect.left + textWidth + 8; // Aligns slightly right of "@"
      let y = editorRect.top + inputRef.current.scrollHeight - 5; // Positions below text input

      // Prevent menu from overflowing the viewport
      if (x + menuWidth > window.innerWidth) {
        x = window.innerWidth - menuWidth - 10;
      }

      // Ensure a minimum margin
      x = Math.max(10, x);
      y = Math.min(y, window.innerHeight - 50); // Prevents bottom overflow

      setContextMenuPosition({ x, y });
      setShowContextMenu(true);
      setSearchTerm("");
    } else if (!text.includes("@")) {
      setShowContextMenu(false);
    }
  };

  const doSubmit = () => {
    if (userInput.trim() === "" && isEmpty(attachImages)) return;

    process_cmd({
      type: CMD_TYPE.GENERIC_CHAT,
      context: {
        chat: {
          input_text: userInput,
          options: {
            builtin_refs: [...refs],
          },
        },
      },
      global_context_uuid: global_ctx?.uuid || undefined,
      design_global_context: global_ctx ?? undefined,
    });

    setAttachImages([]);
    chatStore.setLastInput(userInput);
    setUserInput("");
    if (!isMobileScreen) inputRef.current?.focus();
    setAutoScroll(true);
  };

  const autoFocus = !isMobileScreen; // wont auto focus on mobile screen
  const { submitKey, shouldSubmit } = useSubmitHandler();
  const [searchTerm, setSearchTerm] = useState("");
  const config = useAppConfig();
  // auto grow input
  const [inputRows, setInputRows] = useState(2);
  const measure = useDebouncedCallback(
    () => {
      const rows = inputRef.current ? autoGrowTextArea(inputRef.current) : 1;
      const inputRows = Math.min(
        20,
        Math.max(2 + Number(!isMobileScreen), rows),
      );
      setInputRows(inputRows);
    },
    100,
    {
      leading: true,
      trailing: true,
    },
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(measure, [userInput]);
  const navigate = useNavigate();

  const handleFileSelect = (file: File) => {
    setAttachedItems([
      ...attachedItems,
      {
        type: AttachmentType.FILE,
        data: file,
      },
    ]);
  };

  const removeAttachedItem = (index: number) => {
    const it = attachedItems[index];
    switch (it.type) {
      case AttachmentType.FILE:
        break;
      case AttachmentType.CONTEXT_OPTION: {
        const it = attachedItems[index] as ContextAttachmentItem;
        setRefs(new Set([...refs].filter((r) => r !== it.data.opt)));
        break;
      }
    }

    const newItems = [...attachedItems];
    newItems.splice(index, 1);
    setAttachedItems(newItems);
  };

  const handleContextSelect = (item: ContextMenuItem) => {
    switch (item.type) {
      case "option": {
        const it = item.opt;
        if (!refs.has(it)) {
          setRefs(new Set([...refs, it]));
          setAttachedItems([
            ...attachedItems,
            {
              type: AttachmentType.CONTEXT_OPTION,
              data: {
                opt: it,
                name: item.name,
              },
              icon: item.icon,
            },
          ]);
        }
        break;
      }
    }

    // Remove "@" from the editor
    if (inputRef.current && showContextMenu)
      setUserInput(userInput.slice(0, -1));

    // Close context menu and restore editor focus
    setShowContextMenu(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // check if should send message
  const onInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // if ArrowUp and no userInput, fill with last input
    if (
      e.key === "ArrowUp" &&
      userInput.length <= 0 &&
      !(e.metaKey || e.altKey || e.ctrlKey)
    ) {
      setUserInput(chatStore.lastInput ?? "");
      e.preventDefault();
      return;
    }
    if (shouldSubmit(e)) {
      doSubmit();
      e.preventDefault();
    }

    if (showContextMenu) {
      setShowContextMenu(false);
    }
  };

  const onCtxMenuClose = (event?: React.KeyboardEvent<HTMLDivElement>) => {
    setTimeout(() => {
      inputRef.current?.focus();
      if (event) {
        inputRef.current?.dispatchEvent(event.nativeEvent);
      }
    }, 0);
  };

  return (
    <div className={styles["chat-input-panel"]}>
      <div className={styles["full-input-box"]}>
        <div className={styles["input-header"]}>
          <div className={styles["attached-files"]}>
            <SelectContextButton onContextSelect={handleContextSelect} />
            {attachedItems.map((item, index) => (
              <div key={index} className={styles["file-pill"]}>
                <span>{item.data.name}</span>
                <button
                  onClick={() => removeAttachedItem(index)}
                  className={styles["remove-file"]}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
        <textarea
          id="chat-input"
          ref={inputRef}
          className={styles["chat-input"]}
          placeholder={Locale.Chat.Input(submitKey)}
          onInput={(e) => onInput(e.currentTarget.value)}
          value={userInput}
          onKeyDown={onInputKeyDown}
          onFocus={scrollToBottom}
          onClick={scrollToBottom}
          rows={inputRows}
          autoFocus={autoFocus}
          style={{
            fontSize: config.fontSize,
            fontFamily: config.fontFamily,
          }}
        />
        {showContextMenu && contextMenuPosition && (
          <ContextMenu
            onSelect={(item) => {
              handleContextSelect(item);
              setShowContextMenu(false);
            }}
            onClose={() => {
              setShowContextMenu(false);
              onCtxMenuClose();
            }}
            position={contextMenuPosition}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            anchorPoint="bottom"
            showSearch={false}
          />
        )}
        <div className={styles["input-footer"]}>
          <div className={styles["action-buttons"]}>
            <SelectAttachmentButton onFileSelect={handleFileSelect} />
            <SendButton onClick={doSubmit} />
          </div>
        </div>
      </div>
    </div>
  );
}
