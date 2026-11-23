import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/layout/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fôlego",
  description:
    "Controle de caixa para profissionais autônomos. Saiba quanto seu negócio pode respirar.",
};

export const viewport: Viewport = {
  themeColor: "#f4f0e6",
};

// Define o tema antes da primeira pintura, evitando flash (DESIGN.md §17).
const themeInit = `(function(){try{var t=localStorage.getItem('folego-theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* Fonte global do app (App Router): carregada uma vez no layout raiz. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,500&family=Spectral:ital,wght@0,400;0,500;1,400&family=Hanken+Grotesk:wght@400;500;600;700&display=swap"
        />
        {/* eslint-disable-next-line react/no-danger */}
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
