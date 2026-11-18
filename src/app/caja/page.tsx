"use client";
// Caja (HU12, HU13): pendientes de cobro, verificación de comprobantes (RN06) y cierre de caja diario.
import { useState } from "react";
import { Icono, PlatoIlustracion, type NombreIcono } from "../iconos";
import {
  CampoUsuario, Desplegable, Encabezado, enviar, Estado, Franja, Historial, hora, hoyLima, Kpi, Origen, SelectorSede,
  soles, useAccion, useDatos, useSede, useUsuario, Vacio, type PedidoUI,
} from "../ui";

const MEDIOS: [string, string, NombreIcono][] = [
  ["EFECTIVO", "Efectivo", "billete"],
  ["TARJETA", "Tarjeta", "tarjeta"],
  ["YAPE", "Yape", "celular"],
  ["PLIN", "Plin", "celular"],
  ["TRANSFERENCIA", "Transferencia", "transferir"],
];
const DIGITALES = ["YAPE", "PLIN", "TRANSFERENCIA"];

interface Cierre {
  fecha: string;
  porMedio: { medio: string; etiqueta: string; cantidad: number; total: number }[];
  totalCobrado: number;
  pedidosCobrados: number;
  pendientesDeCobro: number;
  cancelados: number;
}

function Medio({ medio, etiqueta }: { medio: string; etiqueta: string }) {
  const ico = MEDIOS.find(([m]) => m === medio)?.[2] ?? "billete";
  return (
    <span className="medio">
      <span className={`ic ${medio}`}>{medio === "YAPE" || medio === "PLIN" ? <b style={{ fontSize: ".62rem" }}>{etiqueta.toLowerCase()}</b> : <Icono n={ico} size={16} />}</span>
      {etiqueta}
    </span>
  );
}

