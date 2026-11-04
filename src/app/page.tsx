"use client";
import Link from "next/link";
import { useSede } from "./ui";

const MODULOS = [
  { href: "/simulador", titulo: "Chatbot de WhatsApp", detalle: "Saludo, carta, preguntas, pedido en lenguaje natural, modalidad, resumen y confirmación.", hu: "HU02–HU07, HU13, HU15, HU23" },
  { href: "/cocina", titulo: "Panel de cocina", detalle: "Pedidos confirmados en orden de llegada, con observaciones y alerta de demora.", hu: "HU08, HU10" },
  { href: "/mozo", titulo: "Pedidos de mesa", detalle: "El mozo registra los pedidos de mesa en el mismo sistema.", hu: "HU09" },
  { href: "/caja", titulo: "Caja", detalle: "Pendientes de cobro, comprobantes de billetera digital y cierre de caja.", hu: "HU12, HU13" },
  { href: "/delivery", titulo: "Delivery", detalle: "Pedidos con dirección y ubicación, asignación de repartidor y entrega.", hu: "HU14, HU15" },
  { href: "/atencion", titulo: "Atención humana", detalle: "Conversaciones derivadas: el bot se pausa y responde una persona.", hu: "HU17" },
  { href: "/admin", titulo: "Administración", detalle: "Carta, platos agotados por sede, zonas de delivery y mensajes del chatbot.", hu: "HU01, HU16, HU24" },
];

export default function Inicio() {
  const { info } = useSede();
  return (
    <>
      <h1>Sistema de pedidos — Restaurante Los Eucaliptos</h1>
      <p className="suave">
        Incremento al Sprint 6 (semanas 1–12): bases técnicas, chatbot, pedido completo, panel de cocina, control y caja,
        y delivery.
      </p>
      {info && (
        <p className="fila">
          <span className="etiqueta">IA: {info.modoIA === "openai" ? "modelo de lenguaje (OpenAI)" : "intérprete local por reglas"}</span>
          <span className="etiqueta">WhatsApp: {info.modoWhatsApp === "cloud-api" ? "Cloud API conectada" : "modo simulado"}</span>
        </p>
      )}
      <div className="rejilla">
        {MODULOS.map((m) => (
          <Link key={m.href} href={m.href} className="tarjeta" style={{ textDecoration: "none", color: "inherit" }}>
            <h2>{m.titulo}</h2>
            <p style={{ margin: ".25rem 0 .5rem" }}>{m.detalle}</p>
            <span className="etiqueta">{m.hu}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
