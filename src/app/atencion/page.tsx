"use client";
// Atención humana (HU17, RF09): conversaciones derivadas con el chatbot en pausa.
import { useState } from "react";
import { CampoUsuario, enviar, hora, useAccion, useDatos, useUsuario } from "../ui";

interface Conv {
  telefono: string;
  nombre?: string;
  derivada: boolean;
  motivoDerivacion?: string;
  derivadaEn?: string;
  actualizadaEn: string;
  mensajes: { de: string; texto: string; fecha: string }[];
}

export default function Atencion() {
  const [todas, setTodas] = useState(false);
  const [usuario, setUsuario] = useUsuario("mozo");
  const { datos, recargar } = useDatos<Conv[]>(`/api/conversaciones${todas ? "" : "?derivadas=1"}`, 2000);
  const [sel, setSel] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const { error, ocupado, ejecutar } = useAccion();
  const actual = datos?.find((c) => c.telefono === sel) ?? null;

  return (
    <>
      <div className="fila entre" style={{ marginBottom: "1rem" }}>
        <h1>Atención humana</h1>
        <div className="fila">
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={todas} onChange={(e) => setTodas(e.target.checked)} /> Ver todas las conversaciones
          </label>
          <CampoUsuario usuario={usuario} cambiar={setUsuario} />
        </div>
      </div>
      <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "minmax(220px, 1fr) minmax(0, 2fr)" }} className="atencion-rejilla">
        <div className="tarjeta" style={{ alignSelf: "start" }}>
          {!datos?.length && <p className="suave">No hay conversaciones derivadas. 👌</p>}
          {datos?.map((c) => (
            <div
              key={c.telefono}
              onClick={() => setSel(c.telefono)}
              style={{ padding: ".5rem", borderRadius: 8, cursor: "pointer", background: sel === c.telefono ? "var(--verde-claro)" : undefined }}
            >
              <div className="fila entre">
                <strong>{c.nombre ?? `+${c.telefono}`}</strong>
                {c.derivada && <span className="etiqueta alerta">Derivada</span>}
              </div>
              <div className="suave">{c.motivoDerivacion ?? c.mensajes.at(-1)?.texto.slice(0, 50)}</div>
              <div className="suave">{hora(c.actualizadaEn)}</div>
            </div>
          ))}
        </div>
        <div className="tarjeta">
          {!actual ? (
            <p className="suave">Selecciona una conversación.</p>
          ) : (
            <>
              <div className="fila entre">
                <h2>{actual.nombre ?? "Cliente"} · +{actual.telefono}</h2>
                {actual.derivada && (
                  <button className="secundario" disabled={ocupado} onClick={() => ejecutar(async () => { await enviar(`/api/conversaciones/${actual.telefono}`, { accion: "cerrar" }); recargar(); })}>
                    Cerrar y devolver al bot
                  </button>
                )}
              </div>
              <div style={{ maxHeight: 420, overflowY: "auto", background: "var(--chat-fondo)", padding: ".6rem", borderRadius: 8, display: "flex", flexDirection: "column", gap: ".35rem" }}>
                {actual.mensajes.map((m, i) => (
                  <div key={i} className={`burbuja ${m.de}`}>
                    {m.texto}
                    <span className="hora">{m.de} · {hora(m.fecha)}</span>
                  </div>
                ))}
              </div>
              <form
                className="fila"
                style={{ marginTop: ".6rem" }}
                onSubmit={(e) => {
                  e.preventDefault();
                  const t = texto;
                  ejecutar(async () => {
                    await enviar(`/api/conversaciones/${actual.telefono}`, { accion: "responder", texto: t, usuario });
                    setTexto("");
                    recargar();
                  });
                }}
              >
                <input style={{ flex: 1 }} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Responder al cliente…" />
                <button disabled={ocupado || !texto.trim()}>Enviar</button>
              </form>
              {!actual.derivada && <p className="suave">Si respondes, tomas la conversación y el chatbot se pausa.</p>}
              {error && <p className="error">{error}</p>}
            </>
          )}
        </div>
      </div>
      <style>{`@media (max-width: 760px) { .atencion-rejilla { grid-template-columns: 1fr !important; } }`}</style>
    </>
  );
}
