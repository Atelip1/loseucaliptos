import type { Metadata, Viewport } from "next";
import { Lora, Source_Sans_3 } from "next/font/google";
import { Navegacion } from "./ui";
import "./globals.css";

const serif = Lora({ subsets: ["latin"], weight: ["600", "700"], variable: "--fuente-serif" });
const sans = Source_Sans_3({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--fuente-sans" });

export const metadata: Metadata = {
  title: "Los Eucaliptos · Pedidos",
  description: "Sistema conversacional con IA para la gestión de pedidos del Restaurante Los Eucaliptos",
};

export const viewport: Viewport = { themeColor: "#1f4d35" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${serif.variable} ${sans.variable}`}>
      <body>
        <div className="app">
          <Navegacion />
          <main className="contenido">{children}</main>
        </div>
      </body>
    </html>
  );
}
