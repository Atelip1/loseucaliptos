import type { Metadata } from "next";
import { Navegacion } from "./ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "Los Eucaliptos · Pedidos",
  description: "Sistema conversacional con IA para la gestión de pedidos del Restaurante Los Eucaliptos",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Navegacion />
        <main className="contenido">{children}</main>
      </body>
    </html>
  );
}
