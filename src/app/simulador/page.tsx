"use client";
// Simulador de WhatsApp: permite probar el chatbot completo sin un número de WhatsApp Business.
import { useEffect, useRef, useState } from "react";
import { enviar, hora, useDatos } from "../ui";

interface Mensaje {
  de: "cliente" | "bot" | "personal";
  texto: string;
  fecha: string;
  ubicacion?: { lat: number; lng: number };
}

const UBICACION_EJEMPLO = { lat: -13.3985, lng: -76.1562 };

function leer(clave: string, defecto: string) {
  try {
    return localStorage.getItem(clave) ?? defecto;
  } catch {
    return defecto;
  }
}

export default function Simulador() {
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
  const { datos, recargar } = useDatos<{ mensajes: Mensaje[]; derivada: boolean }>(
    valido ? `/api/simulador?telefono=${telefono}` : null,
    1500,
  );
  const mensajes = datos?.mensajes ?? [];

  useEffect(() => {
    fin.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes.length]);

  async function mandar(cuerpo: Record<string, unknown>) {
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

  return (
    <>
      <div className="fila entre" style={{ maxWidth: 460, margin: "0 auto .6rem" }}>
        <label>
          Número del cliente
          <input value={telefono} onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ""))} style={{ width: 150 }} />
        </label>
        <label>
          Nombre de perfil
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} style={{ width: 150 }} />
        </label>
        <button
          className="secundario"
          onClick={async () => {
            await enviar(`/api/simulador?telefono=${telefono}`, undefined, "DELETE");
            recargar();
          }}
        >
          Reiniciar chat
        </button>
      </div>
      <div className="telefono">
        <div className="cabecera">
          <strong>Restaurante Los Eucaliptos</strong>
          <div style={{ fontSize: ".8rem", opacity: 0.85 }}>
            {datos?.derivada ? "🙋 Atendido por una persona" : "🤖 Asistente automático"}
          </div>
        </div>
        <div className="mensajes">
          {!mensajes.length && (
            <div className="burbuja bot">Escribe “hola” para empezar. Prueba: “2 arroz con pato y una chicha”.</div>
          )}
          {mensajes.map((m, i) => (
            <div key={i} className={`burbuja ${m.de}`}>
              {m.de === "personal" && <strong style={{ display: "block", fontSize: ".75rem" }}>Personal del restaurante</strong>}
              {m.ubicacion ? (
                <a href={`https://maps.google.com/?q=${m.ubicacion.lat},${m.ubicacion.lng}`} target="_blank" rel="noreferrer">
                  📍 Ubicación compartida
                </a>
              ) : (
                m.texto.split(/(\*[^*\n]+\*)/g).map((parte, j) =>
                  /^\*[^*]+\*$/.test(parte) ? <strong key={j}>{parte.slice(1, -1)}</strong> : <span key={j}>{parte}</span>,
                )
              )}
              <span className="hora">{hora(m.fecha)}</span>
            </div>
          ))}
          <div ref={fin} />
        </div>
        {error && <div className="error" style={{ padding: ".3rem .6rem" }}>{error}</div>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!texto.trim() || !valido) return;
            const t = texto;
            setTexto("");
            mandar({ texto: t });
          }}
        >
          <button type="button" className="secundario" title="Compartir ubicación" disabled={!valido || enviando} onClick={() => mandar({ ubicacion: UBICACION_EJEMPLO })}>
            📍
          </button>
          <button type="button" className="secundario" title="Enviar imagen (comprobante)" disabled={!valido || enviando} onClick={() => archivo.current?.click()}>
            🖼️
          </button>
          <input
            ref={archivo}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) enviarImagen(f);
              e.target.value = "";
            }}
          />
          <input type="text" placeholder="Escribe un mensaje" value={texto} onChange={(e) => setTexto(e.target.value)} autoFocus />
          <button type="submit" disabled={!valido || enviando || !texto.trim()}>Enviar</button>
        </form>
      </div>
    </>
  );
}
