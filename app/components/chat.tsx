import clsx from "clsx";
import {
  useState,
  useRef,
  useMemo,
  useEffect,
  Fragment,
  useCallback,
  RefObject,
} from "react";
import { useNavigate } from "react-router-dom";
import { MultimodalContent } from "../client/api";
import {
  autoGrowTextArea,
  copyToClipboard,
  getMessageImages,
  getMessageTextContent,
  useMobileScreen,
} from "../utils";
import EditIcon from "../icons/rename.svg";
import CopyIcon from "../icons/copy.svg";
import LoadingButtonIcon from "../icons/loading.svg";
import DeleteIcon from "../icons/clear.svg";
import PinIcon from "../icons/pin.svg";
import ConfirmIcon from "../icons/confirm.svg";
import CloseIcon from "../icons/close.svg";

import StopIcon from "../icons/pause.svg";
import { ChatControllerPool } from "../client/controller";
import { Path, REQUEST_TIMEOUT_MS, CHAT_PAGE_SIZE } from "../constant";
import {
  CHAT_CMD,
  CMD_TYPE,
  CONTEXT_MENU_CMD,
  GENERIC_CHAT_CMD,
  READABLE_CMD,
} from "../kicad";
import { WEBVIEW_FUNCTIONS, ASSISTANT_NAME } from "../kicad/constant";
import {
  ChatMessage,
  useChatStore,
  useAppConfig,
  createMessage,
} from "../store";
import { prettyObject } from "../utils/format";
import { websocketClient } from "../websocket";
import { IconButton } from "./button";
import {
  ChatAction,
  EditMessageModal,
  ShortcutKeyModal,
  ClearContextDivider,
} from "./chat-components";
export { ChatAction };
import { Avatar } from "./emoji";
import { ExportMessageModal } from "./exporter";
import { Markdown } from "./markdown";
import { MaskAvatar } from "./mask";
import { RealtimeChat } from "./realtime-chat";
import { showToast, showPrompt } from "./ui-lib";
import Locale from "../locales";
import styles from "./chat.module.scss";
import { WelcomePage } from "./welcome-page";
import { InputBox } from "./input-box";

function useScrollToBottom(
  scrollRef: RefObject<HTMLDivElement>,
  messages: ChatMessage[],
) {
  // for auto-scroll
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollDomToBottom = useCallback(() => {
    const dom = scrollRef.current;
    if (dom) {
      requestAnimationFrame(() => {
        setAutoScroll(true);
        dom.scrollTo(0, dom.scrollHeight);
      });
    }
  }, [scrollRef]);

  // auto scroll
  useEffect(() => {
    if (autoScroll) {
      scrollDomToBottom();
    }
  });

  // auto scroll when messages length changes
  const lastMessagesLength = useRef(messages.length);
  useEffect(() => {
    if (messages.length > lastMessagesLength.current) {
      scrollDomToBottom();
    }
    lastMessagesLength.current = messages.length;
  }, [messages.length, scrollDomToBottom]);

  return {
    scrollRef,
    autoScroll,
    setAutoScroll,
    scrollDomToBottom,
  };
}

