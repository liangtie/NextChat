import React, { useRef, useState } from "react";
import styles from "./select-context-button.module.scss";
import AtSign from "../icons/at-sign.svg";
import { ContextMenu } from "./context-menu";

interface Props {
  onContextSelect?: (context: { name: string; path: string }) => void;
}

export function SelectContextButton({ onContextSelect }: Props) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const buttonRef = useRef<HTMLDivElement>(null);

  const handleClick = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const getMenuPosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    return {
      x: rect.left,
      y: rect.top // The menu will appear above the button since we're using anchorPoint="bottom"
    };
  };

  return (
    <>
      <div className={styles.selectContextButton} onClick={handleClick} ref={buttonRef}>
        <AtSign />
      </div>
      {isMenuOpen && (
        <ContextMenu
          onSelect={(item) => {
            if (item.type === "file") {
              onContextSelect?.({ name: item.name, path: item.path || "" });
            }
            setIsMenuOpen(false);
          }}
          onClose={() => setIsMenuOpen(false)}
          position={getMenuPosition()}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          anchorPoint="bottom"
          showSearch={true}
        />
      )}
    </>
  );
} 