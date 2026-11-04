"use client";
// Caja (HU12, HU13): pendientes de cobro, verificación de comprobantes y cierre de caja diario.
import { useState } from "react";
import { CampoUsuario, enviar, ESTADOS, hora, Origen, SelectorSede, soles, useAccion, useDatos, useSede, useUsuario, type PedidoUI } from "../ui";

const MEDIOS = [
  ["EFECTIVO", "Efectivo"],
  ["TARJETA", "Tarjeta"],
  ["YAPE", "Yape"],
  ["PLIN", "Plin"],
  ["TRANSFERENCIA", "Transferencia"],
] as const;
const DIGITALES = ["YAPE", "PLIN", "TRANSFERENCIA"];

interface Cierre {
  fecha: string;
  porMedio: { medio: string; etiqueta: string; cantidad: number; total: number }[];
  totalCobrado: number;
  pedidosCobrados: number;
  pendientesDeCobro: number;
  cancelados: number;
}

function FilaCobro({ p, usuario, alTerminar }: { p: PedidoUI; usuario: string; alTerminar: () => void }) {
  const [medio, setMedio] = useState<string>(p.comprobante ? "YAPE" : "EFECTIVO");
  const [verificado, setVerificado] = useState(false);
  const { error, ocupado, ejecutar } = useAccion();
  const digital = DIGITALES.includes(medio);
  return (
    <tr>
      <td><strong>{p.codigo}</strong><div className="suave">{hora(p.creadoEn)}</div></td>
      <td><Origen p={p} /><div className="suave">{p.lineas.map((l) => `${l.cantidad}× ${l.nombre}`).join(", ")}</div></td>
      <td><strong>{soles(p.total)}</strong>{p.costoDelivery ? <div className="suave">incl. delivery {soles(p.costoDelivery)}</div> : null}</td>
      <td>{ESTADOS[p.estado]}</td>
      <td>
        {p.comprobante ? (
          <a href={`/api/comprobantes/${p.id}`} target="_blank" rel="noreferrer">🧾 Ver comprobante</a>
        ) : (
          <span className="suave">—</span>
        )}
      </td>
      <td>
        <div className="fila">
          <select value={medio} onChange={(e) => setMedio(e.target.value)}>
            {MEDIOS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
          {digital && (
            <label style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <input type="checkbox" checked={verificado} onChange={(e) => setVerificado(e.target.checked)} />
              Pago verificado
            </label>
          )}
          <button
            disabled={ocupado || (digital && !verificado)}
            onClick={() => ejecutar(async () => {
              await enviar(`/api/pedidos/${p.id}`, { accion: "cobro", medio, comprobanteVerificado: verificado, usuario });
              alTerminar();
            })}
          >
            Cobrar
          </button>
        </div>
        {error && <div className="error">{error}</div>}
      </td>
    </tr>
  );
}

export default function Caja() {
  const { sedes, sedeId, cambiar } = useSede();
  const [usuario, setUsuario] = useUsuario("caja");
  const [fecha, setFecha] = useState("");
  const pendientes = useDatos<{ pedidos: PedidoUI[] }>(sedeId ? `/api/pedidos?sede=${sedeId}&vista=caja` : null, 3000);
  const cierre = useDatos<Cierre>(sedeId ? `/api/caja/cierre?sede=${sedeId}${fecha ? `&fecha=${fecha}` : ""}` : null, 5000);
  const actualizar = () => {
    pendientes.recargar();
    cierre.recargar();
  };

  return (
    <>
      <div className="fila entre" style={{ marginBottom: "1rem" }}>
        <h1>Caja</h1>
        <div className="fila">
          <SelectorSede sedes={sedes} sedeId={sedeId} cambiar={cambiar} />
          <CampoUsuario usuario={usuario} cambiar={setUsuario} />
        </div>
      </div>

      <div className="tarjeta" style={{ marginBottom: "1rem" }}>
        <h2>Pendientes de cobro ({pendientes.datos?.pedidos.length ?? 0})</h2>
        <p className="suave">Los pagos con Yape, Plin o transferencia se registran solo después de verificar el comprobante (RN06).</p>
        <div className="tabla-scroll">
          <table>
            <thead><tr><th>Pedido</th><th>Detalle</th><th>Total</th><th>Estado</th><th>Comprobante</th><th>Cobro</th></tr></thead>
            <tbody>
              {pendientes.datos?.pedidos.map((p) => <FilaCobro key={p.id} p={p} usuario={usuario} alTerminar={actualizar} />)}
            </tbody>
          </table>
          {pendientes.datos && !pendientes.datos.pedidos.length && <p className="suave">No hay pedidos pendientes de cobro.</p>}
        </div>
      </div>

      <div className="tarjeta">
        <div className="fila entre">
          <h2>Cierre de caja {cierre.datos ? `· ${cierre.datos.fecha}` : ""}</h2>
          <label style={{ display: "inline-grid" }}>
            Fecha
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </label>
        </div>
        {cierre.datos && (
          <>
            <table style={{ maxWidth: 520 }}>
              <thead><tr><th>Medio de pago</th><th>Pedidos</th><th>Total</th></tr></thead>
              <tbody>
                {cierre.datos.porMedio.map((m) => (
                  <tr key={m.medio}><td>{m.etiqueta}</td><td>{m.cantidad}</td><td>{soles(m.total)}</td></tr>
                ))}
                <tr><th>Total cobrado</th><th>{cierre.datos.pedidosCobrados}</th><th>{soles(cierre.datos.totalCobrado)}</th></tr>
              </tbody>
            </table>
            <p className="suave">
              Pedidos del día sin cobrar: {cierre.datos.pendientesDeCobro} · Cancelados: {cierre.datos.cancelados}
            </p>
            <button className="secundario" onClick={() => window.print()}>Imprimir cierre</button>
          </>
        )}
      </div>
    </>
  );
}