function _Chat() {
  type RenderMessage = ChatMessage & { preview?: boolean };

  const chatStore = useChatStore();
  const session = chatStore.currentSession();
  const config = useAppConfig();
  const fontSize = config.fontSize;
  const fontFamily = config.fontFamily;
  const [showExport, setShowExport] = useState(false);

  const [userInput] = useState("");
  const [isLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // if user is typing, should auto scroll to bottom
  // if user is not typing, should auto scroll to bottom only if already at bottom
  const { setAutoScroll, scrollDomToBottom } = useScrollToBottom(
    scrollRef,
    session.messages,
  );
  const [, setHitBottom] = useState(true);
  const isMobileScreen = useMobileScreen();
  const navigate = useNavigate();
  // stop response
  const onUserStop = (messageId: string) => {
    ChatControllerPool.stop(session.id, messageId);
  };

  // auto grow input
  // autoGrowTextArea

  useEffect(() => {
    chatStore.updateTargetSession(session, (session) => {
      const stopTiming = Date.now() - REQUEST_TIMEOUT_MS;
      session.messages.forEach((m) => {
        // check if should stop all stale messages
        if (m.isError || new Date(m.date).getTime() < stopTiming) {
          if (m.streaming) {
            m.streaming = false;
          }

          if (m.content.length === 0) {
            m.isError = true;
            m.content = prettyObject({
              error: true,
              message: "empty response",
            });
          }
        }
      });

      // auto sync mask config from global config
      if (session.mask.syncGlobalConfig) {
        console.log("[Mask] syncing from global, name = ", session.mask.name);
        session.mask.modelConfig = { ...config.modelConfig };
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const deleteMessage = (msgId?: string) => {
    chatStore.updateTargetSession(
      session,
      (session) =>
        (session.messages = session.messages.filter((m) => m.id !== msgId)),
    );
  };

  const onDelete = (msgId: string) => {
    deleteMessage(msgId);
  };

  const onPinMessage = (message: ChatMessage) => {
    chatStore.updateTargetSession(session, (session) =>
      session.mask.context.push(message),
    );

    showToast(Locale.Chat.Actions.PinToastContent, {
      text: Locale.Chat.Actions.PinToastAction,
      onClick: () => {
        setShowPromptModal(true);
      },
    });
  };

  const context: RenderMessage[] = useMemo(() => {
    return session.mask.hideContext ? [] : session.mask.context.slice();
  }, [session.mask.context, session.mask.hideContext]);

  // preview messages
  const renderMessages = useMemo(() => {
    return context.concat(session.messages as RenderMessage[]).concat(
      isLoading
        ? [
            {
              ...createMessage({
                role: "assistant",
                content: "……",
              }),
              preview: true,
            },
          ]
        : [],
    );
  }, [config.sendPreviewBubble, context, isLoading, session.messages]);

  const [msgRenderIndex, _setMsgRenderIndex] = useState(
    Math.max(0, renderMessages.length - CHAT_PAGE_SIZE),
  );

  function setMsgRenderIndex(newIndex: number) {
    newIndex = Math.min(renderMessages.length - CHAT_PAGE_SIZE, newIndex);
    newIndex = Math.max(0, newIndex);
    _setMsgRenderIndex(newIndex);
  }

  const messages = useMemo(() => {
    const endRenderIndex = Math.min(
      msgRenderIndex + 3 * CHAT_PAGE_SIZE,
      renderMessages.length,
    );
    return renderMessages.slice(msgRenderIndex, endRenderIndex);
  }, [msgRenderIndex, renderMessages]);

  const onChatBodyScroll = (e: HTMLElement) => {
    const bottomHeight = e.scrollTop + e.clientHeight;
    const edgeThreshold = e.clientHeight;

    const isTouchTopEdge = e.scrollTop <= edgeThreshold;
    const isTouchBottomEdge = bottomHeight >= e.scrollHeight - edgeThreshold;
    const isHitBottom =
      bottomHeight >= e.scrollHeight - (isMobileScreen ? 4 : 10);

    const prevPageMsgIndex = msgRenderIndex - CHAT_PAGE_SIZE;
    const nextPageMsgIndex = msgRenderIndex + CHAT_PAGE_SIZE;

    if (isTouchTopEdge && !isTouchBottomEdge) {
      setMsgRenderIndex(prevPageMsgIndex);
    } else if (isTouchBottomEdge) {
      setMsgRenderIndex(nextPageMsgIndex);
    }

    setHitBottom(isHitBottom);
    setAutoScroll(isHitBottom);
  };

  function scrollToBottom() {
    setMsgRenderIndex(renderMessages.length - CHAT_PAGE_SIZE);
    scrollDomToBottom();
  }

  // clear context index = context length + index in messages
  const clearContextIndex =
    (session.clearContextIndex ?? -1) >= 0
      ? session.clearContextIndex! + context.length - msgRenderIndex
      : -1;

  const [, setShowPromptModal] = useState(false);

  // edit / insert message modal
  const [isEditingMessage, setIsEditingMessage] = useState(false);

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

  // remember unfinished input
  useEffect(() => {
    window[WEBVIEW_FUNCTIONS.fire_copilot_cmd] = (cmd: CONTEXT_MENU_CMD) => {
      navigate(Path.Chat);
      process_cmd(cmd);
    };
  }, []);

  // 快捷键 shortcut keys
  const [showShortcutKeyModal, setShowShortcutKeyModal] = useState(false);

  const [showChatSidePanel, setShowChatSidePanel] = useState(false);
  const hasMessages = session.messages.length > 0;

  return (
    <>
      <div className={styles.chat} key={session.id}>
        <div className={styles["chat-main"]}>
          <div className={styles["chat-body-container"]}>
            {hasMessages ? (
              <div
                className={styles["chat-body"]}
                ref={scrollRef}
                onScroll={(e) => onChatBodyScroll(e.currentTarget)}
              >
                {messages
                  // TODO
                  // .filter((m) => !m.isMcpResponse)
                  .map((message, i) => {
                    const isUser = message.role === "user";
                    const isContext = i < context.length;
                    const showActions =
                      i > 0 &&
                      !(message.preview || message.content.length === 0) &&
                      !isContext;
                    const showTyping = message.preview || message.streaming;

                    const shouldShowClearContextDivider =
                      i === clearContextIndex - 1;

                    return (
                      <Fragment key={message.id}>
                        <div
                          className={
                            isUser
                              ? styles["chat-message-user"]
                              : styles["chat-message"]
                          }
                        >
                          <div className={styles["chat-message-container"]}>
                            <div className={styles["chat-message-header"]}>
                              <div className={styles["chat-message-avatar"]}>
                                <div className={styles["chat-message-edit"]}>
                                  <IconButton
                                    icon={<EditIcon />}
                                    aria={Locale.Chat.Actions.Edit}
                                    onClick={async () => {
                                      const newMessage = await showPrompt(
                                        Locale.Chat.Actions.Edit,
                                        getMessageTextContent(message),
                                        10,
                                      );
                                      let newContent:
                                        | string
                                        | MultimodalContent[] = newMessage;
                                      const images = getMessageImages(message);
                                      if (images.length > 0) {
                                        newContent = [
                                          { type: "text", text: newMessage },
                                        ];
                                        for (
                                          let i = 0;
                                          i < images.length;
                                          i++
                                        ) {
                                          newContent.push({
                                            type: "image_url",
                                            image_url: {
                                              url: images[i],
                                            },
                                          });
                                        }
                                      }
                                      chatStore.updateTargetSession(
                                        session,
                                        (session) => {
                                          const m = session.mask.context
                                            .concat(session.messages)
                                            .find((m) => m.id === message.id);
                                          if (m) {
                                            m.content = newContent;
                                          }
                                        },
                                      );
                                    }}
                                  ></IconButton>
                                </div>
                                {isUser ? (
                                  <Avatar avatar={config.avatar} />
                                ) : (
                                  <>
                                    {["system"].includes(message.role) ? (
                                      <Avatar avatar="2699-fe0f" />
                                    ) : (
                                      <MaskAvatar
                                        avatar={session.mask.avatar}
                                        model={
                                          message.model ||
                                          session.mask.modelConfig.model
                                        }
                                      />
                                    )}
                                  </>
                                )}
                              </div>
                              {!isUser && (
                                <div className={styles["chat-model-name"]}>
                                  {message.model}
                                </div>
                              )}

                              {showActions && (
                                <div className={styles["chat-message-actions"]}>
                                  <div className={styles["chat-input-actions"]}>
                                    {message.streaming ? (
                                      <ChatAction
                                        text={Locale.Chat.Actions.Stop}
                                        icon={<StopIcon />}
                                        onClick={() =>
                                          onUserStop(message.id ?? i)
                                        }
                                      />
                                    ) : (
                                      <>
                                        <ChatAction
                                          text={Locale.Chat.Actions.Delete}
                                          icon={<DeleteIcon />}
                                          onClick={() =>
                                            onDelete(message.id ?? i)
                                          }
                                        />

                                        <ChatAction
                                          text={Locale.Chat.Actions.Pin}
                                          icon={<PinIcon />}
                                          onClick={() => onPinMessage(message)}
                                        />
                                        <ChatAction
                                          text={Locale.Chat.Actions.Copy}
                                          icon={<CopyIcon />}
                                          onClick={() =>
                                            copyToClipboard(
                                              getMessageTextContent(message),
                                            )
                                          }
                                        />
                                      </>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            {message?.tools?.length == 0 && showTyping && (
                              <div className={styles["chat-message-status"]}>
                                {Locale.Chat.Typing}
                              </div>
                            )}
                            {/*@ts-ignore*/}
                            {message?.tools?.length > 0 && (
                              <div className={styles["chat-message-tools"]}>
                                {message?.tools?.map((tool) => (
                                  <div
                                    key={tool.id}
                                    title={tool?.errorMsg}
                                    className={styles["chat-message-tool"]}
                                  >
                                    {tool.isError === false ? (
                                      <ConfirmIcon />
                                    ) : tool.isError === true ? (
                                      <CloseIcon />
                                    ) : (
                                      <LoadingButtonIcon />
                                    )}
                                    <span>{tool?.function?.name}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className={styles["chat-message-item"]}>
                              <Markdown
                                key={message.streaming ? "loading" : "done"}
                                content={getMessageTextContent(message)}
                                loading={
                                  (message.preview || message.streaming) &&
                                  message.content.length === 0 &&
                                  !isUser
                                }
                                fontSize={fontSize}
                                fontFamily={fontFamily}
                                parentRef={scrollRef}
                                defaultShow={i >= messages.length - 6}
                              />
                              {getMessageImages(message).length == 1 && (
                                <img
                                  className={styles["chat-message-item-image"]}
                                  src={getMessageImages(message)[0]}
                                  alt=""
                                />
                              )}
                              {getMessageImages(message).length > 1 && (
                                <div
                                  className={styles["chat-message-item-images"]}
                                  style={
                                    {
                                      "--image-count":
                                        getMessageImages(message).length,
                                    } as React.CSSProperties
                                  }
                                >
                                  {getMessageImages(message).map(
                                    (image, index) => {
                                      return (
                                        <img
                                          className={
                                            styles[
                                              "chat-message-item-image-multi"
                                            ]
                                          }
                                          key={index}
                                          src={image}
                                          alt=""
                                        />
                                      );
                                    },
                                  )}
                                </div>
                              )}
                            </div>
                            {message?.audio_url && (
                              <div className={styles["chat-message-audio"]}>
                                <audio src={message.audio_url} controls />
                              </div>
                            )}

                            <div className={styles["chat-message-action-date"]}>
                              {isContext
                                ? Locale.Chat.IsContext
                                : message.date.toLocaleString()}
                            </div>
                          </div>
                        </div>
                        {shouldShowClearContextDivider && (
                          <ClearContextDivider />
                        )}
                      </Fragment>
                    );
                  })}
              </div>
            ) : (
              <WelcomePage />
            )}
            <div className={styles["chat-input-panel-container"]}>
              <InputBox
                onSend={(cmd: GENERIC_CHAT_CMD) => {
                  const text = cmd.context.chat.input_text;
                  if (text.trim() === "") return;
                  process_cmd(cmd);
                }}
                value={userInput}
                onFocus={scrollToBottom}
                onClick={scrollToBottom}
              />
            </div>
          </div>
          <div
            className={clsx(styles["chat-side-panel"], {
              [styles["mobile"]]: isMobileScreen,
              [styles["chat-side-panel-show"]]: showChatSidePanel,
            })}
          >
            {showChatSidePanel && (
              <RealtimeChat
                onClose={() => {
                  setShowChatSidePanel(false);
                }}
                onStartVoice={async () => {
                  console.log("start voice");
                }}
              />
            )}
          </div>
        </div>
      </div>
      {showExport && (
        <ExportMessageModal onClose={() => setShowExport(false)} />
      )}

      {isEditingMessage && (
        <EditMessageModal
          onClose={() => {
            setIsEditingMessage(false);
          }}
        />
      )}

      {showShortcutKeyModal && (
        <ShortcutKeyModal onClose={() => setShowShortcutKeyModal(false)} />
      )}
    </>
  );
}

let IS_FIRST_LOAD = true;

export function Chat() {
  const chatStore = useChatStore();

  if (IS_FIRST_LOAD) {
    IS_FIRST_LOAD = false;
    chatStore.newSession();
  }

  const session = chatStore.currentSession();
  const navigate = useNavigate();

  window[WEBVIEW_FUNCTIONS.new_session] = () => {
    chatStore.newSession();
    navigate(Path.Chat);
    return chatStore.currentSession().id;
  };

  window[WEBVIEW_FUNCTIONS.get_current_session_id] = () => {
    return chatStore.currentSession().id;
  };

  window[WEBVIEW_FUNCTIONS.get_current_session_id] = () => {
    return chatStore.currentSession().id;
  };

  return <_Chat key={session.id}></_Chat>;
}
