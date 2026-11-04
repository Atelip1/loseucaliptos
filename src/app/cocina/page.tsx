"use client";
// Panel de cocina (HU08, HU10, CU13): pedidos de la sede en orden de llegada, en tiempo real.
import { CampoUsuario, enviar, hora, minutosDesde, Origen, SelectorSede, useAccion, useDatos, useSede, useUsuario, type PedidoUI } from "../ui";

export default function Cocina() {
  const { sedes, sedeId, cambiar } = useSede();
  const [usuario, setUsuario] = useUsuario("cocina");
  const { datos, error: errorCarga, recargar } = useDatos<{ pedidos: PedidoUI[]; ahora: string; tiempoObjetivoMin: number }>(
    sedeId ? `/api/pedidos?sede=${sedeId}&vista=cocina` : null,
    2000,
  );
  const { error, ocupado, ejecutar } = useAccion();
  const ahora = datos ? new Date(datos.ahora).getTime() : Date.now();

  const accion = (id: string, cuerpo: Record<string, unknown>) =>
    ejecutar(async () => {
      await enviar(`/api/pedidos/${id}`, { ...cuerpo, usuario });
      await recargar();
    });

  return (
    <div className="cocina">
      <div className="fila entre" style={{ marginBottom: "1rem" }}>
        <h1>Cocina {datos ? `· ${datos.pedidos.length} pendientes` : ""}</h1>
        <div className="fila">
          <SelectorSede sedes={sedes} sedeId={sedeId} cambiar={cambiar} />
          <CampoUsuario usuario={usuario} cambiar={setUsuario} />
        </div>
      </div>
      {errorCarga && <p className="error">Sin conexión: reintentando… ({errorCarga})</p>}
      {error && <p className="error">{error}</p>}
      {datos && !datos.pedidos.length && <p className="suave">No hay pedidos pendientes. 🎉</p>}
      <div className="rejilla">
        {datos?.pedidos.map((p, i) => {
          const min = minutosDesde(p.creadoEn, ahora);
          const demorado = min > datos.tiempoObjetivoMin;
          return (
            <div key={p.id} className={`tarjeta ${demorado ? "demorado" : ""}`}>
              <div className="fila entre">
                <h2>#{i + 1} · {p.codigo}</h2>
                <span className={`etiqueta ${demorado ? "alerta" : p.estado === "EN_PREPARACION" ? "ambar" : ""}`}>
                  {min} min
                </span>
              </div>
              <Origen p={p} />
              <div className="suave">Llegó {hora(p.creadoEn)} · {p.estado === "RECIBIDO" ? "Recibido" : "En preparación"}</div>
              <div style={{ margin: ".6rem 0" }}>
                {p.lineas.map((l, j) => (
                  <div key={j} className="linea">
                    <strong>{l.cantidad} ×</strong> {l.nombre}
                    {l.observacion && <div className="obs">⚠ {l.observacion}</div>}
                  </div>
                ))}
              </div>
              <div className="fila">
                {p.estado === "RECIBIDO" ? (
                  <button className="grande" disabled={ocupado} onClick={() => accion(p.id, { accion: "estado", estado: "EN_PREPARACION" })}>
                    Empezar preparación
                  </button>
                ) : (
                  <button className="grande" disabled={ocupado} onClick={() => accion(p.id, { accion: "estado", estado: "LISTO" })}>
                    ✅ Listo
                  </button>
                )}
                <button
                  className="secundario"
                  disabled={ocupado}
                  onClick={() => {
                    const motivo = prompt(`Motivo de la cancelación de ${p.codigo}:`);
                    if (motivo?.trim()) accion(p.id, { accion: "cancelar", motivo });
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
