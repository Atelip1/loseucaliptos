"use client";
// Simulador de WhatsApp: prueba el chatbot real (mismo gestor de conversación que el webhook).
import { useEffect, useRef, useState } from "react";
import { Icono, Rama } from "../iconos";
import { Encabezado, enviar, hora, soles, useDatos, useUsuario } from "../ui";

interface Mensaje {
  de: "cliente" | "bot" | "personal";
  texto: string;
  fecha: string;
  ubicacion?: { lat: number; lng: number };
  imagen?: string;
}
interface Estado {
  mensajes: Mensaje[];
  derivada: boolean;
  paso: string | null;
  nombre: string | null;
  carrito: { nombre: string; cantidad: number; observacion?: string; subtotal: number }[];
  totalPedidos: number;
}

const UBICACION_EJEMPLO = { lat: -13.3985, lng: -76.1562 };
const ATAJOS = [
  ["Ver carta", "carta", "lista"],
  ["Hacer pedido", "quiero hacer un pedido", "cubiertos"],
  ["Delivery", "¿hacen delivery?", "moto"],
  ["Listo", "listo", "check"],
] as const;

function leer(clave: string, defecto: string) {
  try {
    return localStorage.getItem(clave) ?? defecto;
  } catch {
    return defecto;
  }
}

/** Muestra *negritas* de WhatsApp. */
function Formato({ texto }: { texto: string }) {
  return (
    <>
      {texto.split(/(\*[^*\n]+\*)/g).map((parte, j) =>
        /^\*[^*]+\*$/.test(parte) ? <strong key={j}>{parte.slice(1, -1)}</strong> : <span key={j}>{parte}</span>,
      )}
    </>
  );
}

