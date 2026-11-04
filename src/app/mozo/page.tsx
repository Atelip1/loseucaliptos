"use client";
// Registro de pedidos de mesa desde tablet o celular (HU09) y entrega de pedidos listos en el local.
import { useMemo, useState } from "react";
import { CampoUsuario, enviar, ESTADOS, hora, Origen, SelectorSede, soles, useAccion, useDatos, useSede, useUsuario, type PedidoUI } from "../ui";

interface PlatoUI {
  id: string;
  nombre: string;
  categoria: string;
  precio: number;
  agotado: boolean;
}

export default function Mozo() {
  const { sedes, sedeId, cambiar } = useSede();
  const [usuario, setUsuario] = useUsuario("mozo");
  const carta = useDatos<{ platos: PlatoUI[] }>(sedeId ? `/api/carta?sede=${sedeId}` : null, 10000);
  const pedidos = useDatos<{ pedidos: PedidoUI[] }>(sedeId ? `/api/pedidos?sede=${sedeId}&vista=dia` : null, 3000);
  const [mesa, setMesa] = useState("");
  const [modalidad, setModalidad] = useState<"EN_LOCAL" | "PARA_LLEVAR">("EN_LOCAL");
  const [cliente, setCliente] = useState("");
  const [items, setItems] = useState<Record<string, { cantidad: number; observacion: string }>>({});
  const { error, ocupado, ejecutar } = useAccion();
  const [ok, setOk] = useState<string | null>(null);

  const platos = carta.datos?.platos ?? [];
  const porCategoria = useMemo(() => {
    const m = new Map<string, PlatoUI[]>();
    for (const p of platos) m.set(p.categoria, [...(m.get(p.categoria) ?? []), p]);
    return [...m.entries()];
  }, [platos]);
  const total = Object.entries(items).reduce((s, [id, it]) => s + (platos.find((p) => p.id === id)?.precio ?? 0) * it.cantidad, 0);

  const cambiarCantidad = (id: string, delta: number) =>
    setItems((prev) => {
      const actual = prev[id]?.cantidad ?? 0;
      const n = Math.max(0, Math.min(50, actual + delta));
      const copia = { ...prev };
      if (n === 0) delete copia[id];
      else copia[id] = { cantidad: n, observacion: prev[id]?.observacion ?? "" };
      return copia;
    });

  const registrar = () =>
    ejecutar(async () => {
      const p = await enviar<PedidoUI>("/api/pedidos", {
        sedeId,
        mesa,
        modalidad,
        clienteNombre: cliente,
        usuario,
        lineas: Object.entries(items).map(([platoId, it]) => ({ platoId, cantidad: it.cantidad, observacion: it.observacion })),
      });
      setItems({});
      setMesa("");
      setCliente("");
      setOk(`Pedido ${p.codigo} enviado a cocina.`);
      pedidos.recargar();
    });

  const listos = (pedidos.datos?.pedidos ?? []).filter((p) => p.estado === "LISTO" && p.modalidad !== "DELIVERY");
  const delDia = (pedidos.datos?.pedidos ?? []).filter((p) => p.canal === "PRESENCIAL");

  return (
    <>
      <div className="fila entre" style={{ marginBottom: "1rem" }}>
        <h1>Mozo · pedidos de mesa</h1>
        <div className="fila">
          <SelectorSede sedes={sedes} sedeId={sedeId} cambiar={cambiar} />
          <CampoUsuario usuario={usuario} cambiar={setUsuario} />
        </div>
      </div>

      {listos.length > 0 && (
        <div className="tarjeta" style={{ marginBottom: "1rem", borderColor: "var(--verde)" }}>
          <h2>✅ Listos para entregar</h2>
          {listos.map((p) => (
            <div key={p.id} className="fila entre" style={{ padding: ".3rem 0" }}>
              <span>
                <strong>{p.codigo}</strong> <Origen p={p} />
              </span>
              <button
                disabled={ocupado}
                onClick={() => ejecutar(async () => { await enviar(`/api/pedidos/${p.id}`, { accion: "estado", estado: "ENTREGADO", usuario }); pedidos.recargar(); })}
              >
                Entregado
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "minmax(0, 2fr) minmax(260px, 1fr)" }} className="mozo-rejilla">
        <div className="tarjeta">
          {porCategoria.map(([cat, ps]) => (
            <div key={cat} style={{ marginBottom: ".8rem" }}>
              <h2>{cat}</h2>
              {ps.map((p) => (
                <div key={p.id} className="fila entre" style={{ padding: ".25rem 0", borderBottom: "1px solid var(--borde)" }}>
                  <span style={{ opacity: p.agotado ? 0.5 : 1 }}>
                    {p.nombre} <span className="suave">{soles(p.precio)}</span>
                    {p.agotado && <span className="etiqueta alerta" style={{ marginLeft: 6 }}>Agotado</span>}
                  </span>
                  <span className="fila">
                    <button className="secundario" disabled={!items[p.id]} onClick={() => cambiarCantidad(p.id, -1)}>−</button>
                    <strong style={{ minWidth: 20, textAlign: "center" }}>{items[p.id]?.cantidad ?? 0}</strong>
                    <button disabled={p.agotado} onClick={() => cambiarCantidad(p.id, 1)}>+</button>
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="tarjeta" style={{ alignSelf: "start" }}>
          <h2>Nuevo pedido</h2>
          <div className="fila">
            <label>
              Modalidad
              <select value={modalidad} onChange={(e) => setModalidad(e.target.value as "EN_LOCAL" | "PARA_LLEVAR")}>
                <option value="EN_LOCAL">Mesa</option>
                <option value="PARA_LLEVAR">Para llevar</option>
              </select>
            </label>
            {modalidad === "EN_LOCAL" ? (
              <label>
                N.° de mesa
                <input value={mesa} onChange={(e) => setMesa(e.target.value)} style={{ width: 80 }} />
              </label>
            ) : (
              <label>
                Cliente
                <input value={cliente} onChange={(e) => setCliente(e.target.value)} style={{ width: 130 }} />
              </label>
            )}
          </div>
          <div style={{ margin: ".8rem 0" }}>
            {!Object.keys(items).length && <p className="suave">Agrega platos con “+”.</p>}
            {Object.entries(items).map(([id, it]) => (
              <div key={id} style={{ marginBottom: ".4rem" }}>
                <strong>{it.cantidad} ×</strong> {platos.find((p) => p.id === id)?.nombre}
                <input
                  placeholder="Observación (ej. sin ají)"
                  value={it.observacion}
                  onChange={(e) => setItems((prev) => ({ ...prev, [id]: { ...prev[id], observacion: e.target.value } }))}
                  style={{ width: "100%", marginTop: 2 }}
                />
              </div>
            ))}
          </div>
          <div className="fila entre">
            <strong>Total: {soles(total)}</strong>
            <button disabled={ocupado || !Object.keys(items).length} onClick={registrar}>Enviar a cocina</button>
          </div>
          {error && <p className="error">{error}</p>}
          {ok && <p style={{ color: "var(--verde)" }}>{ok}</p>}
        </div>
      </div>

      <div className="tarjeta" style={{ marginTop: "1rem" }}>
        <h2>Pedidos presenciales de hoy</h2>
        <div className="tabla-scroll">
          <table>
            <thead><tr><th>Código</th><th>Hora</th><th>Mesa / cliente</th><th>Platos</th><th>Total</th><th>Estado</th></tr></thead>
            <tbody>
              {delDia.map((p) => (
                <tr key={p.id}>
                  <td>{p.codigo}</td>
                  <td>{hora(p.creadoEn)}</td>
                  <td>{p.mesa ? `Mesa ${p.mesa}` : p.clienteNombre ?? "Para llevar"}</td>
                  <td>{p.lineas.map((l) => `${l.cantidad}× ${l.nombre}`).join(", ")}</td>
                  <td>{soles(p.total)}</td>
                  <td>{ESTADOS[p.estado]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <style>{`@media (max-width: 760px) { .mozo-rejilla { grid-template-columns: 1fr !important; } }`}</style>
    </>
  );
}
