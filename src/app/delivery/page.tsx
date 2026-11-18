"use client";
// Delivery (HU14, HU15): pedidos con dirección y ubicación, repartidor, "En camino", entrega e historial.
import { useState } from "react";
import { Icono, Rama } from "../iconos";
import {
  CampoUsuario, Desplegable, Encabezado, enviar, Estado, Historial, hora, iniciales, Kpi, SelectorSede, soles,
  useAccion, useDatos, useSede, useUsuario, Vacio, type PedidoUI,
} from "../ui";

function enlaceMapa(p: PedidoUI) {
  const u = p.entrega?.ubicacion;
  return u
    ? `https://www.google.com/maps/search/?api=1&query=${u.lat},${u.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.entrega?.direccion ?? ""}, ${p.entrega?.zonaNombre ?? ""}, Chincha`)}`;
}

function TarjetaDelivery({ p, usuario, alTerminar }: { p: PedidoUI; usuario: string; alTerminar: () => void }) {
  const [repartidor, setRepartidor] = useState(p.repartidor ?? "");
  const { error, ocupado, ejecutar } = useAccion();
  const accion = (cuerpo: Record<string, unknown>) =>
    ejecutar(async () => {
      await enviar(`/api/pedidos/${p.id}`, { ...cuerpo, usuario });
      alTerminar();
    });

  return (
    <article className={`tarjeta pedido est-${p.estado}`}>
      <div className="fila entre">
        <span className="codigo">{p.codigo}</span>
        <Estado estado={p.estado} />
      </div>
      <div className="dato"><Icono n="usuario" size={17} /> <b>{p.clienteNombre ?? "Cliente"}</b>{p.clienteTelefono && <a href={`tel:+${p.clienteTelefono}`} className="suave">+{p.clienteTelefono}</a>}</div>
      <div className="dato"><Icono n="pin" size={17} /> <span>{p.entrega?.direccion} <span className="suave">· {p.entrega?.zonaNombre}</span></span></div>
      <div className="suave" style={{ paddingLeft: 26 }}>Referencia: {p.entrega?.referencia || "—"}</div>
      <a href={enlaceMapa(p)} target="_blank" rel="noreferrer" className="dato"><Icono n="mapa" size={17} /> {p.entrega?.ubicacion ? "Abrir ubicación compartida" : "Buscar dirección en el mapa"}</a>
      <div className="lineas suave">{p.lineas.map((l) => `${l.cantidad}× ${l.nombre}`).join(", ")}</div>
      <div className="fila entre">
        <span>Total <b className="mono">{soles(p.total)}</b></span>
        {p.pago ? <span className="insignia">Pagado · {p.pago.medio}</span> : <span className="insignia alerta">Cobrar al entregar</span>}
      </div>
      <div className="fila">
        <span className="caja-control" style={{ height: 38, flex: 1, minWidth: 140 }}>
          <Icono n="usuario" size={16} />
          <input value={repartidor} onChange={(e) => setRepartidor(e.target.value)} placeholder="Repartidor" aria-label={`Repartidor de ${p.codigo}`} />
        </span>
        <button className="secundario" disabled={ocupado || !repartidor.trim() || repartidor === p.repartidor} onClick={() => accion({ accion: "repartidor", repartidor })}>Asignar</button>
      </div>
      <div className="fila">
        {p.estado === "LISTO" && <button disabled={ocupado} onClick={() => accion({ accion: "estado", estado: "EN_CAMINO" })}><Icono n="moto" size={18} /> En camino</button>}
        {p.estado === "EN_CAMINO" && <button disabled={ocupado} onClick={() => accion({ accion: "estado", estado: "ENTREGADO" })}><Icono n="check" size={18} /> Confirmar entrega</button>}
        {["RECIBIDO", "EN_PREPARACION"].includes(p.estado) && <span className="suave">Se podrá despachar cuando cocina lo marque como listo.</span>}
        <span style={{ marginLeft: "auto" }}>
          <Desplegable etiqueta={`Historial de ${p.codigo}`}><b>Historial de {p.codigo}</b><div style={{ marginTop: ".6rem" }}><Historial eventos={p.eventos} /></div></Desplegable>
        </span>
      </div>
      {error && <div className="error-texto">{error}</div>}
    </article>
  );
}

export default function Delivery() {
  const { sedes, sedeId, cambiar } = useSede();
  const [usuario, setUsuario] = useUsuario("repartidor");
  const activos = useDatos<{ pedidos: PedidoUI[] }>(sedeId ? `/api/pedidos?sede=${sedeId}&vista=delivery` : null, 3000);
  const dia = useDatos<{ pedidos: PedidoUI[] }>(sedeId ? `/api/pedidos?sede=${sedeId}&vista=dia` : null, 5000);
  const recargar = () => {
    activos.recargar();
    dia.recargar();
  };
  const lista = activos.datos?.pedidos ?? [];
  const despachar = lista.filter((p) => ["LISTO", "EN_CAMINO"].includes(p.estado));
  const enCocina = lista.filter((p) => ["RECIBIDO", "EN_PREPARACION"].includes(p.estado));
  const deliveryHoy = (dia.datos?.pedidos ?? []).filter((p) => p.modalidad === "DELIVERY");
  const entregados = deliveryHoy.filter((p) => p.estado === "ENTREGADO");

  const repartidores = new Map<string, { activos: number; entregados: number }>();
  for (const p of deliveryHoy) {
    if (!p.repartidor) continue;
    const r = repartidores.get(p.repartidor) ?? { activos: 0, entregados: 0 };
    if (p.estado === "ENTREGADO") r.entregados++;
    else if (p.estado !== "CANCELADO") r.activos++;
    repartidores.set(p.repartidor, r);
  }
  const conUbicacion = despachar.filter((p) => p.entrega);
  const ruta = conUbicacion.length
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(conUbicacion.at(-1)!.entrega!.ubicacion ? `${conUbicacion.at(-1)!.entrega!.ubicacion!.lat},${conUbicacion.at(-1)!.entrega!.ubicacion!.lng}` : `${conUbicacion.at(-1)!.entrega!.direccion}, Chincha`)}${conUbicacion.length > 1 ? `&waypoints=${encodeURIComponent(conUbicacion.slice(0, -1).map((p) => (p.entrega!.ubicacion ? `${p.entrega!.ubicacion.lat},${p.entrega!.ubicacion.lng}` : `${p.entrega!.direccion}, Chincha`)).join("|"))}` : ""}`
    : null;

  return (
    <>
      <Encabezado icono="moto" titulo="Delivery" subtitulo="Gestión de pedidos a domicilio" usuario={usuario}>
        <SelectorSede sedes={sedes} sedeId={sedeId} cambiar={cambiar} />
        <CampoUsuario usuario={usuario} cambiar={setUsuario} />
      </Encabezado>

      <div className="kpis">
        <Kpi icono="paquete" nombre="Pedidos hoy" valor={dia.datos ? deliveryHoy.filter((p) => p.estado !== "CANCELADO").length : "—"} />
        <Kpi icono="gorro" nombre="En cocina" valor={activos.datos ? enCocina.length : "—"} tono="ambar" />
        <Kpi icono="moto" nombre="Por despachar / en camino" valor={activos.datos ? despachar.length : "—"} tono="azul" />
        <Kpi icono="check" nombre="Entregados" valor={dia.datos ? entregados.length : "—"} />
      </div>

      <div className="delivery-layout">
        <section>
          <div className="cabecera-verde" style={{ borderRadius: "16px 16px 0 0" }}><Icono n="moto" size={24} /><h2>Para despachar y en camino ({despachar.length})</h2></div>
          <div className="panel-cuerpo" style={{ minHeight: 260 }}>
            {activos.datos && !despachar.length ? (
              <Vacio icono="moto" titulo="No hay pedidos listos para reparto." texto="Cuando un pedido esté listo en cocina, se mostrará aquí." />
            ) : (
              <div className="columna">{despachar.map((p) => <TarjetaDelivery key={p.id} p={p} usuario={usuario} alTerminar={recargar} />)}</div>
            )}
          </div>
        </section>
        <section>
          <div className="cabecera-verde" style={{ borderRadius: "16px 16px 0 0" }}><Icono n="gorro" size={24} /><h2>En cocina ({enCocina.length})</h2></div>
          <div className="panel-cuerpo" style={{ minHeight: 260 }}>
            {activos.datos && !enCocina.length ? (
              <Vacio icono="gorro" titulo="No hay pedidos en cocina." texto="Los pedidos confirmados se mostrarán aquí mientras se preparan." />
            ) : (
              <div className="columna">{enCocina.map((p) => <TarjetaDelivery key={p.id} p={p} usuario={usuario} alTerminar={recargar} />)}</div>
            )}
          </div>
        </section>
        <aside className="columna">
          <div className="tarjeta">
            <div className="tarjeta-titulo"><h2><Icono n="mapa" size={22} /> Mapa de repartos</h2></div>
            <div className="mapa-falso">
              <svg viewBox="0 0 300 200" width="100%" height="100%" aria-hidden>
                <path d="M40 150 C 90 120, 120 160, 160 120 S 230 80, 260 60" stroke="var(--verde-600)" strokeWidth="3" strokeDasharray="8 7" fill="none" />
                <circle cx="40" cy="150" r="12" fill="var(--verde-700)" /><circle cx="40" cy="150" r="5" fill="#fff" />
                {conUbicacion.slice(0, 3).map((_, i) => <circle key={i} cx={130 + i * 60} cy={140 - i * 38} r="9" fill="var(--terracota)" stroke="#fff" strokeWidth="3" />)}
              </svg>
            </div>
            {ruta ? (
              <a className="boton secundario" style={{ marginTop: ".7rem", width: "100%" }} href={ruta} target="_blank" rel="noreferrer"><Icono n="mapa" size={18} /> Ver ruta en Google Maps ({conUbicacion.length})</a>
            ) : (
              <p className="suave" style={{ marginTop: ".6rem" }}>Sin repartos pendientes.</p>
            )}
          </div>
          <div className="tarjeta">
            <div className="tarjeta-titulo"><h2><Icono n="usuarios" size={22} /> Repartidores</h2></div>
            {!repartidores.size ? (
              <p className="suave">Aún no se asignaron repartidores hoy.</p>
            ) : (
              [...repartidores.entries()].map(([nombre, r]) => (
                <div key={nombre} className="fila entre" style={{ padding: ".4rem 0", borderBottom: "1px dashed var(--borde)" }}>
                  <span className="fila"><span className="perfil" style={{ padding: 0, border: 0, boxShadow: "none" }}><span className="avatar" style={{ width: 34, height: 34, fontSize: ".8rem" }}>{iniciales(nombre)}</span></span><b>{nombre}</b></span>
                  {r.activos ? <span className="insignia e-EN_CAMINO">{r.activos} en curso</span> : <span className="insignia">Disponible · {r.entregados} entregados</span>}
                </div>
              ))
            )}
          </div>
        </aside>

        <div className="tarjeta ancho-2">
          <div className="tarjeta-titulo"><h2><Icono n="lista" size={22} /> Historial de entregas (hoy)</h2><Rama size={60} color="var(--verde-500)" /></div>
          {!entregados.length ? (
            <p className="suave">Todavía no hay entregas registradas hoy.</p>
          ) : (
            <div className="tabla-scroll">
              <table>
                <thead><tr><th>Pedido</th><th>Cliente</th><th>Dirección</th><th>Total</th><th>Repartidor</th><th>Estado</th><th></th></tr></thead>
                <tbody>
                  {entregados.map((p) => (
                    <tr key={p.id}>
                      <td><b>{p.codigo}</b></td>
                      <td>{p.clienteNombre ?? "—"}</td>
                      <td>{p.entrega?.direccion}</td>
                      <td className="mono">{soles(p.total)}</td>
                      <td>{p.repartidor ?? "—"}</td>
                      <td><Estado estado={p.estado} /></td>
                      <td><Desplegable etiqueta={`Historial de ${p.codigo}`}><b>Historial de {p.codigo}</b><div style={{ marginTop: ".6rem" }}><Historial eventos={p.eventos} /></div></Desplegable></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
