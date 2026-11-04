"use client";
// Administración: carta (HU01), agotados por sede (HU16), zonas de delivery (HU24) y mensajes (RF26).
import { useEffect, useState } from "react";
import { enviar, soles, useAccion, useDatos, useSede, type SedeUI } from "../ui";

interface PlatoUI {
  id: string;
  nombre: string;
  categoria: string;
  descripcion: string;
  precio: number;
  alias: string[];
  activo: boolean;
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

function Carta({ sedes }: { sedes: SedeUI[] }) {
  const { datos, recargar } = useDatos<{ platos: PlatoUI[]; agotados: Record<string, string[]> }>("/api/carta?todos=1");
  const vacio = { id: "", nombre: "", categoria: "Criollos", descripcion: "", precio: "", alias: "" };
  const [form, setForm] = useState(vacio);
  const { error, ocupado, ejecutar } = useAccion();

  const guardar = () =>
    ejecutar(async () => {
      const cuerpo = {
        nombre: form.nombre,
        categoria: form.categoria,
        descripcion: form.descripcion,
        precio: aCentimos(form.precio),
        alias: form.alias.split(",").map((a) => a.trim()).filter(Boolean),
      };
      if (form.id) await enviar(`/api/carta/${form.id}`, cuerpo, "PUT");
      else await enviar("/api/carta", cuerpo);
      setForm(vacio);
      recargar();
    });

  return (
    <>
      <div className="tarjeta" style={{ marginBottom: "1rem" }}>
        <h2>{form.id ? "Editar plato" : "Nuevo plato"}</h2>
        <div className="fila">
          <label>Nombre<input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></label>
          <label>Categoría<input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} style={{ width: 160 }} /></label>
          <label>Precio (S/)<input value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} style={{ width: 90 }} inputMode="decimal" /></label>
          <label>Otros nombres (separados por coma)<input value={form.alias} onChange={(e) => setForm({ ...form, alias: e.target.value })} style={{ width: 220 }} /></label>
        </div>
        <label style={{ marginTop: ".5rem" }}>Descripción (el chatbot la usa para responder “¿qué lleva…?”)
          <textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
        </label>
        <div className="fila" style={{ marginTop: ".5rem" }}>
          <button disabled={ocupado} onClick={guardar}>{form.id ? "Guardar cambios" : "Agregar a la carta"}</button>
          {form.id && <button className="secundario" onClick={() => setForm(vacio)}>Cancelar</button>}
          {error && <span className="error">{error}</span>}
        </div>
      </div>
      <div className="tarjeta tabla-scroll">
        <table>
          <thead>
            <tr>
              <th>Plato</th><th>Categoría</th><th>Precio</th><th>Activo</th>
              {sedes.map((s) => <th key={s.id}>Agotado en {s.nombre}</th>)}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {datos?.platos.map((p) => (
              <tr key={p.id} style={{ opacity: p.activo ? 1 : 0.5 }}>
                <td><strong>{p.nombre}</strong><div className="suave">{p.alias.join(", ")}</div></td>
                <td>{p.categoria}</td>
                <td>{soles(p.precio)}</td>
                <td>
                  <input type="checkbox" checked={p.activo} onChange={(e) => ejecutar(async () => { await enviar(`/api/carta/${p.id}`, { activo: e.target.checked }, "PUT"); recargar(); })} />
                </td>
                {sedes.map((s) => {
                  const agotado = datos.agotados[s.id]?.includes(p.id) ?? false;
                  return (
                    <td key={s.id}>
                      <button
                        className={agotado ? "peligro" : "secundario"}
                        onClick={() => ejecutar(async () => { await enviar(`/api/carta/${p.id}/agotado`, { sedeId: s.id, agotado: !agotado }); recargar(); })}
                      >
                        {agotado ? "Agotado" : "Disponible"}
                      </button>
                    </td>
                  );
                })}
                <td>
                  <button
                    className="secundario"
                    onClick={() => setForm({ id: p.id, nombre: p.nombre, categoria: p.categoria, descripcion: p.descripcion, precio: (p.precio / 100).toFixed(2), alias: p.alias.join(", ") })}
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Zonas({ sedes }: { sedes: SedeUI[] }) {
  const { datos, recargar } = useDatos<ZonaUI[]>("/api/zonas");
  const [form, setForm] = useState({ id: "", sedeId: "", nombre: "", tarifa: "", pedidoMinimo: "" });
  const { error, ocupado, ejecutar } = useAccion();
  useEffect(() => {
    if (!form.sedeId && sedes[0]) setForm((f) => ({ ...f, sedeId: sedes[0].id }));
  }, [sedes, form.sedeId]);

  const guardar = () =>
    ejecutar(async () => {
      const cuerpo = { sedeId: form.sedeId, nombre: form.nombre, tarifa: aCentimos(form.tarifa || "0"), pedidoMinimo: aCentimos(form.pedidoMinimo || "0") };
      if (form.id) await enviar(`/api/zonas/${form.id}`, cuerpo, "PUT");
      else await enviar("/api/zonas", cuerpo);
      setForm({ id: "", sedeId: form.sedeId, nombre: "", tarifa: "", pedidoMinimo: "" });
      recargar();
    });

  return (
    <>
      <div className="tarjeta" style={{ marginBottom: "1rem" }}>
        <h2>{form.id ? "Editar zona" : "Nueva zona de delivery"}</h2>
        <div className="fila">
          <label>Sede que la atiende
            <select value={form.sedeId} onChange={(e) => setForm({ ...form, sedeId: e.target.value })}>
              {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </label>
          <label>Zona<input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></label>
          <label>Tarifa (S/)<input value={form.tarifa} onChange={(e) => setForm({ ...form, tarifa: e.target.value })} style={{ width: 90 }} inputMode="decimal" /></label>
          <label>Pedido mínimo (S/)<input value={form.pedidoMinimo} onChange={(e) => setForm({ ...form, pedidoMinimo: e.target.value })} style={{ width: 90 }} inputMode="decimal" /></label>
          <button disabled={ocupado} onClick={guardar} style={{ alignSelf: "end" }}>{form.id ? "Guardar" : "Agregar"}</button>
          {form.id && <button className="secundario" style={{ alignSelf: "end" }} onClick={() => setForm({ id: "", sedeId: form.sedeId, nombre: "", tarifa: "", pedidoMinimo: "" })}>Cancelar</button>}
        </div>
        {error && <p className="error">{error}</p>}
      </div>
      <div className="tarjeta tabla-scroll">
        <table>
          <thead><tr><th>Zona</th><th>Sede</th><th>Tarifa</th><th>Pedido mínimo</th><th>Activa</th><th></th></tr></thead>
          <tbody>
            {datos?.map((z) => (
              <tr key={z.id}>
                <td>{z.nombre}</td>
                <td>{sedes.find((s) => s.id === z.sedeId)?.nombre}</td>
                <td>{soles(z.tarifa)}</td>
                <td>{soles(z.pedidoMinimo)}</td>
                <td><input type="checkbox" checked={z.activa} onChange={(e) => ejecutar(async () => { await enviar(`/api/zonas/${z.id}`, { activa: e.target.checked }, "PUT"); recargar(); })} /></td>
                <td className="fila">
                  <button className="secundario" onClick={() => setForm({ id: z.id, sedeId: z.sedeId, nombre: z.nombre, tarifa: (z.tarifa / 100).toFixed(2), pedidoMinimo: (z.pedidoMinimo / 100).toFixed(2) })}>Editar</button>
                  <button className="peligro" onClick={() => confirm(`¿Eliminar la zona ${z.nombre}?`) && ejecutar(async () => { await enviar(`/api/zonas/${z.id}`, undefined, "DELETE"); recargar(); })}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
    <div className="tarjeta" style={{ display: "grid", gap: ".7rem", maxWidth: 760 }}>
      <div className="fila">
        <label>Apertura<input type="time" value={c.apertura} onChange={(e) => setC({ ...c, apertura: e.target.value })} /></label>
        <label>Cierre<input type="time" value={c.cierre} onChange={(e) => setC({ ...c, cierre: e.target.value })} /></label>
        <label>Tiempo objetivo de cocina (min)<input type="number" min={5} value={c.tiempoObjetivoCocinaMin} onChange={(e) => setC({ ...c, tiempoObjetivoCocinaMin: Number(e.target.value) })} style={{ width: 90 }} /></label>
        <label style={{ display: "flex", gap: 6, alignItems: "center", alignSelf: "end" }}>
          <input type="checkbox" checked={c.ignorarHorario} onChange={(e) => setC({ ...c, ignorarHorario: e.target.checked })} />
          Modo pruebas: aceptar pedidos fuera de horario
        </label>
      </div>
      <div className="fila">
        {(["EN_LOCAL", "PARA_LLEVAR", "DELIVERY"] as const).map((m) => (
          <label key={m}>Tiempo estimado {m === "EN_LOCAL" ? "en local" : m === "PARA_LLEVAR" ? "para llevar" : "delivery"} (min)
            <input type="number" min={5} value={c.tiempoEstimadoMin[m]} onChange={(e) => setC({ ...c, tiempoEstimadoMin: { ...c.tiempoEstimadoMin, [m]: Number(e.target.value) } })} style={{ width: 90 }} />
          </label>
        ))}
      </div>
      <label>Mensaje de bienvenida<textarea value={c.mensajeBienvenida} onChange={(e) => setC({ ...c, mensajeBienvenida: e.target.value })} /></label>
      <label>Respuesta sobre el horario<textarea value={c.textoHorario} onChange={(e) => setC({ ...c, textoHorario: e.target.value })} /></label>
      <label>Respuesta sobre medios de pago<textarea value={c.textoPagos} onChange={(e) => setC({ ...c, textoPagos: e.target.value })} /></label>
      <div className="fila">
        <button disabled={ocupado} onClick={() => ejecutar(async () => { await enviar("/api/config", c, "PUT"); setOk(true); setTimeout(() => setOk(false), 2000); })}>Guardar configuración</button>
        {ok && <span style={{ color: "var(--verde)" }}>Guardado ✔</span>}
        {error && <span className="error">{error}</span>}
      </div>
      <hr style={{ border: 0, borderTop: "1px solid var(--borde)", width: "100%" }} />
      <div>
        <button className="peligro" onClick={() => confirm("¿Borrar todos los pedidos y conversaciones y volver a los datos de ejemplo?") && ejecutar(async () => { await enviar("/api/datos/reiniciar"); location.reload(); })}>
          Reiniciar datos de ejemplo
        </button>
        <span className="suave" style={{ marginLeft: 8 }}>Solo en desarrollo.</span>
      </div>
    </div>
  );
}

export default function Admin() {
  const { sedes } = useSede();
  const [tab, setTab] = useState<"carta" | "zonas" | "config">("carta");
  return (
    <>
      <h1>Administración</h1>
      <div className="fila" style={{ marginBottom: "1rem" }}>
        <button className={tab === "carta" ? "" : "secundario"} onClick={() => setTab("carta")}>Carta y agotados</button>
        <button className={tab === "zonas" ? "" : "secundario"} onClick={() => setTab("zonas")}>Zonas de delivery</button>
        <button className={tab === "config" ? "" : "secundario"} onClick={() => setTab("config")}>Horario y mensajes</button>
      </div>
      {tab === "carta" && <Carta sedes={sedes} />}
      {tab === "zonas" && <Zonas sedes={sedes} />}
      {tab === "config" && <Configuracion />}
    </>
  );
}
