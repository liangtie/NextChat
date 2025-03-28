import React, { useEffect, useRef, useState } from "react";
import styles from "./context-menu.module.scss";
import SymbolIcon from "../../icons/eda/symbol.svg";
import BookIcon from "../../icons/book.svg";
import ProjectIcon from "../../icons/project.svg";
import GlobeIcon from "../../icons/globe.svg";
import { BUILTIN_REFERENCE } from "../../copilot";
import Locale from "../../locales";
import { chatGlobalContext } from "./chat-global-context";
export interface ContextMenuItemBase {
  id: string;
  name: string;
  path?: string;
  icon?: React.ReactNode;
  hasChildren?: boolean;
  children?: ContextMenuItem[];
}

export interface ContextMenuOptItem extends ContextMenuItemBase {
  type: "option";
  opt: BUILTIN_REFERENCE;
}

export interface ContextMenuMenuItem extends ContextMenuItemBase {
  type: "menu";
}

export interface ContextMenuActionItem extends ContextMenuItemBase {
  type: "action";
}

export type ContextMenuItem =
  | ContextMenuOptItem
  | ContextMenuMenuItem
  | ContextMenuActionItem;

interface Props {
  items?: ContextMenuItem[];
  onSelect?: (item: ContextMenuItem) => void;
  onClose?: (event?: React.KeyboardEvent<HTMLDivElement>) => void;
  position?: { x: number; y: number };
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  anchorPoint?: "top" | "bottom";
  showSearch?: boolean;
}

const gen_designators_menu = (designators: string[]): ContextMenuItem[] => {
  return designators.map((designator) => ({
    id: designator,
    name: designator,
    type: "option",
    opt: BUILTIN_REFERENCE.COMPONENT,
  }));
};

const defaultSections = (): ContextMenuItem[] => [
  {
    id: "project",
    name: Locale.ContextMenu.Project,
    icon: <ProjectIcon />,
    type: "option",
    opt: BUILTIN_REFERENCE.PROJECT,
  },
  {
    id: "component",
    name: Locale.ContextMenu.Component,
    icon: <SymbolIcon />,
    type: "menu",
    hasChildren: true,
    children: gen_designators_menu(
      chatGlobalContext.global_ctx?.designators ?? [],
    ),
  },
  {
    id: "docs",
    name: Locale.ContextMenu.Docs,
    icon: <BookIcon />,
    type: "menu",
  },
  {
    id: "web",
    name: Locale.ContextMenu.Web,
    icon: <GlobeIcon />,
    type: "menu",
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
    ...defaultSections(),
  ]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

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
      setCurrentItems(item.children);
      setSelectedIndex(null);
    } else {
      onSelect?.(item);
      onClose?.(); // Close menu after selection
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!currentItems.length) return;

    switch (event.key) {
      case "ArrowDown":
        setSelectedIndex((prev) =>
          prev === null || prev >= currentItems.length - 1 ? 0 : prev + 1,
        );
        break;
      case "ArrowUp":
        setSelectedIndex((prev) =>
          prev === null || prev <= 0 ? currentItems.length - 1 : prev - 1,
        );
        break;
      case "Enter":
        if (selectedIndex !== null) {
          handleItemClick(currentItems[selectedIndex]);
        }
        break;
      case "Escape":
        onClose?.();
        break;
      default:
        if (!showSearch) {
          onClose?.(event);
        }
        break;
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

  // Focus on menu when it opens
  useEffect(() => {
    if (menuRef.current) {
      menuRef.current.focus();
    }
    if (filteredItems.length > 0) {
      setSelectedIndex(0); // Focus on the first item when the menu opens
    }
  }, [filteredItems]);

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
    <div
      className={styles.contextMenu}
      ref={menuRef}
      style={style}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
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
        {filteredItems.map((item, index) => (
          <div
            key={item.id}
            className={`${styles.menuItem} ${
              index === selectedIndex ? styles.selected : ""
            }`}
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
