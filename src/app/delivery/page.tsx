"use client";
// Delivery (HU14, HU15): pedidos con dirección y ubicación, repartidor y registro de entrega.
import { useState } from "react";
import { CampoUsuario, enviar, ESTADOS, hora, SelectorSede, soles, useAccion, useDatos, useSede, useUsuario, type PedidoUI } from "../ui";

function TarjetaDelivery({ p, usuario, alTerminar }: { p: PedidoUI; usuario: string; alTerminar: () => void }) {
  const [repartidor, setRepartidor] = useState(p.repartidor ?? usuario);
  const { error, ocupado, ejecutar } = useAccion();
  const accion = (cuerpo: Record<string, unknown>) =>
    ejecutar(async () => {
      await enviar(`/api/pedidos/${p.id}`, { ...cuerpo, usuario });
      alTerminar();
    });
  const u = p.entrega?.ubicacion;
  const mapa = u
    ? `https://www.google.com/maps/search/?api=1&query=${u.lat},${u.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.entrega?.direccion ?? ""}, ${p.entrega?.zonaNombre ?? ""}, Chincha`)}`;

  return (
    <div className="tarjeta">
      <div className="fila entre">
        <h2>{p.codigo}</h2>
        <span className={`etiqueta ${p.estado === "LISTO" ? "ambar" : ""}`}>{ESTADOS[p.estado]}</span>
      </div>
      <div><strong>{p.clienteNombre ?? "Cliente"}</strong> {p.clienteTelefono && <a href={`tel:+${p.clienteTelefono}`}>+{p.clienteTelefono}</a>}</div>
      <div>📍 {p.entrega?.direccion} — <span className="suave">{p.entrega?.zonaNombre}</span></div>
      <div className="suave">Referencia: {p.entrega?.referencia || "—"}</div>
      <div><a href={mapa} target="_blank" rel="noreferrer">{u ? "Abrir ubicación compartida" : "Buscar dirección en el mapa"}</a></div>
      <div className="suave" style={{ margin: ".4rem 0" }}>{p.lineas.map((l) => `${l.cantidad}× ${l.nombre}`).join(", ")}</div>
      <div>
        Total <strong>{soles(p.total)}</strong> · {p.pago ? <span className="etiqueta">Pagado ({p.pago.medio})</span> : <span className="etiqueta alerta">Cobrar al entregar</span>}
      </div>
      <div className="suave">Pedido {hora(p.creadoEn)}</div>
      <div className="fila" style={{ marginTop: ".6rem" }}>
        <input value={repartidor} onChange={(e) => setRepartidor(e.target.value)} placeholder="Repartidor" style={{ width: 130 }} />
        <button className="secundario" disabled={ocupado || !repartidor.trim() || repartidor === p.repartidor} onClick={() => accion({ accion: "repartidor", repartidor })}>
          Asignar
        </button>
        {p.estado === "LISTO" && (
          <button disabled={ocupado} onClick={() => accion({ accion: "estado", estado: "EN_CAMINO" })}>🛵 En camino</button>
        )}
        {p.estado === "EN_CAMINO" && (
          <button disabled={ocupado} onClick={() => accion({ accion: "estado", estado: "ENTREGADO" })}>✅ Entregado</button>
        )}
      </div>
      {p.repartidor && <div className="suave">Repartidor: {p.repartidor}</div>}
      {error && <div className="error">{error}</div>}
    </div>
  );
}

export default function Delivery() {
  const { sedes, sedeId, cambiar } = useSede();
  const [usuario, setUsuario] = useUsuario("repartidor");
  const { datos, recargar } = useDatos<{ pedidos: PedidoUI[] }>(sedeId ? `/api/pedidos?sede=${sedeId}&vista=delivery` : null, 3000);
  const listos = datos?.pedidos.filter((p) => ["LISTO", "EN_CAMINO"].includes(p.estado)) ?? [];
  const enCocina = datos?.pedidos.filter((p) => ["RECIBIDO", "EN_PREPARACION"].includes(p.estado)) ?? [];

  return (
    <>
      <div className="fila entre" style={{ marginBottom: "1rem" }}>
        <h1>Delivery</h1>
        <div className="fila">
          <SelectorSede sedes={sedes} sedeId={sedeId} cambiar={cambiar} />
          <CampoUsuario usuario={usuario} cambiar={setUsuario} />
        </div>
      </div>
      <h2>Para despachar y en camino ({listos.length})</h2>
      {!listos.length && <p className="suave">No hay pedidos listos para reparto.</p>}
      <div className="rejilla">{listos.map((p) => <TarjetaDelivery key={p.id} p={p} usuario={usuario} alTerminar={recargar} />)}</div>
      <h2 style={{ marginTop: "1.5rem" }}>En cocina ({enCocina.length})</h2>
      <div className="rejilla">{enCocina.map((p) => <TarjetaDelivery key={p.id} p={p} usuario={usuario} alTerminar={recargar} />)}</div>
    </>
  );
}
