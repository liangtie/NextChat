import React from "react";
import styles from "./welcome-page.module.scss";
import Locale from "../../locales";
import Copilot from "../../icons/copilot.svg";
import Attachment from "../../icons/attachment.svg";

export function WelcomePage() {
  return (
    <div className={styles.welcome}>
      <div>
        <Copilot />
      </div>
      <h1>{Locale.Welcome.Title}</h1>
      <p>{Locale.Welcome.SubTitle}</p>
      <div className={styles.instructions}>
        <div>
          {" "}
          <Attachment />
          {Locale.Welcome.Attachment}
        </div>
        <div>{Locale.Welcome.Context}</div>
        <div>{Locale.Welcome.Commands}</div>
      </div>
    </div>
  );
}
