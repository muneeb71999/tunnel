import type { Metadata } from "next";
import "./globals.css";
import AppLayout from "@/components/layout/app-layout";

export const metadata: Metadata = {
  title: "OutreachPro - Cold Email Platform",
  description: "Send, run, and manage cold email campaigns with sequences and A/B testing",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
