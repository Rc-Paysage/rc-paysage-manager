import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EcoPilot",
  description: "Assistant d'optimisation des déplacements automobiles",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <div className="app-shell">
          <header className="app-header">
            <span className="app-header-title">EcoPilot</span>
            <nav className="app-nav">
              <a href="/">Trajet</a>
              <a href="/lab">Test Lab</a>
            </nav>
          </header>
          <main className="app-main">{children}</main>
        </div>
      </body>
    </html>
  );
}