export default function Simulador() {
  const [usuario] = useUsuario("administrador");
  const [telefono, setTelefono] = useState("51987654321");
  const [nombre, setNombre] = useState("Cliente de prueba");
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const fin = useRef<HTMLDivElement>(null);
  const archivo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTelefono(leer("sim:tel", "51987654321"));
    setNombre(leer("sim:nombre", "Cliente de prueba"));
  }, []);

  const valido = /^\d{6,15}$/.test(telefono);
  const { datos, recargar } = useDatos<Estado>(valido ? `/api/simulador?telefono=${telefono}` : null, 1500);
  const mensajes = datos?.mensajes ?? [];

  useEffect(() => {
    fin.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensajes.length]);

  async function mandar(cuerpo: Record<string, unknown>) {
    if (!valido) return;
    setEnviando(true);
    setError(null);
    try {
      localStorage.setItem("sim:tel", telefono);
      localStorage.setItem("sim:nombre", nombre);
    } catch {
      /* sin almacenamiento */
    }
    try {
      await enviar("/api/simulador", { telefono, nombre, ...cuerpo });
      await recargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setEnviando(false);
    }
  }

  function enviarImagen(f: File) {
    const lector = new FileReader();
    lector.onload = () => mandar({ imagen: lector.result });
    lector.readAsDataURL(f);
  }

  const totalCarrito = (datos?.carrito ?? []).reduce((s, l) => s + l.subtotal, 0);

  return (
    <>
      <Encabezado icono="whatsapp" titulo="WhatsApp (Simulador)" subtitulo="Asistente virtual para la recepción de pedidos y consultas." usuario={usuario} />

      <div className="simulador">
        <div>
          <div className="tarjeta datos-cliente">
            <label className="campo">
              Número del cliente
              <span className="caja-control"><Icono n="usuario" size={18} /><input value={telefono} onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ""))} inputMode="numeric" /></span>
            </label>
            <label className="campo">
              Nombre de perfil
              <span className="caja-control"><Icono n="usuario" size={18} /><input value={nombre} onChange={(e) => setNombre(e.target.value)} /></span>
            </label>
            <button
              className="secundario pildora"
              disabled={!valido}
              onClick={async () => {
                await enviar(`/api/simulador?telefono=${telefono}`, undefined, "DELETE");
                recargar();
              }}
            >
              <Icono n="actualizar" size={18} /> Reiniciar chat
            </button>
          </div>

          <div className="tarjeta chat-wa">
            <div className="cabecera">
              <span className="avatar-bot"><Icono n="hoja" size={24} /></span>
              <div>
                <b>Restaurante Los Eucaliptos</b>
                <small>
                  <Icono n={datos?.derivada ? "auricular" : "robot"} size={15} />
                  {datos?.derivada ? "Atendido por una persona" : "Asistente automático"}
                </small>
              </div>
              <Rama size={90} className="decor" style={{ right: 10, top: -20, opacity: 0.45 }} color="#9ccc7f" />
            </div>
            <div className="chat-mensajes">
              {!mensajes.length && (
                <div className="burbuja bot">
                  Escribe <b>hola</b> para empezar o prueba: <b>2 arroz con pato y una chicha</b>.
                </div>
              )}
              {mensajes.map((m, i) => (
                <div key={i} className={`burbuja ${m.de}`}>
                  {m.de === "personal" && <span className="autor">Personal del restaurante</span>}
                  {m.ubicacion ? (
                    <a href={`https://maps.google.com/?q=${m.ubicacion.lat},${m.ubicacion.lng}`} target="_blank" rel="noreferrer">📍 Ubicación compartida</a>
                  ) : (
                    <Formato texto={m.texto} />
                  )}
                  <span className="hora">{hora(m.fecha)}{m.de === "cliente" ? " ✓✓" : ""}</span>
                </div>
              ))}
              <div ref={fin} />
            </div>
            <div className="atajos">
              {ATAJOS.map(([t, msg, ico]) => (
                <button key={t} disabled={!valido || enviando} onClick={() => mandar({ texto: msg })}>
                  <Icono n={ico} size={16} /> {t}
                </button>
              ))}
            </div>
            {error && <div className="error-texto" style={{ padding: ".3rem .9rem" }}>{error}</div>}
            <form
              className="redactor"
              onSubmit={(e) => {
                e.preventDefault();
                if (!texto.trim() || !valido) return;
                const t = texto;
                setTexto("");
                mandar({ texto: t });
              }}
            >
              <button type="button" className="secundario adjuntar" title="Enviar imagen (comprobante de pago)" aria-label="Enviar imagen" disabled={!valido || enviando} onClick={() => archivo.current?.click()}>
                <Icono n="clip" size={20} />
              </button>
              <button type="button" className="secundario adjuntar" title="Compartir ubicación" aria-label="Compartir ubicación" disabled={!valido || enviando} onClick={() => mandar({ ubicacion: UBICACION_EJEMPLO })}>
                <Icono n="pin" size={20} />
              </button>
              <input ref={archivo} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) enviarImagen(f); e.target.value = ""; }} />
              <input type="text" placeholder="Escribe un mensaje…" value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Mensaje" />
              <button type="submit" className="enviar" aria-label="Enviar" disabled={!valido || enviando || !texto.trim()}>
                <Icono n="enviar" size={20} />
              </button>
            </form>
          </div>
        </div>

        <aside className="columna">
          <div className="tarjeta">
            <div className="tarjeta-titulo"><h2><Icono n="usuario" size={22} /> Cliente actual</h2></div>
            <div className="dato"><Icono n="usuario" size={18} /> {datos?.nombre ?? nombre}</div>
            <div className="dato"><Icono n="telefono" size={18} /> {telefono || "—"}</div>
            <div style={{ marginTop: ".5rem" }}>
              <span className="etiqueta">{datos?.totalPedidos ? `${datos.totalPedidos} pedido(s) registrados` : "Cliente nuevo"}</span>
            </div>
          </div>

          <div className="tarjeta">
            <div className="tarjeta-titulo"><h2><Icono n="carrito" size={22} /> Pedido en curso</h2></div>
            {!datos?.carrito.length ? (
              <p className="suave" style={{ background: "var(--superficie-2)", padding: ".8rem", borderRadius: 10 }}>No hay un pedido activo.</p>
            ) : (
              <>
                {datos.carrito.map((l, i) => (
                  <div key={i} className="fila entre" style={{ padding: ".25rem 0" }}>
                    <span>{l.cantidad} × {l.nombre}{l.observacion && <span className="suave"> ({l.observacion})</span>}</span>
                    <b className="mono">{soles(l.subtotal)}</b>
                  </div>
                ))}
                <hr className="separador" />
                <div className="fila entre"><span>Subtotal</span><b className="mono">{soles(totalCarrito)}</b></div>
              </>
            )}
          </div>

          <div className="tarjeta">
            <div className="tarjeta-titulo"><h2><Icono n="rayo" size={22} /> Acciones rápidas</h2></div>
            <div className="acciones-rapidas">
              <button disabled={!valido || enviando} onClick={() => mandar({ texto: "carta" })}><Icono n="lista" size={24} /> Enviar carta</button>
              <button disabled={!valido || enviando} onClick={() => mandar({ texto: "quiero hacer un pedido" })}><Icono n="mas" size={24} /> Registrar pedido</button>
              <button disabled={!valido || enviando} onClick={() => mandar({ texto: "como va mi pedido" })}><Icono n="reloj" size={24} /> Estado del pedido</button>
              <button disabled={!valido || enviando} onClick={() => mandar({ texto: "¿hacen delivery?" })}><Icono n="moto" size={24} /> Consultar delivery</button>
            </div>
            <p className="suave" style={{ marginTop: ".6rem" }}>Usa 📎 para enviar el comprobante de Yape/Plin y 📍 para compartir la ubicación.</p>
          </div>
        </aside>
      </div>
    </>
  );
}
