import React from "react";
import styles from "./send-button.module.scss";
import Locale from "../locales";

interface Props {
  onClick?: () => void;
}

export function SendButton({ onClick }: Props) {
  return (
    <div className={styles.sendButton} onClick={onClick}>
      <span>{Locale.Chat.Send}</span>
      <span className={styles.keybinding}>⏎</span>
    </div>
  );
} 