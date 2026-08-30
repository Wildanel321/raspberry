import type { Metadata } from "next";
import "./globals.css";
import ClientLayout from "./ClientLayout";

export const metadata: Metadata = {
  title: "PiControl - Raspberry Pi Management Dashboard",
  description: "Lightweight, real-time monitoring and control panel for Raspberry Pi 3B.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-zinc-50 dark:bg-zinc-950 transition-colors">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
