import { useState, useEffect, useRef } from "react";
import Locale from "../../locales";
import styles from "./input-box.module.scss";
import { SendButton } from "./send-button";
import { SelectAttachmentButton } from "./select-attachment-button";
import { SelectContextButton } from "./select-context-button";
import { ContextMenu, ContextMenuItem } from "./context-menu";
import { AttachmentItem, AttachmentType } from "./context-attachment";
import {
  BUILTIN_REFERENCE,
  CHAT_CMD,
  CMD_TYPE,
  CONTEXT_MENU_CMD,
  GENERIC_CHAT_CMD,
  get_readable_cmd,
} from "../../copilot";
import { ASSISTANT_NAME, WEBVIEW_FUNCTIONS } from "../../copilot/constant";
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
import { chatGlobalContext } from "./chat-global-context";
import { highlight_symbol } from "@/app/copilot/passive_action/agent/highlight_symbol";

interface InputBoxProps {
  inputRef: React.RefObject<HTMLTextAreaElement>;
  userInput: string;
  scrollToBottom: () => void;
  setUserInput: (value: string) => void;
  setAutoScroll: (value: boolean) => void;
}

export function InputBox({
  inputRef,
  userInput,
  scrollToBottom,
  setUserInput,
  setAutoScroll,
}: InputBoxProps) {
  const chatStore = useChatStore();
  const [ctx_ref, set_ctx_ref] = useState(BUILTIN_REFERENCE.INVALID);
  const CurrentBotMsg = useRef<ChatMessage>();
  const [attachedItems, setAttachedItems] = useState<AttachmentItem[]>([]);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [designator, setDesignator] = useState<string>("");
  const [contextMenuPosition, setContextMenuPosition] = useState<{
    x: number;
    y: number;
  }>();
  const [attachImages, setAttachImages] = useState<string[]>([]);
  const isMobileScreen = useMobileScreen();

  const process_cmd = async (cmd: CHAT_CMD) => {
    const session = chatStore.currentSession();

    if (!cmd.triggered_by_passive_action) {
      const botMessage: ChatMessage = createMessage({
        role: "assistant",
        streaming: true,
        model: ASSISTANT_NAME,
      });
      CurrentBotMsg.current = botMessage;

      const userMessage: ChatMessage = createMessage({
        role: "user",
        content: (() => {
          const r = get_readable_cmd(cmd.type);
          if (r) return r;
          return (cmd as GENERIC_CHAT_CMD).context.chat.input_text;
        })(),
        isMcpResponse: false,
      });

      chatStore.updateTargetSession(session, (session) => {
        const savedUserMessage = {
          ...userMessage,
        };
        session.messages = session.messages.concat([
          savedUserMessage,
          botMessage,
        ]);
      });
    }

    websocketClient.send_cmd(cmd, {
      onFinish: () => {
        CurrentBotMsg.current!.streaming = false;
        ChatControllerPool.remove(session.id, CurrentBotMsg.current!.id);
      },
      onUpdate: (message: string) => {
        CurrentBotMsg.current!.streaming = true;
        CurrentBotMsg.current!.content = message;
        chatStore.updateTargetSession(session, (session) => {
          session.messages = session.messages.concat();
        });
      },
    });
  };

  useEffect(() => {
    window[WEBVIEW_FUNCTIONS.fire_host_active_cmd] = (
      cmd: CONTEXT_MENU_CMD,
    ) => {
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
    if (userInput.trim().length === 0 && isEmpty(attachImages)) return;

    const global_ctx_ref = {
      global_context_uuid: chatGlobalContext.global_ctx?.uuid || undefined,
      design_global_context: chatGlobalContext.global_ctx ?? undefined,
    };
    const triggered_by_passive_action = false;
    switch (ctx_ref) {
      case BUILTIN_REFERENCE.INVALID:
        process_cmd({
          type: CMD_TYPE.GENERIC_CHAT,
          context: {
            chat: {
              input_text: userInput,
            },
          },
          ...global_ctx_ref,
          triggered_by_passive_action,
        });
        break;
      case BUILTIN_REFERENCE.COMPONENT:
        process_cmd({
          type: CMD_TYPE.USR_CHAT_WITH_COMPONENT,
          context: {
            chat: {
              input_text: userInput,
            },
            designator,
          },
          ...global_ctx_ref,
          triggered_by_passive_action,
        });
        break;
      case BUILTIN_REFERENCE.PROJECT:
        process_cmd({
          type: CMD_TYPE.USR_CHAT_WITH_DESIGN,
          context: {
            chat: {
              input_text: userInput,
            },
          },
          ...global_ctx_ref,
          triggered_by_passive_action,
        });
        break;
    }

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
      case AttachmentType.CONTEXT_OPTION:
        set_ctx_ref(BUILTIN_REFERENCE.INVALID);
        break;
    }

    const newItems = [...attachedItems];
    newItems.splice(index, 1);
    setAttachedItems(newItems);
  };

  const handleContextSelect = (item: ContextMenuItem) => {
    switch (item.type) {
      case "option": {
        const it = item.opt;
        set_ctx_ref(it);

        if (it === BUILTIN_REFERENCE.COMPONENT) {
          const designator = item.name;
          setDesignator(designator);
          highlight_symbol(designator);
        }

        const newItems = attachedItems.filter(
          (it) => it.type !== AttachmentType.CONTEXT_OPTION,
        );
        setAttachedItems([
          ...newItems,
          {
            type: AttachmentType.CONTEXT_OPTION,
            data: {
              opt: it,
              name: item.name,
            },
            icon: item.icon,
          },
        ]);

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
