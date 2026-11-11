import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EcoPilot",
  description: "Assistant d'optimisation des déplacements automobiles",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "EcoPilot",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1f7a5c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <div className="app-shell">
          <header className="app-header">
            <a className="app-header-title" href="/">
              EcoPilot
            </a>
            <nav className="app-nav">
              <a href="/">Trajet</a>
              <a href="/conduite">Conduite</a>
              <a href="/lab">Test Lab</a>
            </nav>
          </header>
          <main className="app-main">{children}</main>
        </div>
      </body>
    </html>
  );
}
