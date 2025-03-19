import { useDebouncedCallback } from "use-debounce";
import React, {
  Fragment,
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import CopyIcon from "../icons/copy.svg";
import LoadingIcon from "../icons/three-dots.svg";
import LoadingButtonIcon from "../icons/loading.svg";
import DeleteIcon from "../icons/clear.svg";
import PinIcon from "../icons/pin.svg";
import ConfirmIcon from "../icons/confirm.svg";
import CloseIcon from "../icons/close.svg";

import StopIcon from "../icons/pause.svg";
import {
  ChatMessage,
  createMessage,
  SubmitKey,
  useAppConfig,
  useChatStore,
} from "../store";

import {
  autoGrowTextArea,
  copyToClipboard,
  getMessageImages,
  getMessageTextContent,
  safeLocalStorage,
  useMobileScreen,
} from "../utils";

import dynamic from "next/dynamic";

import { ChatControllerPool } from "../client/controller";
import Locale from "../locales";

import styles from "./chat.module.scss";

import { useNavigate } from "react-router-dom";
import {
  CHAT_PAGE_SIZE,
  Path,
  REQUEST_TIMEOUT_MS,
  UNFINISHED_INPUT,
} from "../constant";
import { Avatar } from "./emoji";
import { MaskAvatar } from "./mask";
import { ChatCommandPrefix } from "../command";
import { prettyObject } from "../utils/format";

import { isEmpty } from "lodash-es";
import { RealtimeChat } from "@/app/components/realtime-chat";
import clsx from "clsx";
import { CONTEXT_MENU_CMD, READABLE_CMD } from "../kicad";
import { ASSISTANT_NAME, WEBVIEW_FUNCTIONS } from "../kicad/constant";
import { websocketClient } from "../websocket";

const localStorage = safeLocalStorage();

const Markdown = dynamic(async () => (await import("./markdown")).Markdown, {
  loading: () => <LoadingIcon />,
});

function useSubmitHandler() {
  const config = useAppConfig();
  const submitKey = config.submitKey;
  const isComposing = useRef(false);

  useEffect(() => {
    const onCompositionStart = () => {
      isComposing.current = true;
    };
    const onCompositionEnd = () => {
      isComposing.current = false;
    };

    window.addEventListener("compositionstart", onCompositionStart);
    window.addEventListener("compositionend", onCompositionEnd);

    return () => {
      window.removeEventListener("compositionstart", onCompositionStart);
      window.removeEventListener("compositionend", onCompositionEnd);
    };
  }, []);

  const shouldSubmit = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Fix Chinese input method "Enter" on Safari
    if (e.keyCode == 229) return false;
    if (e.key !== "Enter") return false;
    if (e.key === "Enter" && (e.nativeEvent.isComposing || isComposing.current))
      return false;
    return (
      (config.submitKey === SubmitKey.AltEnter && e.altKey) ||
      (config.submitKey === SubmitKey.CtrlEnter && e.ctrlKey) ||
      (config.submitKey === SubmitKey.ShiftEnter && e.shiftKey) ||
      (config.submitKey === SubmitKey.MetaEnter && e.metaKey) ||
      (config.submitKey === SubmitKey.Enter &&
        !e.altKey &&
        !e.ctrlKey &&
        !e.shiftKey &&
        !e.metaKey)
    );
  };

  return {
    submitKey,
    shouldSubmit,
  };
}

export function ChatAction(props: {
  text: string;
  icon: JSX.Element;
  onClick: () => void;
}) {
  const iconRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState({
    full: 16,
    icon: 16,
  });

  function updateWidth() {
    if (!iconRef.current || !textRef.current) return;
    const getWidth = (dom: HTMLDivElement) => dom.getBoundingClientRect().width;
    const textWidth = getWidth(textRef.current);
    const iconWidth = getWidth(iconRef.current);
    setWidth({
      full: textWidth + iconWidth,
      icon: iconWidth,
    });
  }

  return (
    <div
      className={clsx(styles["chat-input-action"], "clickable")}
      onClick={() => {
        props.onClick();
        setTimeout(updateWidth, 1);
      }}
      onMouseEnter={updateWidth}
      onTouchStart={updateWidth}
      style={
        {
          "--icon-width": `${width.icon}px`,
          "--full-width": `${width.full}px`,
        } as React.CSSProperties
      }
    >
      <div ref={iconRef} className={styles["icon"]}>
        {props.icon}
      </div>
      <div className={styles["text"]} ref={textRef}>
        {props.text}
      </div>
    </div>
  );
}

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

export function DeleteImageButton(props: { deleteImage: () => void }) {
  return (
    <div className={styles["delete-image"]} onClick={props.deleteImage}>
      <DeleteIcon />
    </div>
  );
}

