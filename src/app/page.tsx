"use client";
import Link from "next/link";
import { Icono, PlatoIlustracion, Rama, type NombreIcono } from "./iconos";
import { Encabezado, Kpi, SelectorSede, soles, useDatos, useSede, useUsuario, type PedidoUI } from "./ui";

const MODULOS: { href: string; titulo: string; detalle: string; hu: string; icono: NombreIcono }[] = [
  { href: "/simulador", titulo: "Chatbot de WhatsApp", detalle: "Saludo, carta, preguntas, pedido en lenguaje natural, modalidad, resumen y confirmación.", hu: "HU02–HU07, HU13, HU15, HU23", icono: "chat" },
  { href: "/cocina", titulo: "Panel de cocina", detalle: "Pedidos confirmados en orden de llegada, con observaciones y alerta de demora.", hu: "HU08, HU10", icono: "gorro" },
  { href: "/mozo", titulo: "Pedidos de mesa", detalle: "El mozo registra los pedidos de mesa en el mismo sistema.", hu: "HU09", icono: "mesa" },
  { href: "/caja", titulo: "Caja", detalle: "Pendientes de cobro, comprobantes de billetera digital y cierre de caja.", hu: "HU12, HU13", icono: "caja" },
  { href: "/delivery", titulo: "Delivery", detalle: "Pedidos con dirección y ubicación, asignación de repartidor y entrega.", hu: "HU14, HU15", icono: "moto" },
  { href: "/atencion", titulo: "Atención humana", detalle: "Conversaciones derivadas: el bot se pausa y responde una persona.", hu: "HU17", icono: "auricular" },
  { href: "/admin", titulo: "Administración", detalle: "Carta, platos agotados por sede, zonas de delivery y mensajes del chatbot.", hu: "HU01, HU16, HU24", icono: "ajustes" },
];

const SPRINTS = [
  ["S1", "Bases técnicas"], ["S2", "El bot conversa"], ["S3", "Pedido completo"], ["S4", "Panel de cocina"],
  ["S5", "Control y caja"], ["S6", "Delivery"], ["S7", "Reportes"], ["S8", "Piloto real"],
];

export default function Inicio() {
  const { sedes, sedeId, cambiar, info } = useSede();
  const [usuario] = useUsuario("administrador");
  const dia = useDatos<{ pedidos: PedidoUI[] }>(sedeId ? `/api/pedidos?sede=${sedeId}&vista=dia` : null, 5000);
  const cierre = useDatos<{ totalCobrado: number }>(sedeId ? `/api/caja/cierre?sede=${sedeId}` : null, 5000);
  const derivadas = useDatos<unknown[]>("/api/conversaciones?derivadas=1", 5000);

  const pedidos = (dia.datos?.pedidos ?? []).filter((p) => p.estado !== "CANCELADO");
  const enCocina = pedidos.filter((p) => ["RECIBIDO", "EN_PREPARACION"].includes(p.estado)).length;
  const enDelivery = pedidos.filter((p) => p.modalidad === "DELIVERY" && ["LISTO", "EN_CAMINO"].includes(p.estado)).length;
  const whatsapp = pedidos.filter((p) => p.canal === "WHATSAPP").length;

  return (
    <>
      <Encabezado
        icono="hoja"
        titulo={<>¡Hola{usuario && usuario !== "administrador" ? `, ${usuario}` : ""}! 👋</>}
        subtitulo="Te damos la bienvenida al Sistema de Pedidos de Los Eucaliptos"
        usuario={usuario}
      >
        <SelectorSede sedes={sedes} sedeId={sedeId} cambiar={cambiar} />
      </Encabezado>

      <section className="hero">
        <Rama size={180} className="hero-rama" color="#8cc06f" />
        <div className="hero-texto">
          <div className="linea-sup"><Icono n="hoja" size={34} /> Sistema de pedidos</div>
          <div className="pre">Restaurante Campestre</div>
          <h1>Los Eucaliptos</h1>
          <div className="filete" />
          {info && (
            <div className="chips">
              <span className="chip">IA: {info.modoIA === "openai" ? "modelo de lenguaje" : "intérprete local"}</span>
              <span className="chip">WhatsApp: {info.modoWhatsApp === "cloud-api" ? "Cloud API conectada" : "modo simulado"}</span>
            </div>
          )}
        </div>
        <div className="hero-plato"><PlatoIlustracion size={300} /></div>
      </section>

      <div className="kpis">
        <Kpi icono="carrito" nombre="Pedidos hoy" valor={dia.datos ? pedidos.length : "—"} nota={dia.datos ? `${whatsapp} por WhatsApp` : undefined} />
        <Kpi icono="cubiertos" nombre="En cocina" valor={dia.datos ? enCocina : "—"} tono="ambar" />
        <Kpi icono="moto" nombre="En delivery" valor={dia.datos ? enDelivery : "—"} tono="azul" />
        <Kpi icono="auricular" nombre="Esperan atención" valor={derivadas.datos ? derivadas.datos.length : "—"} tono="terracota" />
        <Kpi icono="monedas" nombre="Ventas del día" valor={cierre.datos ? soles(cierre.datos.totalCobrado) : "—"} nota="Cobrado en caja" />
      </div>

      <div className="modulos">
        {MODULOS.map((m) => (
          <Link key={m.href} href={m.href} className="modulo">
            <Rama size={80} className="m-rama" color="var(--verde-500)" />
            <h2><Icono n={m.icono} size={26} /> {m.titulo}</h2>
            <p>{m.detalle}</p>
            <span className="etiqueta">{m.hu}</span>
            <span className="ilustra"><Icono n={m.icono} size={40} grosor={1.5} /></span>
          </Link>
        ))}
      </div>

      <div className="tarjeta" style={{ marginTop: "1.3rem" }}>
        <div className="tarjeta-titulo">
          <h2><Icono n="calendario" size={22} /> Avance del proyecto</h2>
          <span className="suave">Semana 13 de 16 · Sprint 7 en curso</span>
        </div>
        <div className="sprints">
          {SPRINTS.map(([s, t], i) => (
            <div key={s} className={`sprint ${i < 6 ? "hecho" : i === 6 ? "actual" : ""}`}>
              <b>{i < 6 && <Icono n="check" size={14} grosor={2.4} />} {s}</b>
              <span>{t}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
