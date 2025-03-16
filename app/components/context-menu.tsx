import React, { useEffect, useRef, useState } from "react";
import styles from "./context-menu.module.scss";
import CircuitIcon from "../icons/eda/circuit.svg";
import SymbolIcon from "../icons/eda/symbol.svg";
import BookIcon from "../icons/book.svg";
import GitIcon from "../icons/git.svg";
import TerminalIcon from "../icons/terminal.svg";
import ErrorIcon from "../icons/error.svg";
import GlobeIcon from "../icons/globe.svg";
import { ContextMenuOption } from "./context-menu-option";

interface ContextMenuItem {
  id: string;
  name: string;
  path?: string;
  icon?: React.ReactNode;
  type: "menu" | "action" | "file" | ContextMenuOption;
  hasChildren?: boolean;
  children?: ContextMenuItem[];
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
  {
    id: "schematic",
    name: "Schematic",
    icon: <CircuitIcon />,
    type: "menu",
    hasChildren: true,
    children: [
      {
        id: "bom",
        name: "bom",
        type: ContextMenuOption.BOM,
      },
      {
        id: "netlist",
        name: "netlist",
        type: ContextMenuOption.NETLIST,
      },
    ],
  },
  {
    id: "symbol",
    name: "Symbol",
    icon: <SymbolIcon />,
    type: "menu",
    hasChildren: true,
  },
  {
    id: "docs",
    name: "Docs",
    icon: <BookIcon />,
    type: "menu",
    hasChildren: true,
  },
  {
    id: "git",
    name: "Git",
    icon: <GitIcon />,
    type: "menu",
    hasChildren: true,
  },
  {
    id: "terminals",
    name: "Terminals",
    icon: <TerminalIcon />,
    type: "menu",
    hasChildren: true,
  },
  {
    id: "errors",
    name: "Errors",
    icon: <ErrorIcon />,
    type: "menu",
    hasChildren: true,
  },
  {
    id: "web",
    name: "Web",
    icon: <GlobeIcon />,
    type: "action",
  },
];

export function ContextMenu({
  items = [],
  onSelect,
  onClose,
  position,
  searchTerm = "",
  onSearchChange,
  anchorPoint = "top",
  showSearch = true,
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [currentItems, setCurrentItems] = useState<ContextMenuItem[]>([
    ...items,
    ...defaultSections,
  ]);

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

  const handleItemClick = (item: ContextMenuItem) => {
    if (item.type === "menu" && item.children) {
      // Update the current items to show the children of the selected menu item
      setCurrentItems(item.children);
    } else {
      // Trigger the onSelect callback for other item types
      onSelect?.(item);
    }
  };

  const filteredItems =
    searchTerm && showSearch
      ? currentItems.filter(
          (item) =>
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.path?.toLowerCase().includes(searchTerm.toLowerCase()),
        )
      : currentItems;

  const style = position
    ? {
        position: "fixed" as const,
        left: `${position.x}px`,
        top: `${position.y}px`,
        ...(anchorPoint === "bottom" && {
          transform: "translateY(-100%)",
        }),
      }
    : {};

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
            onClick={() => handleItemClick(item)}
          >
            <span className={styles.icon}>{item.icon}</span>
            <div className={styles.itemContent}>
              <span className={styles.name}>{item.name}</span>
              {item.path && <span className={styles.path}>{item.path}</span>}
            </div>
            {item.hasChildren && <span className={styles.chevron}>›</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