function _Chat() {
  type RenderMessage = ChatMessage & { preview?: boolean };

  const chatStore = useChatStore();
  const session = chatStore.currentSession();
  const config = useAppConfig();
  const fontSize = config.fontSize;
  const fontFamily = config.fontFamily;

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { submitKey, shouldSubmit } = useSubmitHandler();
  const scrollRef = useRef<HTMLDivElement>(null);

  // if user is typing, should auto scroll to bottom
  // if user is not typing, should auto scroll to bottom only if already at bottom
  const { setAutoScroll, scrollDomToBottom } = useScrollToBottom(
    scrollRef,
    session.messages,
  );
  const [hitBottom, setHitBottom] = useState(true);
  const isMobileScreen = useMobileScreen();
  const navigate = useNavigate();
  const [attachImages, setAttachImages] = useState<string[]>([]);

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

  const doSubmit = (userInput: string) => {
    if (userInput.trim() === "" && isEmpty(attachImages)) return;

    setIsLoading(true);
    chatStore
      .onUserInput(userInput, attachImages)
      .then(() => setIsLoading(false));
    setAttachImages([]);
    chatStore.setLastInput(userInput);
    setUserInput("");
    if (!isMobileScreen) inputRef.current?.focus();
    setAutoScroll(true);
  };

  // stop response
  const onUserStop = (messageId: string) => {
    ChatControllerPool.stop(session.id, messageId);
  };

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
      doSubmit(userInput);
      e.preventDefault();
    }
  };

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

  const onInput = (text: string) => {
    setUserInput(text);
    const n = text.trim().length;

    // clear search results
    if (n === 0) {
    } else if (text.match(ChatCommandPrefix)) {
    }
  };

  const onPinMessage = (message: ChatMessage) => {
    chatStore.updateTargetSession(session, (session) =>
      session.mask.context.push(message),
    );
  };

  const context: RenderMessage[] = useMemo(() => {
    return session.mask.hideContext ? [] : session.mask.context.slice();
  }, [session.mask.context, session.mask.hideContext]);

  // preview messages
  const renderMessages = useMemo(() => {
    return context
      .concat(session.messages as RenderMessage[])
      .concat(
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
      )
      .concat(
        userInput.length > 0 && config.sendPreviewBubble
          ? [
              {
                ...createMessage({
                  role: "user",
                  content: userInput,
                }),
                preview: true,
              },
            ]
          : [],
      );
  }, [
    config.sendPreviewBubble,
    context,
    isLoading,
    session.messages,
    userInput,
  ]);

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

  const autoFocus = !isMobileScreen; // wont auto focus on mobile screen

  // remember unfinished input
  useEffect(() => {
    // try to load from local storage
    const key = UNFINISHED_INPUT(session.id);
    const mayBeUnfinishedInput = localStorage.getItem(key);
    if (mayBeUnfinishedInput && userInput.length === 0) {
      setUserInput(mayBeUnfinishedInput);
      localStorage.removeItem(key);
    }
    const dom = inputRef.current;

    window[WEBVIEW_FUNCTIONS.fire_copilot_cmd] = (cmd: CONTEXT_MENU_CMD) => {
      navigate(Path.Chat);

      const userMessage: ChatMessage = createMessage({
        role: "user",
        content: READABLE_CMD[cmd.type],
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

    return () => {
      localStorage.setItem(key, dom?.value ?? "");
    };
  }, []);

  const [showChatSidePanel, setShowChatSidePanel] = useState(false);

  return (
    <>
      <div className={styles.chat} key={session.id}>
        <div className={styles["chat-main"]}>
          <div className={styles["chat-body-container"]}>
            <div
              className={styles["chat-body"]}
              ref={scrollRef}
              onScroll={(e) => onChatBodyScroll(e.currentTarget)}
              onMouseDown={() => inputRef.current?.blur()}
              onTouchStart={() => {
                inputRef.current?.blur();
                setAutoScroll(false);
              }}
            >
              {messages
                // TODO
                .map((message, i) => {
                  const isUser = message.role === "user";
                  const isContext = i < context.length;
                  const showActions =
                    i > 0 &&
                    !(message.preview || message.content.length === 0) &&
                    !isContext;
                  const showTyping = message.preview || message.streaming;

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
                              //   onContextMenu={(e) => onRightClick(e, message)} // hard to use
                              onDoubleClickCapture={() => {
                                if (!isMobileScreen) return;
                                setUserInput(getMessageTextContent(message));
                              }}
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
                    </Fragment>
                  );
                })}
            </div>
            <div className={styles["chat-input-panel"]}>
              <label
                className={clsx(styles["chat-input-panel-inner"], {
                  [styles["chat-input-panel-inner-attach"]]:
                    attachImages.length !== 0,
                })}
                htmlFor="chat-input"
              >
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
                {attachImages.length != 0 && (
                  <div className={styles["attach-images"]}>
                    {attachImages.map((image, index) => {
                      return (
                        <div
                          key={index}
                          className={styles["attach-image"]}
                          style={{ backgroundImage: `url("${image}")` }}
                        >
                          <div className={styles["attach-image-mask"]}>
                            <DeleteImageButton
                              deleteImage={() => {
                                setAttachImages(
                                  attachImages.filter((_, i) => i !== index),
                                );
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </label>
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
    </>
  );
}

export function Chat() {
  const chatStore = useChatStore();
  const session = chatStore.currentSession();
  return <_Chat key={session.id}></_Chat>;
}
