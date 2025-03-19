import React from "react";
import styles from "./button-container.module.scss";
import { SelectAttachmentButton } from "./chat/select-attachment-button";
import { SendButton } from "./chat/send-button";

interface Props {
  onFileSelect?: (file: File) => void;
  onSend?: () => void;
}

export function ButtonContainer({ onFileSelect, onSend }: Props) {
  return (
    <div className={styles.buttonContainer}>
      <SelectAttachmentButton onFileSelect={onFileSelect} />
      <SendButton onClick={onSend} />
    </div>
  );
}
