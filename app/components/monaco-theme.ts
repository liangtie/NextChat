import * as monaco from "monaco-editor";
import { RefObject } from "react";

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
    focusBorder: "#00000000",
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
    "editorWidget.border": "none", // No widget border,
    focusBorder: "#00000000",
  },
});

export const create_editor = (editorRef: HTMLElement) => {
  return monaco.editor.create(editorRef, {
    language: "plaintext",
    theme: "transparentLightTheme", // Default to dark theme
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    wordWrap: "on",
    fontSize: 14,
    lineNumbers: "off",
    renderLineHighlight: "none",
    // scrollbar: {
    //   vertical: "auto",
    //   horizontal: "auto",
    // },
    overviewRulerLanes: 0, // Hide decorations overview ruler
    glyphMargin: false, // Disable margin view overlays
    padding: { top: 0, bottom: 0 }, // Remove padding
    automaticLayout: true,
    overviewRulerBorder: false,
    folding: false,
    // Undocumented see https://github.com/Microsoft/vscode/issues/30795#issuecomment-410998882
    lineDecorationsWidth: 0,
    lineNumbersMinChars: 0,
  });
};
