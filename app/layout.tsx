import type { Metadata } from "next";
import { Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "IP Winner — 智慧財產管理系統",
  description: "IP 事務所案件管理、Email 分類與歸檔",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body>
        <Theme
          accentColor="green"
          grayColor="slate"
          radius="small"
          scaling="100%"
          appearance="light"
        >
          {children}
        </Theme>
      </body>
    </html>
  );
}
