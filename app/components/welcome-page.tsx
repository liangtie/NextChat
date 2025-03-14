import React from "react";
import styles from "./welcome-page.module.scss";

export function WelcomePage() {
  return (
    <div className={styles.welcome}>
      <div>
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M24 44C35.0457 44 44 35.0457 44 24C44 12.9543 35.0457 4 24 4C12.9543 4 4 12.9543 4 24C4 35.0457 12.9543 44 24 44Z" stroke="white" strokeWidth="2"/>
          <circle cx="16" cy="24" r="2" fill="white"/>
          <circle cx="24" cy="24" r="2" fill="white"/>
          <circle cx="32" cy="24" r="2" fill="white"/>
        </svg>
      </div>
      <h1>Ask Copilot</h1>
      <p>Copilot is powered by AI, so mistakes are possible. Review output carefully before use.</p>
      <div className={styles.instructions}>
        <div>🎤 or type # to attach context</div>
        <div>@ to chat with extensions</div>
        <div>Type / to use commands</div>
      </div>
    </div>
  );
}