import React, { useState } from "react";
import styles from "./tabs.module.scss";
import { Chat } from "./chat";
import Locale from "../locales";
import { Component } from "./component";

export const Tabs = () => {
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    { title: Locale.Chat.Tabs.Chat, content: <Chat /> },
    {
      title: Locale.Chat.Tabs.Component,
      content: <Component />,
    },
  ];

  return (
    <div className={styles["tabs-container"]}>
      <div className={styles["tabs-header"]}>
        {tabs.map((tab, index) => (
          <div
            key={index}
            className={`${styles.tab} ${
              activeTab === index ? styles.active : ""
            }`}
            onClick={() => setActiveTab(index)}
          >
            {tab.title}
          </div>
        ))}
      </div>
      <div className={styles["tabs-content"]}>{tabs[activeTab].content}</div>
    </div>
  );
};

export default Tabs;
