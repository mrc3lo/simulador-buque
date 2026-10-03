import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Laboratorio Logística Marítima y Portuaria",
  description:
    "Simulador educativo de flotabilidad, estabilidad y distribución de carga en un buque.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">
        <div className="app-content">{children}</div>
        <footer className="app-credit">
          Esta app ha sido creada, diseñada e implementada por Rodolfo Díaz Guerra y Marcelo Díaz Flores.
        </footer>
      </body>
    </html>
  );
}