function FilaCobro({ p, usuario, alTerminar }: { p: PedidoUI; usuario: string; alTerminar: () => void }) {
  const [medio, setMedio] = useState<string>(p.comprobante ? "YAPE" : "EFECTIVO");
  const [verificado, setVerificado] = useState(false);
  const { error, ocupado, ejecutar } = useAccion();
  const digital = DIGITALES.includes(medio);
  return (
    <tr>
      <td><b>{p.codigo}</b><div className="suave">{hora(p.creadoEn)}</div></td>
      <td><Origen p={p} /><div className="suave" style={{ marginTop: 4 }}>{p.lineas.map((l) => `${l.cantidad}× ${l.nombre}`).join(", ")}</div></td>
      <td><b className="mono">{soles(p.total)}</b>{p.costoDelivery ? <div className="suave">incl. delivery {soles(p.costoDelivery)}</div> : null}</td>
      <td><Estado estado={p.estado} /></td>
      <td>
        {p.comprobante ? (
          <a href={`/api/comprobantes/${p.id}`} target="_blank" rel="noreferrer" className="fila" style={{ gap: 4 }}><Icono n="imagen" size={16} /> Ver comprobante</a>
        ) : (
          <span className="suave">—</span>
        )}
      </td>
      <td>
        <div className="fila">
          <select value={medio} onChange={(e) => { setMedio(e.target.value); setVerificado(false); }} aria-label={`Medio de pago de ${p.codigo}`}>
            {MEDIOS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
          {digital && (
            <label className="fila" style={{ gap: 6, fontSize: ".85rem", fontWeight: 600 }}>
              <span className="interruptor"><input type="checkbox" checked={verificado} onChange={(e) => setVerificado(e.target.checked)} /><span /></span>
              Pago verificado
            </label>
          )}
          <button
            disabled={ocupado || (digital && !verificado)}
            title={digital && !verificado ? "Primero verifica el comprobante (RN06)" : undefined}
            onClick={() => ejecutar(async () => {
              await enviar(`/api/pedidos/${p.id}`, { accion: "cobro", medio, comprobanteVerificado: verificado, usuario });
              alTerminar();
            })}
          >
            <Icono n="monedas" size={17} /> Cobrar
          </button>
          <Desplegable etiqueta={`Historial de ${p.codigo}`}><b>Historial de {p.codigo}</b><div style={{ marginTop: ".6rem" }}><Historial eventos={p.eventos} /></div></Desplegable>
        </div>
        {error && <div className="error-texto">{error}</div>}
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
  const hoy = useDatos<Cierre>(sedeId ? `/api/caja/cierre?sede=${sedeId}` : null, 5000);
  const actualizar = () => {
    pendientes.recargar();
    cierre.recargar();
    hoy.recargar();
  };
  const lista = pendientes.datos?.pedidos ?? [];
  const porVerificar = lista.filter((p) => p.comprobante && !p.comprobante.verificado).length;

  return (
    <>
      <Encabezado icono="caja" titulo="Caja" subtitulo="Gestión de cobros y cierre de caja" usuario={usuario}>
        <SelectorSede sedes={sedes} sedeId={sedeId} cambiar={cambiar} />
        <CampoUsuario usuario={usuario} cambiar={setUsuario} />
      </Encabezado>

      <div className="kpis">
        <Kpi icono="carrito" nombre="Pendientes de cobro" valor={pendientes.datos ? lista.length : "—"} tono="ambar" />
        <Kpi icono="check" nombre="Cobrados hoy" valor={hoy.datos ? hoy.datos.pedidosCobrados : "—"} />
        <Kpi icono="monedas" nombre="Total del día" valor={hoy.datos ? soles(hoy.datos.totalCobrado) : "—"} />
        <Kpi icono="imagen" nombre="Comprobantes por verificar" valor={pendientes.datos ? porVerificar : "—"} tono="terracota" />
      </div>

      <Franja icono="lista" titulo={`Pendientes de cobro (${lista.length})`} texto="Los pagos con Yape, Plin o transferencia se registran solo después de verificar el comprobante (RN06).">
        <PlatoIlustracion size={170} />
      </Franja>
      <div className="panel-cuerpo" style={{ minHeight: 0, marginBottom: "1.2rem" }}>
        {pendientes.datos && !lista.length ? (
          <Vacio icono="lista" titulo="No hay pedidos pendientes de cobro." />
        ) : (
          <div className="tabla-scroll">
            <table className="clara">
              <thead><tr><th>Pedido</th><th>Detalle</th><th>Total</th><th>Estado</th><th>Comprobante</th><th>Cobro</th></tr></thead>
              <tbody>{lista.map((p) => <FilaCobro key={p.id} p={p} usuario={usuario} alTerminar={actualizar} />)}</tbody>
            </table>
          </div>
        )}
      </div>

      <div className="caja-layout">
        <div className="tarjeta">
          <div className="tarjeta-titulo"><h2><Icono n="calendario" size={22} /> Cierre de caja {cierre.datos ? `· ${cierre.datos.fecha}` : ""}</h2></div>
          {cierre.datos && (
            <div className="tabla-scroll">
              <table>
                <thead><tr><th>Medio de pago</th><th>Pedidos</th><th>Total</th></tr></thead>
                <tbody>
                  {cierre.datos.porMedio.map((m) => (
                    <tr key={m.medio}><td><Medio medio={m.medio} etiqueta={m.etiqueta} /></td><td className="mono">{m.cantidad}</td><td className="mono">{soles(m.total)}</td></tr>
                  ))}
                </tbody>
                <tfoot><tr><td>TOTAL COBRADO</td><td className="mono">{cierre.datos.pedidosCobrados}</td><td className="mono">{soles(cierre.datos.totalCobrado)}</td></tr></tfoot>
              </table>
            </div>
          )}
        </div>
        <div className="tarjeta columna">
          <div className="tarjeta-titulo" style={{ margin: 0 }}><h2><Icono n="calendario" size={22} /> Fecha del cierre</h2></div>
          <input type="date" value={fecha || hoyLima()} max={hoyLima()} onChange={(e) => setFecha(e.target.value)} aria-label="Fecha del cierre" />
          <p className="suave">Elige una fecha anterior para consultar el historial de cierres.</p>
          {cierre.datos && (
            <div style={{ background: "var(--verde-50)", borderRadius: 12, padding: ".9rem 1rem" }}>
              <div className="fila entre"><span><Icono n="lista" size={16} /> Pedidos del día sin cobrar:</span><b>{cierre.datos.pendientesDeCobro}</b></div>
              <div className="fila entre" style={{ marginTop: ".3rem" }}><span><Icono n="prohibido" size={16} /> Cancelados:</span><b>{cierre.datos.cancelados}</b></div>
            </div>
          )}
          <button className="grande bloque" onClick={() => window.print()}><Icono n="impresora" size={20} /> Imprimir cierre</button>
        </div>
      </div>
    </>
  );
}
