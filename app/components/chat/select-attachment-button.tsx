import React, { useRef } from "react";
import styles from "./select-attachment-button.module.scss";
import Attachment from "../../icons/attachment.svg";

interface Props {
  onFileSelect?: (file: File) => void;
}

export function SelectAttachmentButton({ onFileSelect }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileSelect) {
      onFileSelect(file);
    }
  };

  return (
    <div className={styles.selectAttachmentButton} onClick={handleClick}>
      <Attachment />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className={styles.fileInput}
      />
    </div>
  );
}
