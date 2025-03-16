import { useRef, useState, useEffect } from "react";
import * as monaco from "monaco-editor";
import styles from "./input-box.module.scss";
import { SendButton } from "./send-button";
import { SelectAttachmentButton } from "./select-attachment-button";
import { SelectContextButton } from "./select-context-button";
import { ContextMenu, ContextMenuItem } from "./context-menu";
import { useAppConfig } from "../store";
import "./monaco-theme";
import { create_editor } from "./monaco-theme";
import {
  AttachmentItem,
  AttachmentType,
  ContextAttachmentItem,
} from "./context-attachment";
import {
  BUILTIN_REFERENCE,
  CMD_TYPE,
  DESIGN_GLOBAL_CONTEXT,
  GENERIC_CHAT_CMD,
} from "../kicad";
import { WEBVIEW_FUNCTIONS } from "../kicad/constant";
import {
  fire_kicad_desktop_cmd,
  KICAD_DESKTOP_CMD_TYPE,
} from "../kicad/cmd/kicad_desktop";

interface InputBoxProps {
  onSend: (text: GENERIC_CHAT_CMD) => void;
}

export function InputBox({ onSend }: InputBoxProps) {
  const config = useAppConfig();
  // Apply the appropriate theme based on system preference
  const applyTheme = () => {
    const theme = config.theme;

    if (theme === "auto") {
      const isDarkMode = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      monaco.editor.setTheme(
        isDarkMode ? "transparentDarkTheme" : "transparentLightTheme",
      );
    } else {
      monaco.editor.setTheme(
        theme === "dark" ? "transparentDarkTheme" : "transparentLightTheme",
      );
    }
  };

  const [refs, setRefs] = useState(new Set<BUILTIN_REFERENCE>());
  const [global_ctx, setGlobalCtx] = useState<DESIGN_GLOBAL_CONTEXT | null>(
    null,
  );

  const editorRef = useRef<HTMLDivElement>(null);
  const editorInstanceRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(
    null,
  );
  const [attachedItems, setAttachedItems] = useState<AttachmentItem[]>([]);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState<{
    x: number;
    y: number;
  }>();
  const [searchTerm, setSearchTerm] = useState("");

  const send_chat_cmd = () => {
    const value = editorInstanceRef.current?.getValue() || "";
    if (value.trim()) {
      onSend({
        type: CMD_TYPE.GENERIC_CHAT,
        context: {
          chat: {
            input_text: value,
            options: {
              builtin_refs: [...refs],
            },
          },
        },
        global_context_uuid: global_ctx?.uuid || undefined,
        design_global_context: global_ctx ?? undefined,
      });
      editorInstanceRef.current?.setValue("");
      setAttachedItems([]);
      setRefs(new Set());
    }
  };

  // Handle editor key events
  const handleKeyDown = (e: monaco.IKeyboardEvent) => {
    if (e.keyCode === monaco.KeyCode.Escape) {
      setShowContextMenu(false);
      return;
    }

    if (e.keyCode === monaco.KeyCode.Enter && !e.shiftKey) {
      e.preventDefault();
      send_chat_cmd();
    }
  };

  // Handle content changes
  const handleContentChange = () => {
    const model = editorInstanceRef.current?.getModel();
    const position = editorInstanceRef.current?.getPosition();

    if (model && position) {
      const content = model.getLineContent(position.lineNumber);
      const lastChar = content[position.column - 2];
      const currentChar = content[position.column - 1];

      if (lastChar === "@" && !currentChar) {
        const atCharPosition = {
          lineNumber: position.lineNumber,
          column: position.column - 1, // Position of the @ character
        };
        const coords =
          editorInstanceRef.current?.getScrolledVisiblePosition(atCharPosition);
        if (coords && editorRef.current) {
          const editorRect = editorRef.current.getBoundingClientRect();
          const menuWidth = 400; // Approximate menu width

          // Calculate initial position - align menu's bottom with the @ character
          let x = editorRect.left + coords.left + 8; // Slightly to the right of @
          let y = editorRect.top + coords.top; // Align with the @ character

          // Ensure menu stays within viewport
          if (x + menuWidth > window.innerWidth) {
            x = window.innerWidth - menuWidth - 10;
          }

          // Ensure minimum margins
          x = Math.max(10, x);

          setContextMenuPosition({ x, y });
          setShowContextMenu(true);
          setSearchTerm("");
        }
      } else {
        setShowContextMenu(false);
      }
    }
  };

  // Handle mouse events
  const handleMouseDown = () => {
    if (showContextMenu) {
      setShowContextMenu(false);
    }
  };

  useEffect(() => {
    window[WEBVIEW_FUNCTIONS.update_global_ctx] = (
      ctx: DESIGN_GLOBAL_CONTEXT,
    ) => {
      setGlobalCtx(ctx);
    };

    let editor: monaco.editor.IStandaloneCodeEditor | null = null;
    let disposables: monaco.IDisposable[] = [];

    if (editorRef.current) {
      editor = create_editor(editorRef.current);

      // Listen for changes in the system theme
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

      mediaQuery.addEventListener("change", applyTheme);

      // Apply the theme initially
      applyTheme();

      editorInstanceRef.current = editor;

      // Store disposables for cleanup
      disposables = [
        editor.onKeyDown(handleKeyDown),
        editor.onDidChangeModelContent(handleContentChange),
        editor.onMouseDown(handleMouseDown),
      ];
    }

    return () => {
      // Set the ref to null to prevent new operations
      editorInstanceRef.current = null;

      // Clean up event handlers
      disposables.forEach((d) => {
        try {
          d.dispose();
        } catch (error) {
          console.warn("Failed to dispose handler:", error);
        }
      });

      // Dispose the editor instance
      if (editor) {
        try {
          editor.dispose();
        } catch (error) {
          console.warn("Failed to dispose editor:", error);
        }
      }

      // Remove the theme listener
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      mediaQuery.removeEventListener("change", applyTheme);
    };
  }, [onSend]); // Only depend on onSend since it might change

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
          fire_kicad_desktop_cmd({
            type: KICAD_DESKTOP_CMD_TYPE.update_global_context,
          });
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

    // Remove the @ character from the editor if it was triggered by typing
    const editor = editorInstanceRef.current;
    if (editor && showContextMenu) {
      // showContextMenu indicates it was triggered by typing @
      const model = editor.getModel();
      const position = editor.getPosition();

      if (model && position) {
        const range = new monaco.Range(
          position.lineNumber,
          position.column - 1, // Remove the @ character
          position.lineNumber,
          position.column,
        );

        editor.executeEdits("", [
          {
            range,
            text: "", // Replace @ with empty string
            forceMoveMarkers: true,
          },
        ]);
      }
    }
    setShowContextMenu(false);
  };

  return (
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
      <div className={styles["editor-container"]} ref={editorRef} />
      {showContextMenu && contextMenuPosition && (
        <ContextMenu
          onSelect={(item) => {
            handleContextSelect(item);
            setShowContextMenu(false);
          }}
          onClose={() => setShowContextMenu(false)}
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
          <SendButton onClick={send_chat_cmd} />
        </div>
      </div>
    </div>
  );
}
