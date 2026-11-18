"use client";
// Panel de cocina (HU08, HU10, CU13): pedidos de la sede en orden de llegada, en tiempo real.
import { useState } from "react";
import { Icono, PlatoIlustracion, Rama } from "../iconos";
import {
  CampoUsuario, Encabezado, enviar, Estado, Franja, hora, Kpi, minutosDesde, Origen, SelectorSede,
  useAccion, useDatos, useSede, useUsuario, Vacio, type PedidoUI,
} from "../ui";

type Pestana = "RECIBIDO" | "EN_PREPARACION" | "LISTO" | "TODOS";

export default function Cocina() {
  const { sedes, sedeId, cambiar } = useSede();
  const [usuario, setUsuario] = useUsuario("cocina");
  const [pestana, setPestana] = useState<Pestana>("TODOS");
  const activos = useDatos<{ pedidos: PedidoUI[]; cancelados: PedidoUI[]; ahora: string; tiempoObjetivoMin: number }>(
    sedeId ? `/api/pedidos?sede=${sedeId}&vista=cocina` : null,
    2000,
  );
  const dia = useDatos<{ pedidos: PedidoUI[] }>(sedeId ? `/api/pedidos?sede=${sedeId}&vista=dia` : null, 4000);
  const { error, ocupado, ejecutar } = useAccion();
  const [ocultos, setOcultos] = useState<string[]>([]);

  const ahora = activos.datos ? new Date(activos.datos.ahora).getTime() : Date.now();
  const pendientes = activos.datos?.pedidos ?? [];
  const listos = (dia.datos?.pedidos ?? []).filter((p) => p.estado === "LISTO").sort((a, b) => a.creadoEn.localeCompare(b.creadoEn));
  const recibidos = pendientes.filter((p) => p.estado === "RECIBIDO");
  const enPrep = pendientes.filter((p) => p.estado === "EN_PREPARACION");
  const delDia = (dia.datos?.pedidos ?? []).filter((p) => p.estado !== "CANCELADO").length;
  const visibles = pestana === "RECIBIDO" ? recibidos : pestana === "EN_PREPARACION" ? enPrep : pestana === "LISTO" ? listos : pendientes;
  const cancelados = (activos.datos?.cancelados ?? []).filter((p) => !ocultos.includes(p.id));

  const accion = (id: string, cuerpo: Record<string, unknown>) =>
    ejecutar(async () => {
      await enviar(`/api/pedidos/${id}`, { ...cuerpo, usuario });
      await Promise.all([activos.recargar(), dia.recargar()]);
    });

  return (
    <div className="cocina">
      <Encabezado icono="gorro" titulo="Cocina" subtitulo="Gestión de pedidos en cocina" usuario={usuario}>
        <SelectorSede sedes={sedes} sedeId={sedeId} cambiar={cambiar} />
        <CampoUsuario usuario={usuario} cambiar={setUsuario} />
      </Encabezado>

      <div className="kpis">
        <Kpi icono="campana" nombre="Pedidos del día" valor={dia.datos ? delDia : "—"} />
        <Kpi icono="reloj" nombre="Por empezar" valor={activos.datos ? recibidos.length : "—"} tono="azul" />
        <Kpi icono="cubiertos" nombre="En preparación" valor={activos.datos ? enPrep.length : "—"} tono="ambar" />
        <Kpi icono="check" nombre="Listos" valor={dia.datos ? listos.length : "—"} />
      </div>

      {activos.error && <div className="aviso error"><Icono n="alerta" size={18} /> Sin conexión con el servidor: reintentando… ({activos.error})</div>}
      {cancelados.map((p) => (
        <div key={p.id} className="aviso error">
          <Icono n="prohibido" size={18} />
          <span><b>{p.codigo}</b> fue cancelado {p.eventos.at(-1)?.usuario === "cliente" ? "por el cliente" : "por el personal"} a las {hora(p.actualizadoEn)}. Retíralo de preparación. {p.motivoCancelacion && <span className="suave">({p.motivoCancelacion})</span>}</span>
          <button className="fantasma" style={{ marginLeft: "auto" }} onClick={() => setOcultos([...ocultos, p.id])}>Entendido</button>
        </div>
      ))}
      {error && <div className="aviso error"><Icono n="alerta" size={18} /> {error}</div>}

      <Franja icono="hoja" titulo="Cocina" texto="Pedidos en tiempo real, en orden de llegada">
        <PlatoIlustracion size={190} />
      </Franja>
      <div className="panel-cuerpo">
        <Rama size={110} className="decor d1" color="var(--verde-500)" />
        <div className="pestanas" style={{ marginBottom: "1.2rem" }}>
          <button className={pestana === "TODOS" ? "activo" : ""} onClick={() => setPestana("TODOS")}><Icono n="capas" size={18} /> Pendientes ({pendientes.length})</button>
          <button className={pestana === "RECIBIDO" ? "activo" : ""} onClick={() => setPestana("RECIBIDO")}><Icono n="reloj" size={18} /> Por empezar ({recibidos.length})</button>
          <button className={pestana === "EN_PREPARACION" ? "activo" : ""} onClick={() => setPestana("EN_PREPARACION")}><Icono n="gorro" size={18} /> En preparación ({enPrep.length})</button>
          <button className={pestana === "LISTO" ? "activo" : ""} onClick={() => setPestana("LISTO")}><Icono n="check" size={18} /> Listos ({listos.length})</button>
        </div>

        {activos.datos && !visibles.length ? (
          <Vacio
            icono="campana"
            titulo={pestana === "LISTO" ? "No hay pedidos listos" : "No hay pedidos pendientes"}
            texto="Cuando ingrese un nuevo pedido, se mostrará aquí automáticamente."
          >
            <button className="secundario pildora" onClick={() => { activos.recargar(); dia.recargar(); }}><Icono n="actualizar" size={18} /> Actualizar</button>
          </Vacio>
        ) : (
          <div className="rejilla">
            {visibles.map((p, i) => {
              const min = minutosDesde(p.creadoEn, ahora);
              const demorado = p.estado !== "LISTO" && min > (activos.datos?.tiempoObjetivoMin ?? 20);
              return (
                <article key={p.id} className={`tarjeta pedido est-${p.estado} ${demorado ? "demorado" : ""}`}>
                  <div className="fila entre">
                    <span className="codigo">{pestana === "LISTO" ? "" : `#${i + 1} · `}{p.codigo}</span>
                    <span className={`reloj ${demorado ? "alerta" : ""}`}><Icono n="reloj" size={16} /> {min} min</span>
                  </div>
                  <Origen p={p} />
                  <div className="fila entre">
                    <span className="suave">Llegó {hora(p.creadoEn)}</span>
                    <Estado estado={p.estado} />
                  </div>
                  <div className="lineas">
                    {p.lineas.map((l, j) => (
                      <div key={j}>
                        <b>{l.cantidad} ×</b> {l.nombre}
                        {l.observacion && <span className="obs"><Icono n="alerta" size={15} /> {l.observacion}</span>}
                      </div>
                    ))}
                  </div>
                  <div className="fila">
                    {p.estado === "RECIBIDO" && (
                      <button className="grande" disabled={ocupado} onClick={() => accion(p.id, { accion: "estado", estado: "EN_PREPARACION" })}>
                        <Icono n="gorro" size={20} /> Empezar preparación
                      </button>
                    )}
                    {p.estado === "EN_PREPARACION" && (
                      <button className="grande" disabled={ocupado} onClick={() => accion(p.id, { accion: "estado", estado: "LISTO" })}>
                        <Icono n="check" size={20} /> Listo
                      </button>
                    )}
                    {p.estado === "LISTO" && <span className="suave">Esperando entrega {p.modalidad === "DELIVERY" ? "al repartidor" : "al cliente"}.</span>}
                    {p.estado !== "LISTO" && (
                      <button
                        className="peligro-borde"
                        disabled={ocupado}
                        onClick={() => {
                          const motivo = prompt(`Motivo de la cancelación de ${p.codigo}:`);
                          if (motivo?.trim()) accion(p.id, { accion: "cancelar", motivo });
                        }}
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
