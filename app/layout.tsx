import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MailFlow — IP Email Processor",
  description: "智慧型 IP 事務所 Email 分類與歸檔 SaaS",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  );
}
