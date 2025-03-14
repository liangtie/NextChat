import React from "react";
import styles from "./welcome-page.module.scss";
import Locale from "../locales";
import Copilot from "../icons/copilot.svg";
export function WelcomePage() {
  return (
    <div className={styles.welcome}>
      <div>
        <Copilot />
      </div>
      <h1>{Locale.Welcome.Title}</h1>
      <p>{Locale.Welcome.SubTitle}</p>
      <div className={styles.instructions}>
        <div>{Locale.Welcome.Context}</div>
        <div>{Locale.Welcome.Extensions}</div>
        <div>{Locale.Welcome.Commands}</div>
      </div>
    </div>
  );
}
