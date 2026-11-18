"use client";
// Atención humana (HU17, RF09, RN09): conversaciones derivadas con el chatbot en pausa.
import { useEffect, useRef, useState } from "react";
import { Icono, Rama } from "../iconos";
import {
  CampoUsuario, Encabezado, enviar, Estado, hora, hoyLima, iniciales, Kpi, soles, useAccion, useDatos, useUsuario, type PedidoUI,
} from "../ui";

interface Conv {
  telefono: string;
  nombre?: string;
  derivada: boolean;
  motivoDerivacion?: string;
  derivadaEn?: string;
  actualizadaEn: string;
  mensajes: { de: "cliente" | "bot" | "personal"; texto: string; fecha: string }[];
}

const fechaLima = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date(iso));

export default function Atencion() {
  const [usuario, setUsuario] = useUsuario("mozo");
  const { datos, recargar } = useDatos<Conv[]>("/api/conversaciones", 2000);
  const [filtro, setFiltro] = useState<"derivadas" | "todas">("derivadas");
  const [busqueda, setBusqueda] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const { error, ocupado, ejecutar } = useAccion();
  const fin = useRef<HTMLDivElement>(null);

  const todas = datos ?? [];
  const derivadas = todas.filter((c) => c.derivada);
  const hoy = hoyLima();
  const deHoy = todas.filter((c) => fechaLima(c.actualizadaEn) === hoy);
  const q = busqueda.trim().toLowerCase();
  const lista = (filtro === "derivadas" ? derivadas : todas).filter(
    (c) => !q || (c.nombre ?? "").toLowerCase().includes(q) || c.telefono.includes(q),
  );
  const actual = todas.find((c) => c.telefono === sel) ?? null;
  const pedidos = useDatos<{ pedidos: PedidoUI[] }>(actual ? `/api/pedidos?telefono=${actual.telefono}` : null, 4000);
  const ultimo = pedidos.datos?.pedidos[0];

  useEffect(() => {
    if (!sel && derivadas[0]) setSel(derivadas[0].telefono);
  }, [sel, derivadas]);
  useEffect(() => {
    fin.current?.scrollIntoView({ block: "end" });
  }, [actual?.mensajes.length, sel]);

  const cerrar = () =>
    ejecutar(async () => {
      await enviar(`/api/conversaciones/${actual!.telefono}`, { accion: "cerrar" });
      recargar();
    });

  return (
    <>
      <Encabezado icono="auricular" titulo="Atención humana" subtitulo="Conversaciones derivadas del bot" usuario={usuario}>
        <CampoUsuario usuario={usuario} cambiar={setUsuario} />
      </Encabezado>

      <div className="kpis">
        <Kpi icono="chat" nombre="Conversaciones hoy" valor={datos ? deHoy.length : "—"} />
        <Kpi icono="usuario" nombre="En atención" valor={datos ? derivadas.length : "—"} tono="terracota" />
        <Kpi icono="check" nombre="Atendidas por el bot" valor={datos ? deHoy.filter((c) => !c.derivada).length : "—"} />
      </div>

      <div className="atencion">
        <section className="tarjeta sin-padding">
          <div className="cabecera-verde"><Icono n="auricular" size={22} /><h2>Conversaciones ({lista.length})</h2></div>
          <div className="lista-conv">
            <span className="buscador"><Icono n="buscar" size={18} /><input placeholder="Buscar cliente…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} aria-label="Buscar cliente" /></span>
            <div className="pestanas" style={{ gap: ".4rem" }}>
              <button className={filtro === "derivadas" ? "activo" : ""} style={{ flex: 1, padding: ".5rem" }} onClick={() => setFiltro("derivadas")}>En atención ({derivadas.length})</button>
              <button className={filtro === "todas" ? "activo" : ""} style={{ flex: 1, padding: ".5rem" }} onClick={() => setFiltro("todas")}>Todas ({todas.length})</button>
            </div>
            {!lista.length && <p className="suave" style={{ padding: ".6rem" }}>{filtro === "derivadas" ? "No hay conversaciones derivadas. 👌" : "Sin conversaciones."}</p>}
            {lista.map((c) => (
              <button key={c.telefono} className={`item-conv ${sel === c.telefono ? "activo" : ""}`} onClick={() => setSel(c.telefono)}>
                <span className="avatar">{iniciales(c.nombre ?? c.telefono)}</span>
                <span style={{ minWidth: 0 }}>
                  <b style={{ display: "block" }}>{c.nombre ?? `+${c.telefono}`}</b>
                  <span className="ultimo" style={{ display: "block" }}>{c.mensajes.at(-1)?.texto ?? ""}</span>
                </span>
                <span style={{ textAlign: "right" }}>
                  <span className="suave" style={{ display: "block" }}>{hora(c.actualizadaEn)}</span>
                  {c.derivada && <span className="insignia alerta" style={{ fontSize: ".68rem", padding: ".05rem .4rem" }}>Derivada</span>}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="tarjeta panel-chat">
          {!actual ? (
            <div style={{ margin: "auto", textAlign: "center" }} className="suave">Selecciona una conversación.</div>
          ) : (
            <>
              <div className="cabecera-verde" style={{ justifyContent: "space-between" }}>
                <span className="fila">
                  <span className="avatar" style={{ width: 42, height: 42, borderRadius: "50%", background: "#fff", color: "var(--verde-800)", display: "grid", placeItems: "center", fontWeight: 800 }}>{iniciales(actual.nombre ?? actual.telefono)}</span>
                  <span><h2>{actual.nombre ?? "Cliente"}</h2><small style={{ opacity: 0.85 }}>{actual.derivada ? `Derivada: ${actual.motivoDerivacion ?? ""}` : "Atendida por el asistente automático"}</small></span>
                </span>
                {actual.derivada && <button className="secundario" disabled={ocupado} onClick={cerrar}><Icono n="robot" size={18} /> Devolver al bot</button>}
              </div>
              <div className="chat-mensajes">
                {actual.mensajes.map((m, i) => (
                  <div key={i} className={`burbuja ${m.de === "cliente" ? "cliente" : m.de}`} style={m.de === "cliente" ? { alignSelf: "flex-start", background: "var(--burbuja-bot)", borderRadius: "4px 14px 14px 14px" } : { alignSelf: "flex-end", background: m.de === "personal" ? "var(--burbuja-cliente)" : "var(--superficie-2)", borderRadius: "14px 4px 14px 14px" }}>
                    {m.de !== "cliente" && <span className="autor" style={{ color: m.de === "bot" ? "var(--texto-3)" : "var(--ambar)" }}>{m.de === "bot" ? "🤖 Asistente" : "Personal"}</span>}
                    {m.texto}
                    <span className="hora">{hora(m.fecha)}</span>
                  </div>
                ))}
                <div ref={fin} />
              </div>
              <form
                className="redactor"
                style={{ borderTop: "1px solid var(--borde)" }}
                onSubmit={(e) => {
                  e.preventDefault();
                  const t = texto;
                  ejecutar(async () => {
                    await enviar(`/api/conversaciones/${actual.telefono}`, { accion: "responder", texto: t, usuario });
                    setTexto("");
                    recargar();
                  });
                }}
              >
                <input type="text" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribe un mensaje…" aria-label="Responder al cliente" />
                <button className="enviar" aria-label="Enviar" disabled={ocupado || !texto.trim()}><Icono n="enviar" size={20} /></button>
              </form>
              {!actual.derivada && <p className="suave" style={{ padding: "0 1rem .7rem" }}>Si respondes, tomas la conversación y el chatbot se pausa.</p>}
              {error && <p className="error-texto" style={{ padding: "0 1rem .7rem" }}>{error}</p>}
            </>
          )}
        </section>

        <aside className="columna">
          <div className="tarjeta">
            <Rama size={70} className="decor" style={{ right: 4, top: -6 }} color="var(--verde-500)" />
            <div className="tarjeta-titulo"><h2><Icono n="usuario" size={22} /> Datos del cliente</h2></div>
            {actual ? (
              <>
                <div className="dato"><Icono n="usuario" size={17} /> {actual.nombre ?? "Sin nombre"}</div>
                <div className="dato"><Icono n="telefono" size={17} /> +{actual.telefono}</div>
                <span className="insignia" style={{ marginTop: ".4rem" }}><Icono n="chat" size={14} /> Vía WhatsApp</span>
              </>
            ) : <p className="suave">—</p>}
          </div>
          <div className="tarjeta">
            <div className="tarjeta-titulo"><h2><Icono n="lista" size={22} /> Contexto del pedido</h2></div>
            {!actual ? <p className="suave">—</p> : !ultimo ? (
              <p className="suave">El cliente no tiene pedidos registrados.</p>
            ) : (
              <>
                <div className="fila entre"><span>Último pedido:</span><b>{ultimo.codigo}</b></div>
                <div className="fila entre" style={{ marginTop: ".3rem" }}><span>Estado:</span><Estado estado={ultimo.estado} /></div>
                <div className="fila entre" style={{ marginTop: ".3rem" }}><span>Total:</span><b className="mono">{soles(ultimo.total)}</b></div>
                <div className="suave" style={{ marginTop: ".5rem" }}>{ultimo.lineas.map((l) => `${l.cantidad}× ${l.nombre}`).join(", ")}</div>
                {ultimo.estado === "RECIBIDO" && <div className="aviso" style={{ margin: ".6rem 0 0" }}>Aún no entra a preparación: el cliente puede escribir “modificar mi pedido” cuando vuelva al bot (RN03).</div>}
                {pedidos.datos && pedidos.datos.pedidos.length > 1 && <div className="suave" style={{ marginTop: ".4rem" }}>{pedidos.datos.pedidos.length} pedidos en total.</div>}
              </>
            )}
          </div>
          <div className="tarjeta">
            <div className="tarjeta-titulo"><h2><Icono n="rayo" size={22} /> Acciones rápidas</h2></div>
            <div className="acciones-rapidas">
              <button disabled={!actual || ocupado} onClick={() => setTexto("¡Hola! Soy del restaurante Los Eucaliptos, ¿en qué te ayudo?")}><Icono n="chat" size={22} /> Saludar</button>
              <button disabled={!actual || ocupado} onClick={() => setTexto("Tu pedido ya está en preparación, en breve te avisamos. 🙏")}><Icono n="gorro" size={22} /> Avisar estado</button>
              <button disabled={!actual || !actual.derivada || ocupado} onClick={cerrar}><Icono n="check" size={22} /> Marcar como resuelta</button>
              <a className="boton" href="/caja" style={{ flexDirection: "column", gap: ".35rem", padding: ".85rem .5rem", background: "var(--verde-50)", color: "var(--verde-900)", border: "1px solid var(--verde-100)", borderRadius: 12, fontSize: ".88rem" }}><Icono n="lista" size={22} /> Ver pedidos</a>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
