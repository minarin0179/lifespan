import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "AI Lineage & School",
  description: "Lifespan-based lineage and school timeline"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
