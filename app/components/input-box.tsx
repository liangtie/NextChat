import { useRef, useState, useEffect } from "react";
import * as monaco from "monaco-editor";
import styles from "./input-box.module.scss";
import { SendButton } from "./send-button";
import { SelectAttachmentButton } from "./select-attachment-button";
import { SelectContextButton } from "./select-context-button";
import { ContextMenu } from "./context-menu";
import { useAppConfig } from "../store";

// Define the dark theme
monaco.editor.defineTheme("transparentDarkTheme", {
  base: "vs-dark",
  inherit: true,
  rules: [],
  colors: {
    "editor.background": "#00000000", // Transparent background
    "editor.lineHighlightBackground": "#00000000", // Transparent line highlight
    "editorLineNumber.foreground": "#00000000", // Hide line numbers
    "editorCursor.foreground": "#FFFFFF", // Cursor color
    "editor.selectionBackground": "#264f7840", // Transparent selection
    "editor.inactiveSelectionBackground": "#264f7820", // Transparent inactive selection
    "editorWidget.background": "#00000000", // Transparent widget background
    "editorWidget.border": "none", // No widget border
    "editor.foreground": "#FFFFFF",
  },
});

// Define the light theme
monaco.editor.defineTheme("transparentLightTheme", {
  base: "vs",
  inherit: true,
  rules: [],
  colors: {
    "editor.background": "#FFFFFF00", // Transparent background
    "editor.lineHighlightBackground": "#FFFFFF00", // Transparent line highlight
    "editorLineNumber.foreground": "#FFFFFF00", // Hide line numbers
    "editorCursor.foreground": "#000000", // Cursor color
    "editor.foreground": "#000000", // Text color (black)
    "editor.selectionBackground": "#ADD6FF40", // Transparent selection
    "editor.inactiveSelectionBackground": "#ADD6FF20", // Transparent inactive selection
    "editorWidget.background": "#FFFFFF00", // Transparent widget background
    "editorWidget.border": "none", // No widget border
  },
});

interface InputBoxProps {
  onSend: (text: string) => void;
  onFileSelect: (file: File | null) => void;
  placeholder?: string;
  disabled?: boolean;
  onContextSelect?: (context: { name: string; path: string }) => void;
}

export function InputBox({
  onSend,
  onFileSelect,
  placeholder = "Type a message...",
  disabled = false,
  onContextSelect,
}: InputBoxProps) {
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

  const editorRef = useRef<HTMLDivElement>(null);
  const editorInstanceRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(
    null,
  );
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState<{
    x: number;
    y: number;
  }>();
  const [searchTerm, setSearchTerm] = useState("");

  // Handle editor key events
  const handleKeyDown = (e: monaco.IKeyboardEvent) => {
    if (e.keyCode === monaco.KeyCode.Escape) {
      setShowContextMenu(false);
      return;
    }

    if (e.keyCode === monaco.KeyCode.Enter && !e.shiftKey) {
      e.preventDefault();
      const value = editorInstanceRef.current?.getValue() || "";
      if (value.trim()) {
        onSend(value);
        editorInstanceRef.current?.setValue("");
      }
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
    let editor: monaco.editor.IStandaloneCodeEditor | null = null;
    let disposables: monaco.IDisposable[] = [];

    if (editorRef.current) {
      editor = monaco.editor.create(editorRef.current, {
        language: "plaintext",
        theme: "transparentLightTheme", // Default to dark theme
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: "on",
        fontSize: 14,
        lineNumbers: "off",
        renderLineHighlight: "none",
        scrollbar: {
          vertical: "hidden",
          horizontal: "hidden",
        },
        padding: { top: 0, bottom: 0 }, // Remove padding
        automaticLayout: true,
      });

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
    setAttachedFiles([...attachedFiles, file]);
    onFileSelect(file);
  };

  const removeFile = (index: number) => {
    const newFiles = [...attachedFiles];
    newFiles.splice(index, 1);
    setAttachedFiles(newFiles);
  };

  const handleContextSelect = (item: { name: string; path: string }) => {
    // Add the selected item as a file pill
    const contextFile = new File([""], item.name, { type: "text/plain" });
    setAttachedFiles([...attachedFiles, contextFile]);
    onFileSelect(contextFile);

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
          {attachedFiles.map((file, index) => (
            <div key={index} className={styles["file-pill"]}>
              <span>{file.name}</span>
              <button
                onClick={() => removeFile(index)}
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
            if (item.type === "file") {
              handleContextSelect({ name: item.name, path: item.path || "" });
            }
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
          <SendButton
            onClick={() => {
              const value = editorInstanceRef.current?.getValue() || "";
              if (value.trim()) {
                onSend(value);
                editorInstanceRef.current?.setValue("");
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
