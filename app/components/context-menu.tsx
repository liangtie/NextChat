import React, { useEffect, useRef } from "react";
import styles from "./context-menu.module.scss";
import FileIcon from "../icons/files.svg";
import CodeIcon from "../icons/code.svg";
import BookIcon from "../icons/book.svg";
import GitIcon from "../icons/git.svg";
import NotebookIcon from "../icons/notebook.svg";
import RulerIcon from "../icons/ruler.svg";
import TerminalIcon from "../icons/terminal.svg";
import ErrorIcon from "../icons/error.svg";
import GlobeIcon from "../icons/globe.svg";
import GraphIcon from "../icons/graph.svg";

interface ContextMenuItem {
  id: string;
  name: string;
  path?: string;
  icon?: React.ReactNode;
  type: "file" | "section";
  hasChildren?: boolean;
}

interface Props {
  items?: ContextMenuItem[];
  onSelect?: (item: ContextMenuItem) => void;
  onClose?: () => void;
  position?: { x: number; y: number };
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  anchorPoint?: "top" | "bottom";
  showSearch?: boolean;
}

const defaultSections: ContextMenuItem[] = [
  { id: "files", name: "Files & Folders", icon: <FileIcon />, type: "section", hasChildren: true },
  { id: "code", name: "Code", icon: <CodeIcon />, type: "section", hasChildren: true },
  { id: "docs", name: "Docs", icon: <BookIcon />, type: "section", hasChildren: true },
  { id: "git", name: "Git", icon: <GitIcon />, type: "section", hasChildren: true },
  { id: "composers", name: "Summarized Composers", icon: <NotebookIcon />, type: "section", hasChildren: true },
  { id: "rules", name: "Cursor Rules", icon: <RulerIcon />, type: "section", hasChildren: true },
  { id: "terminals", name: "Terminals", icon: <TerminalIcon />, type: "section", hasChildren: true },
  { id: "errors", name: "Linter errors", icon: <ErrorIcon />, type: "section" },
  { id: "web", name: "Web", icon: <GlobeIcon />, type: "section" },
  { id: "changes", name: "Recent Changes", icon: <GraphIcon />, type: "section" }
];

export function ContextMenu({ 
  items = [], 
  onSelect, 
  onClose, 
  position, 
  searchTerm = "", 
  onSearchChange,
  anchorPoint = "top",
  showSearch = true
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose?.();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    if (showSearch) {
      inputRef.current?.focus();
    }
  }, [showSearch]);

  const allItems = [...items, ...defaultSections];

  const filteredItems = searchTerm && showSearch
    ? allItems.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.path?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : allItems;

  const style = position ? {
    position: 'fixed' as const,
    left: `${position.x}px`,
    top: `${position.y}px`,
    ...(anchorPoint === "bottom" && {
      transform: 'translateY(-100%)'
    })
  } : {};

  return (
    <div className={styles.contextMenu} ref={menuRef} style={style}>
      {showSearch && (
        <div className={styles.searchContainer}>
          <input
            ref={inputRef}
            className={styles.searchInput}
            placeholder="Add files, folders, docs..."
            value={searchTerm}
            onChange={(e) => onSearchChange?.(e.target.value)}
          />
        </div>
      )}
      <div className={styles.menuItems}>
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className={styles.menuItem}
            onClick={() => onSelect?.(item)}
          >
            <span className={styles.icon}>{item.icon}</span>
            <div className={styles.itemContent}>
              <span className={styles.name}>{item.name}</span>
              {item.path && (
                <span className={styles.path}>{item.path}</span>
              )}
            </div>
            {item.hasChildren && (
              <span className={styles.chevron}>›</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 