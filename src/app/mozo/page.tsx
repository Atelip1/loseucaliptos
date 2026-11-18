"use client";
// Mozo (HU09): registra pedidos de mesa o para llevar desde tablet o celular, y entrega los pedidos listos.
import { useMemo, useState } from "react";
import { Icono, PlatoIlustracion, Rama, type NombreIcono } from "../iconos";
import {
  CampoUsuario, Desplegable, Encabezado, enviar, Estado, Franja, Historial, hora, Origen, SelectorSede, soles,
  useAccion, useDatos, useSede, useUsuario, Vacio, type PedidoUI,
} from "../ui";

interface PlatoUI {
  id: string;
  nombre: string;
  categoria: string;
  precio: number;
  agotado: boolean;
  foto?: string;
}

const ICONO_CATEGORIA: Record<string, NombreIcono> = {
  Criollos: "cubiertos",
  "Pescados y mariscos": "pez",
  Entradas: "ensalada",
  Bebidas: "vaso",
};
const iconoCategoria = (c: string): NombreIcono => ICONO_CATEGORIA[c] ?? "cubiertos";

export default function Mozo() {
  const { sedes, sedeId, cambiar } = useSede();
  const [usuario, setUsuario] = useUsuario("mozo");
  const carta = useDatos<{ platos: PlatoUI[] }>(sedeId ? `/api/carta?sede=${sedeId}` : null, 10000);
  const pedidos = useDatos<{ pedidos: PedidoUI[] }>(sedeId ? `/api/pedidos?sede=${sedeId}&vista=dia` : null, 3000);
  const [categoria, setCategoria] = useState<string | null>(null);
  const [mesa, setMesa] = useState("");
  const [modalidad, setModalidad] = useState<"EN_LOCAL" | "PARA_LLEVAR">("EN_LOCAL");
  const [cliente, setCliente] = useState("");
  const [items, setItems] = useState<Record<string, { cantidad: number; observacion: string }>>({});
  const { error, ocupado, ejecutar } = useAccion();
  const [ok, setOk] = useState<string | null>(null);

  const platos = carta.datos?.platos ?? [];
  const categorias = useMemo(() => [...new Set(platos.map((p) => p.categoria))], [platos]);
  const grupos = useMemo(() => {
    const m = new Map<string, PlatoUI[]>();
    for (const p of platos) if (!categoria || p.categoria === categoria) m.set(p.categoria, [...(m.get(p.categoria) ?? []), p]);
    return [...m.entries()];
  }, [platos, categoria]);
  const seleccion = Object.entries(items);
  const total = seleccion.reduce((s, [id, it]) => s + (platos.find((p) => p.id === id)?.precio ?? 0) * it.cantidad, 0);
  const unidades = seleccion.reduce((s, [, it]) => s + it.cantidad, 0);

  const cambiarCantidad = (id: string, delta: number) =>
    setItems((prev) => {
      const n = Math.max(0, Math.min(50, (prev[id]?.cantidad ?? 0) + delta));
      const copia = { ...prev };
      if (n === 0) delete copia[id];
      else copia[id] = { cantidad: n, observacion: prev[id]?.observacion ?? "" };
      return copia;
    });

  const registrar = () =>
    ejecutar(async () => {
      setOk(null);
      const p = await enviar<PedidoUI>("/api/pedidos", {
        sedeId,
        mesa,
        modalidad,
        clienteNombre: cliente,
        usuario,
        lineas: seleccion.map(([platoId, it]) => ({ platoId, cantidad: it.cantidad, observacion: it.observacion })),
      });
      setItems({});
      setMesa("");
      setCliente("");
      setOk(`Pedido ${p.codigo} enviado a cocina.`);
      pedidos.recargar();
    });

  const todos = pedidos.datos?.pedidos ?? [];
  const listos = todos.filter((p) => p.estado === "LISTO" && p.modalidad !== "DELIVERY");
  const presenciales = todos.filter((p) => p.canal === "PRESENCIAL");

  return (
    <>
      <Encabezado icono="campana" titulo="Mozo · Pedidos de Mesa" subtitulo="Registro y envío de pedidos a cocina" usuario={usuario}>
        <SelectorSede sedes={sedes} sedeId={sedeId} cambiar={cambiar} />
        <CampoUsuario usuario={usuario} cambiar={setUsuario} />
      </Encabezado>

      {listos.length > 0 && (
        <div className="tarjeta" style={{ marginBottom: "1.1rem", borderColor: "var(--verde-500)" }}>
          <div className="tarjeta-titulo"><h2><Icono n="check" size={22} /> Listos para entregar ({listos.length})</h2></div>
          {listos.map((p) => (
            <div key={p.id} className="fila entre" style={{ padding: ".35rem 0", borderBottom: "1px dashed var(--borde)" }}>
              <span className="fila"><b>{p.codigo}</b> <Origen p={p} /></span>
              <button
                disabled={ocupado}
                onClick={() => ejecutar(async () => { await enviar(`/api/pedidos/${p.id}`, { accion: "estado", estado: "ENTREGADO", usuario }); pedidos.recargar(); })}
              >
                <Icono n="check" size={18} /> Entregado
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mozo-layout">
        <section>
          <Franja icono="hoja" titulo="Menú del Restaurante" texto="Selecciona los platos y agrégalos al pedido">
            <PlatoIlustracion size={170} />
          </Franja>
          <div className="panel-cuerpo" style={{ padding: 0 }}>
            <div className="menu-cuerpo">
              <div className="categorias">
                <button className={!categoria ? "activo" : ""} onClick={() => setCategoria(null)}><Icono n="cuadricula" size={20} /> Todos</button>
                {categorias.map((c) => (
                  <button key={c} className={categoria === c ? "activo" : ""} onClick={() => setCategoria(c)}><Icono n={iconoCategoria(c)} size={20} /> {c}</button>
                ))}
              </div>
              <div className="lista-platos">
                {grupos.map(([cat, ps]) => (
                  <div key={cat}>
                    <h3><Icono n={iconoCategoria(cat)} size={22} /> {cat}</h3>
                    {ps.map((p) => (
                      <div key={p.id} className={`fila-plato ${p.agotado ? "agotado" : ""}`}>
                        <span className={`miniatura ${cat}`}>
                          {p.foto ? <img src={p.foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 9 }} /> : <Icono n={iconoCategoria(cat)} size={22} />}
                        </span>
                        <span className="nombre-plato">
                          {p.nombre} {p.agotado && <span className="insignia alerta" style={{ marginLeft: 6 }}>Agotado</span>}
                        </span>
                        <span className="precio">{soles(p.precio)}</span>
                        <span className="contador">
                          <button className="secundario" aria-label={`Quitar ${p.nombre}`} disabled={!items[p.id]} onClick={() => cambiarCantidad(p.id, -1)}><Icono n="menos" size={16} /></button>
                          <b>{items[p.id]?.cantidad ?? 0}</b>
                          <button aria-label={`Agregar ${p.nombre}`} disabled={p.agotado} onClick={() => cambiarCantidad(p.id, 1)}><Icono n="mas" size={16} /></button>
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <aside className="tarjeta sin-padding ticket">
          <div className="cabecera-verde">
            <Icono n="lista" size={24} />
            <h2>Nuevo pedido</h2>
            <Rama size={70} className="decor" style={{ right: 6, top: -10 }} color="#9ccc7f" />
          </div>
          <div className="cuerpo-ticket">
            <div className="fila" style={{ alignItems: "flex-end" }}>
              <label className="campo" style={{ flex: 1 }}>
                Modalidad
                <select value={modalidad} onChange={(e) => setModalidad(e.target.value as "EN_LOCAL" | "PARA_LLEVAR")}>
                  <option value="EN_LOCAL">Mesa</option>
                  <option value="PARA_LLEVAR">Para llevar</option>
                </select>
              </label>
              {modalidad === "EN_LOCAL" ? (
                <label className="campo" style={{ width: 110 }}>N.° de mesa<input value={mesa} onChange={(e) => setMesa(e.target.value)} inputMode="numeric" /></label>
              ) : (
                <label className="campo" style={{ flex: 1 }}>Cliente<input value={cliente} onChange={(e) => setCliente(e.target.value)} /></label>
              )}
            </div>
            <b>Platos seleccionados ({unidades})</b>
            {!seleccion.length ? (
              <Vacio icono="campana" titulo="Aún no has agregado platos." texto="Selecciona platos del menú." />
            ) : (
              <div>
                {seleccion.map(([id, it]) => {
                  const p = platos.find((x) => x.id === id);
                  return (
                    <div key={id} className="linea-ticket">
                      <div className="fila entre">
                        <span><b>{it.cantidad} ×</b> {p?.nombre}</span>
                        <b className="mono">{soles((p?.precio ?? 0) * it.cantidad)}</b>
                      </div>
                      <input
                        placeholder="Observación (ej. sin ají)"
                        value={it.observacion}
                        onChange={(e) => setItems((prev) => ({ ...prev, [id]: { ...prev[id], observacion: e.target.value } }))}
                        style={{ width: "100%", marginTop: 4 }}
                        aria-label={`Observación para ${p?.nombre}`}
                      />
                    </div>
                  );
                })}
              </div>
            )}
            <div className="total-caja"><span>Total:</span><b>{soles(total)}</b></div>
            <button className="grande bloque" disabled={ocupado || !seleccion.length} onClick={registrar}><Icono n="gorro" size={20} /> Enviar a cocina</button>
            {error && <div className="aviso error" style={{ margin: 0 }}>{error}</div>}
            {ok && <div className="aviso exito" style={{ margin: 0 }}><Icono n="check" size={18} /> {ok}</div>}
          </div>
        </aside>
      </div>

      <div className="tarjeta" style={{ marginTop: "1.2rem" }}>
        <div className="tarjeta-titulo"><h2><Icono n="lista" size={22} /> Pedidos presenciales de hoy</h2></div>
        {!presenciales.length ? (
          <p className="suave">Todavía no hay pedidos presenciales hoy.</p>
        ) : (
          <div className="tabla-scroll">
            <table>
              <thead><tr><th>Código</th><th>Hora</th><th>Mesa / cliente</th><th>Platos</th><th>Total</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {presenciales.map((p) => (
                  <tr key={p.id}>
                    <td><b>{p.codigo}</b></td>
                    <td>{hora(p.creadoEn)}</td>
                    <td><b>{p.mesa ? `Mesa ${p.mesa}` : p.clienteNombre ?? "Para llevar"}</b></td>
                    <td>{p.lineas.map((l) => `${l.nombre} (${l.cantidad})`).join(", ")}</td>
                    <td className="mono">{soles(p.total)}</td>
                    <td><Estado estado={p.estado} /></td>
                    <td><Desplegable etiqueta={`Historial de ${p.codigo}`}><b>Historial de {p.codigo}</b><div style={{ marginTop: ".6rem" }}><Historial eventos={p.eventos} /></div></Desplegable></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
