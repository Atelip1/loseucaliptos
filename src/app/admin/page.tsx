"use client";
// Administración: carta (HU01, RF25), agotados por sede (HU16, RN07, RN13), zonas de delivery (HU24) y mensajes (RF26).
import { useEffect, useMemo, useState } from "react";
import { Icono, type NombreIcono } from "../iconos";
import { Encabezado, enviar, soles, useAccion, useDatos, useSede, useUsuario, type SedeUI } from "../ui";

interface PlatoUI {
  id: string;
  nombre: string;
  categoria: string;
  descripcion: string;
  precio: number;
  alias: string[];
  activo: boolean;
  foto?: string;
}
interface ZonaUI {
  id: string;
  sedeId: string;
  nombre: string;
  tarifa: number;
  pedidoMinimo: number;
  activa: boolean;
}

const aCentimos = (s: string) => Math.round(Number(s.replace(",", ".")) * 100);
const ICONO_CATEGORIA: Record<string, NombreIcono> = { Criollos: "cubiertos", "Pescados y mariscos": "pez", Entradas: "ensalada", Bebidas: "vaso" };

function Interruptor({ activo, alCambiar, etiqueta }: { activo: boolean; alCambiar: (v: boolean) => void; etiqueta: string }) {
  return (
    <label className="interruptor" title={etiqueta}>
      <input type="checkbox" checked={activo} onChange={(e) => alCambiar(e.target.checked)} aria-label={etiqueta} />
      <span />
    </label>
  );
}

