import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vocab Lab - 语境化查词",
  description: "通过同义词对比、搭配和语境例句学习高级英语词汇",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