function Carta({ sedes }: { sedes: SedeUI[] }) {
  const { datos, recargar } = useDatos<{ platos: PlatoUI[]; agotados: Record<string, string[]> }>("/api/carta?todos=1");
  const vacio = { id: "", nombre: "", categoria: "Criollos", descripcion: "", precio: "", alias: "", foto: "" };
  const [form, setForm] = useState(vacio);
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("");
  const { error, ocupado, ejecutar } = useAccion();
  const platos = datos?.platos ?? [];
  const categorias = useMemo(() => [...new Set(platos.map((p) => p.categoria))], [platos]);
  const q = busqueda.trim().toLowerCase();
  const filtrados = platos.filter((p) => (!categoria || p.categoria === categoria) && (!q || p.nombre.toLowerCase().includes(q) || p.alias.some((a) => a.toLowerCase().includes(q))));

  const guardar = () =>
    ejecutar(async () => {
      const cuerpo = {
        nombre: form.nombre,
        categoria: form.categoria,
        descripcion: form.descripcion,
        precio: aCentimos(form.precio),
        alias: form.alias.split(",").map((a) => a.trim()).filter(Boolean),
        foto: form.foto.trim() || undefined,
      };
      if (form.id) await enviar(`/api/carta/${form.id}`, cuerpo, "PUT");
      else await enviar("/api/carta", cuerpo);
      setForm(vacio);
      recargar();
    });

  return (
    <>
      <div className="tarjeta" style={{ marginBottom: "1.1rem" }}>
        <div className="fila" style={{ alignItems: "flex-start", gap: "1.2rem", flexWrap: "wrap" }}>
          <div className="foto-plato">
            {form.foto ? <img src={form.foto} alt="Vista previa del plato" /> : <Icono n={ICONO_CATEGORIA[form.categoria] ?? "cubiertos"} size={56} grosor={1.4} />}
          </div>
          <div style={{ flex: 1, minWidth: 260, display: "grid", gap: ".8rem" }}>
            <h2 className="fila"><Icono n={form.id ? "lapiz" : "mas"} size={22} /> {form.id ? "Editar plato" : "Nuevo plato"}</h2>
            <div className="fila" style={{ alignItems: "flex-end" }}>
              <label className="campo" style={{ flex: 2, minWidth: 180 }}><span>Nombre del plato <span className="req">*</span></span><input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. Arroz con pato" /></label>
              <label className="campo" style={{ flex: 1, minWidth: 150 }}>
                <span>Categoría <span className="req">*</span></span>
                <input list="categorias" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} />
                <datalist id="categorias">{categorias.map((c) => <option key={c} value={c} />)}</datalist>
              </label>
              <label className="campo" style={{ width: 110 }}><span>Precio (S/) <span className="req">*</span></span><input value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} inputMode="decimal" placeholder="0.00" /></label>
              <label className="campo" style={{ flex: 2, minWidth: 200 }}>Otros nombres (separados por coma)<input value={form.alias} onChange={(e) => setForm({ ...form, alias: e.target.value })} placeholder="Ej. pato, arroz pato" /></label>
            </div>
            <div className="fila" style={{ alignItems: "flex-end" }}>
              <label className="campo" style={{ flex: 3, minWidth: 240 }}>Descripción (la usa el chatbot para responder “¿qué lleva…?”)<textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Ej. Arroz verde con pato macerado en chicha de jora…" style={{ minHeight: 48 }} /></label>
              <label className="campo" style={{ flex: 2, minWidth: 200 }}>Foto (URL, opcional)<input value={form.foto} onChange={(e) => setForm({ ...form, foto: e.target.value })} placeholder="https://…" /></label>
            </div>
            <div className="fila">
              <button className="grande" disabled={ocupado} onClick={guardar}><Icono n={form.id ? "check" : "mas"} size={20} /> {form.id ? "Guardar cambios" : "Agregar a la carta"}</button>
              {form.id && <button className="secundario" onClick={() => setForm(vacio)}>Cancelar</button>}
              {error && <span className="error-texto">{error}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="tarjeta">
        <div className="tarjeta-titulo">
          <h2><Icono n="cubiertos" size={22} /> Platos de la carta</h2>
          <div className="fila">
            <span className="buscador"><Icono n="buscar" size={18} /><input placeholder="Buscar plato…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} aria-label="Buscar plato" /></span>
            <span className="caja-control" style={{ boxShadow: "none" }}>
              <Icono n="filtro" size={16} />
              <select value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Filtrar por categoría">
                <option value="">Todas las categorías</option>
                {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </span>
          </div>
        </div>
        <div className="tabla-scroll">
          <table>
            <thead>
              <tr>
                <th>Plato</th><th>Categoría</th><th>Precio</th><th>Activo</th>
                {sedes.map((s) => <th key={s.id}>{s.nombre}</th>)}
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((p) => (
                <tr key={p.id} style={{ opacity: p.activo ? 1 : 0.55 }}>
                  <td>
                    <span className="fila" style={{ flexWrap: "nowrap" }}>
                      <span className={`miniatura ${p.categoria}`} style={{ width: 52, height: 42 }}>
                        {p.foto ? <img src={p.foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 9 }} /> : <Icono n={ICONO_CATEGORIA[p.categoria] ?? "cubiertos"} size={22} />}
                      </span>
                      <span><b>{p.nombre}</b><div className="suave">{p.alias.join(", ") || p.descripcion.slice(0, 40)}</div></span>
                    </span>
                  </td>
                  <td><span className={`etiqueta ${p.categoria.startsWith("Pescados") ? "azul" : ""}`}>{p.categoria}</span></td>
                  <td className="mono">{soles(p.precio)}</td>
                  <td><Interruptor activo={p.activo} etiqueta={`Activar ${p.nombre}`} alCambiar={(v) => ejecutar(async () => { await enviar(`/api/carta/${p.id}`, { activo: v }, "PUT"); recargar(); })} /></td>
                  {sedes.map((s) => {
                    const agotado = datos?.agotados[s.id]?.includes(p.id) ?? false;
                    return (
                      <td key={s.id}>
                        <button
                          className={`pildora-estado ${agotado ? "agotado" : "disponible"}`}
                          title={`Clic para marcar como ${agotado ? "disponible" : "agotado"} en ${s.nombre}`}
                          onClick={() => ejecutar(async () => { await enviar(`/api/carta/${p.id}/agotado`, { sedeId: s.id, agotado: !agotado }); recargar(); })}
                        >
                          ● {agotado ? "Agotado" : "Disponible"}
                        </button>
                      </td>
                    );
                  })}
                  <td>
                    <button
                      className="secundario icono"
                      title={`Editar ${p.nombre}`}
                      aria-label={`Editar ${p.nombre}`}
                      onClick={() => { setForm({ id: p.id, nombre: p.nombre, categoria: p.categoria, descripcion: p.descripcion, precio: (p.precio / 100).toFixed(2), alias: p.alias.join(", "), foto: p.foto ?? "" }); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    >
                      <Icono n="lapiz" size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="suave" style={{ marginTop: ".7rem" }}>Un plato agotado deja de ofrecerse de inmediato en el chatbot de esa sede (RN07). Para retirarlo de la carta, desactívalo.</p>
      </div>
    </>
  );
}

function Zonas({ sedes }: { sedes: SedeUI[] }) {
  const { datos, recargar } = useDatos<ZonaUI[]>("/api/zonas");
  const nuevo = (sedeId: string) => ({ id: "", sedeId, nombre: "", tarifa: "", pedidoMinimo: "" });
  const [form, setForm] = useState(nuevo(""));
  const { error, ocupado, ejecutar } = useAccion();
  useEffect(() => {
    if (!form.sedeId && sedes[0]) setForm((f) => ({ ...f, sedeId: sedes[0].id }));
  }, [sedes, form.sedeId]);

  const guardar = () =>
    ejecutar(async () => {
      const cuerpo = { sedeId: form.sedeId, nombre: form.nombre, tarifa: aCentimos(form.tarifa || "0"), pedidoMinimo: aCentimos(form.pedidoMinimo || "0") };
      if (form.id) await enviar(`/api/zonas/${form.id}`, cuerpo, "PUT");
      else await enviar("/api/zonas", cuerpo);
      setForm(nuevo(form.sedeId));
      recargar();
    });

  return (
    <>
      <div className="tarjeta" style={{ marginBottom: "1.1rem" }}>
        <div className="tarjeta-titulo"><h2><Icono n={form.id ? "lapiz" : "mas"} size={22} /> {form.id ? "Editar zona" : "Nueva zona de delivery"}</h2></div>
        <div className="fila" style={{ alignItems: "flex-end" }}>
          <label className="campo">Sede que la atiende
            <select value={form.sedeId} onChange={(e) => setForm({ ...form, sedeId: e.target.value })}>
              {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </label>
          <label className="campo" style={{ flex: 1, minWidth: 180 }}>Zona<input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. Sunampe" /></label>
          <label className="campo" style={{ width: 120 }}>Tarifa (S/)<input value={form.tarifa} onChange={(e) => setForm({ ...form, tarifa: e.target.value })} inputMode="decimal" /></label>
          <label className="campo" style={{ width: 150 }}>Pedido mínimo (S/)<input value={form.pedidoMinimo} onChange={(e) => setForm({ ...form, pedidoMinimo: e.target.value })} inputMode="decimal" /></label>
          <button disabled={ocupado} onClick={guardar}><Icono n={form.id ? "check" : "mas"} size={18} /> {form.id ? "Guardar" : "Agregar"}</button>
          {form.id && <button className="secundario" onClick={() => setForm(nuevo(form.sedeId))}>Cancelar</button>}
        </div>
        {error && <p className="error-texto" style={{ marginTop: ".5rem" }}>{error}</p>}
      </div>
      <div className="tarjeta">
        <div className="tarjeta-titulo"><h2><Icono n="moto" size={22} /> Zonas configuradas</h2></div>
        <div className="tabla-scroll">
          <table>
            <thead><tr><th>Zona</th><th>Sede</th><th>Tarifa</th><th>Pedido mínimo</th><th>Activa</th><th>Acciones</th></tr></thead>
            <tbody>
              {datos?.map((z) => (
                <tr key={z.id}>
                  <td><b>{z.nombre}</b></td>
                  <td>{sedes.find((s) => s.id === z.sedeId)?.nombre}</td>
                  <td className="mono">{soles(z.tarifa)}</td>
                  <td className="mono">{soles(z.pedidoMinimo)}</td>
                  <td><Interruptor activo={z.activa} etiqueta={`Activar zona ${z.nombre}`} alCambiar={(v) => ejecutar(async () => { await enviar(`/api/zonas/${z.id}`, { activa: v }, "PUT"); recargar(); })} /></td>
                  <td className="fila">
                    <button className="secundario icono" aria-label={`Editar ${z.nombre}`} title="Editar" onClick={() => setForm({ id: z.id, sedeId: z.sedeId, nombre: z.nombre, tarifa: (z.tarifa / 100).toFixed(2), pedidoMinimo: (z.pedidoMinimo / 100).toFixed(2) })}><Icono n="lapiz" size={17} /></button>
                    <button className="peligro-borde icono" aria-label={`Eliminar ${z.nombre}`} title="Eliminar" onClick={() => confirm(`¿Eliminar la zona ${z.nombre}?`) && ejecutar(async () => { await enviar(`/api/zonas/${z.id}`, undefined, "DELETE"); recargar(); })}><Icono n="cerrar" size={17} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

interface ConfigUI {
  apertura: string;
  cierre: string;
  ignorarHorario: boolean;
  mensajeBienvenida: string;
  textoPagos: string;
  textoHorario: string;
  tiempoObjetivoCocinaMin: number;
  tiempoEstimadoMin: Record<string, number>;
}

function Configuracion() {
  const { datos } = useDatos<ConfigUI>("/api/config");
  const [c, setC] = useState<ConfigUI | null>(null);
  const [ok, setOk] = useState(false);
  const { error, ocupado, ejecutar } = useAccion();
  useEffect(() => {
    if (datos) setC(datos);
  }, [datos]);
  if (!c) return null;
  return (
    <div className="columna" style={{ maxWidth: 900 }}>
      <div className="tarjeta">
        <div className="tarjeta-titulo"><h2><Icono n="reloj" size={22} /> Horario y tiempos</h2></div>
        <div className="fila" style={{ alignItems: "flex-end" }}>
          <label className="campo">Apertura<input type="time" value={c.apertura} onChange={(e) => setC({ ...c, apertura: e.target.value })} /></label>
          <label className="campo">Cierre<input type="time" value={c.cierre} onChange={(e) => setC({ ...c, cierre: e.target.value })} /></label>
          <label className="campo">Tiempo objetivo de cocina (min)<input type="number" min={5} value={c.tiempoObjetivoCocinaMin} onChange={(e) => setC({ ...c, tiempoObjetivoCocinaMin: Number(e.target.value) })} style={{ width: 110 }} /></label>
          {(["EN_LOCAL", "PARA_LLEVAR", "DELIVERY"] as const).map((m) => (
            <label key={m} className="campo">Estimado {m === "EN_LOCAL" ? "en local" : m === "PARA_LLEVAR" ? "para llevar" : "delivery"} (min)
              <input type="number" min={5} value={c.tiempoEstimadoMin[m]} onChange={(e) => setC({ ...c, tiempoEstimadoMin: { ...c.tiempoEstimadoMin, [m]: Number(e.target.value) } })} style={{ width: 110 }} />
            </label>
          ))}
        </div>
        <label className="fila" style={{ marginTop: ".9rem", fontWeight: 600 }}>
          <Interruptor activo={c.ignorarHorario} etiqueta="Modo pruebas" alCambiar={(v) => setC({ ...c, ignorarHorario: v })} />
          Modo pruebas: aceptar pedidos fuera de horario <span className="suave">(desactivar antes del piloto, RN08)</span>
        </label>
      </div>
      <div className="tarjeta">
        <div className="tarjeta-titulo"><h2><Icono n="chat" size={22} /> Mensajes del chatbot</h2></div>
        <div className="columna" style={{ gap: ".8rem" }}>
          <label className="campo">Mensaje de bienvenida<textarea value={c.mensajeBienvenida} onChange={(e) => setC({ ...c, mensajeBienvenida: e.target.value })} /></label>
          <label className="campo">Respuesta sobre el horario<textarea value={c.textoHorario} onChange={(e) => setC({ ...c, textoHorario: e.target.value })} /></label>
          <label className="campo">Respuesta sobre medios de pago<textarea value={c.textoPagos} onChange={(e) => setC({ ...c, textoPagos: e.target.value })} /></label>
        </div>
      </div>
      <div className="fila">
        <button className="grande" disabled={ocupado} onClick={() => ejecutar(async () => { await enviar("/api/config", c, "PUT"); setOk(true); setTimeout(() => setOk(false), 2500); })}><Icono n="check" size={20} /> Guardar configuración</button>
        {ok && <span className="aviso exito" style={{ margin: 0 }}>Guardado ✔</span>}
        {error && <span className="error-texto">{error}</span>}
        <button className="peligro-borde" style={{ marginLeft: "auto" }} onClick={() => confirm("¿Borrar todos los pedidos y conversaciones y volver a los datos de ejemplo?") && ejecutar(async () => { await enviar("/api/datos/reiniciar"); location.reload(); })}>
          <Icono n="actualizar" size={18} /> Reiniciar datos de ejemplo
        </button>
      </div>
    </div>
  );
}

export default function Admin() {
  const { sedes } = useSede();
  const [usuario] = useUsuario("administrador");
  const [tab, setTab] = useState<"carta" | "zonas" | "config">("carta");
  return (
    <>
      <Encabezado icono="ajustes" titulo="Administración" subtitulo="Configuración general del restaurante" usuario={usuario} />
      <div className="pestanas" style={{ marginBottom: "1.2rem" }}>
        <button className={tab === "carta" ? "activo" : ""} onClick={() => setTab("carta")}><Icono n="cubiertos" size={20} /> Carta y agotados</button>
        <button className={tab === "zonas" ? "activo" : ""} onClick={() => setTab("zonas")}><Icono n="moto" size={20} /> Zonas de delivery</button>
        <button className={tab === "config" ? "activo" : ""} onClick={() => setTab("config")}><Icono n="calendario" size={20} /> Horario y mensajes</button>
      </div>
      {tab === "carta" && <Carta sedes={sedes} />}
      {tab === "zonas" && <Zonas sedes={sedes} />}
      {tab === "config" && <Configuracion />}
    </>
  );
}
