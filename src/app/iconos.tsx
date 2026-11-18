// Iconos de trazo (estilo Lucide, licencia ISC) y decoraciones vectoriales del sistema visual.
import type { CSSProperties, ReactNode } from "react";

const P: Record<string, ReactNode> = {
  inicio: (<><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></>),
  chat: <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />,
  gorro: (<><path d="M17 21a1 1 0 0 0 1-1v-5.35c0-.46.32-.84.73-1.04a4 4 0 0 0-2.14-7.59 5 5 0 0 0-9.18 0 4 4 0 0 0-2.14 7.59c.41.2.73.58.73 1.04V20a1 1 0 0 0 1 1Z" /><path d="M6 17h12" /></>),
  campana: (<><path d="M3 20a1 1 0 0 1-1-1v-1a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v1a1 1 0 0 1-1 1Z" /><path d="M20 16a8 8 0 1 0-16 0" /><path d="M12 4v4" /><path d="M10 4h4" /></>),
  caja: (<><rect width="16" height="20" x="4" y="2" rx="2" /><path d="M8 6h8" /><path d="M16 14v4" /><path d="M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01" /></>),
  moto: (<><circle cx="18.5" cy="17.5" r="3.5" /><circle cx="5.5" cy="17.5" r="3.5" /><circle cx="15" cy="5" r="1" /><path d="M12 17.5V14l-3-3 4-3 2 3h2" /></>),
  auricular: (<><path d="M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Zm0 0a9 9 0 1 1 18 0m0 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3Z" /><path d="M21 16v2a4 4 0 0 1-4 4h-5" /></>),
  ajustes: (<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>),
  timbre: (<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>),
  usuario: (<><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>),
  usuarios: (<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>),
  pin: (<><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>),
  reloj: (<><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>),
  check: (<><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></>),
  capas: (<><path d="m12 2 10 5-10 5L2 7Z" /><path d="m2 17 10 5 10-5" /><path d="m2 12 10 5 10-5" /></>),
  actualizar: (<><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 16h5v5" /></>),
  carrito: (<><circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" /></>),
  cubiertos: (<><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" /><path d="M7 2v20" /><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" /></>),
  monedas: (<><circle cx="8" cy="8" r="6" /><path d="M18.09 10.37A6 6 0 1 1 10.34 18" /><path d="M7 6h1v4" /><path d="m16.71 13.88.7.71-2.82 2.82" /></>),
  paquete: (<><path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></>),
  mapa: (<><path d="M14.1 5.55a2 2 0 0 0 1.79 0l3.66-1.83A1 1 0 0 1 21 4.62v12.76a1 1 0 0 1-.55.9l-4.56 2.27a2 2 0 0 1-1.78 0l-4.22-2.1a2 2 0 0 0-1.78 0l-3.66 1.83A1 1 0 0 1 3 19.38V6.62a1 1 0 0 1 .55-.9l4.56-2.27a2 2 0 0 1 1.78 0z" /><path d="M15 5.76v15" /><path d="M9 3.24v15" /></>),
  buscar: (<><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>),
  enviar: (<><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>),
  clip: <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />,
  mas: (<><path d="M5 12h14" /><path d="M12 5v14" /></>),
  menos: <path d="M5 12h14" />,
  lapiz: <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />,
  impresora: (<><path d="M6 9V2h12v7" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect width="12" height="8" x="6" y="14" /></>),
  calendario: (<><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>),
  hoja: (<><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" /><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" /></>),
  lista: (<><rect width="8" height="4" x="8" y="2" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M12 11h4M12 16h4M8 11h.01M8 16h.01" /></>),
  rayo: <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />,
  ojo: (<><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>),
  tienda: (<><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" /><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><path d="M2 7h20" /><path d="M22 7v3a2 2 0 0 1-2 2 2.7 2.7 0 0 1-2-1 2.7 2.7 0 0 1-4 0 2.7 2.7 0 0 1-4 0 2.7 2.7 0 0 1-4 0 2.7 2.7 0 0 1-2 1 2 2 0 0 1-2-2V7" /></>),
  alerta: (<><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4M12 17h.01" /></>),
  telefono: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />,
  robot: (<><path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2M20 14h2M15 13v2M9 13v2" /></>),
  imagen: (<><rect width="18" height="18" x="3" y="3" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21" /></>),
  prohibido: (<><circle cx="12" cy="12" r="10" /><path d="m4.9 4.9 14.2 14.2" /></>),
  cuadricula: (<><rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" /></>),
  ensalada: (<><path d="M7 21h10" /><path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z" /><path d="M11.38 12a2.4 2.4 0 0 1-.4-4.77 2.4 2.4 0 0 1 3.2-2.77 2.4 2.4 0 0 1 3.47-.63 2.4 2.4 0 0 1 3.37 3.37 2.4 2.4 0 0 1-1.1 3.7 2.51 2.51 0 0 1 .03 1.1" /></>),
  pez: (<><path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6Z" /><path d="M18 12v.5M16 17.93a9.77 9.77 0 0 1 0-11.86M7 10.67C7 8 5.58 5.97 2.73 5.5c-1 1.5-1 5 .23 6.5-1.24 1.5-1.24 5-.23 6.5C5.58 18.03 7 16 7 13.33" /></>),
  vaso: (<><path d="m6 8 1.75 12.28a2 2 0 0 0 2 1.72h4.54a2 2 0 0 0 2-1.72L18 8" /><path d="M5 8h14" /><path d="M12 8V2h3" /></>),
  billete: (<><rect width="20" height="12" x="2" y="6" rx="2" /><circle cx="12" cy="12" r="2" /><path d="M6 12h.01M18 12h.01" /></>),
  tarjeta: (<><rect width="20" height="14" x="2" y="5" rx="2" /><path d="M2 10h20" /></>),
  celular: (<><rect width="14" height="20" x="5" y="2" rx="2" /><path d="M12 18h.01" /></>),
  transferir: (<><path d="M8 3 4 7l4 4" /><path d="M4 7h16" /><path d="m16 21 4-4-4-4" /><path d="M20 17H4" /></>),
  mesa: (<><path d="M3 9h18" /><path d="M5 9v11M19 9v11" /><path d="M3 9l2-4h14l2 4" /><path d="M9 13h6" /></>),
  flecha: <path d="m9 18 6-6-6-6" />,
  cerrar: (<><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>),
  filtro: <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />,
  grafico: (<><path d="M3 3v18h18" /><path d="M18 17V9M13 17V5M8 17v-3" /></>),
};

export type NombreIcono = keyof typeof P;

export function Icono({ n, size = 20, className, style, grosor = 1.9 }: { n: NombreIcono; size?: number; className?: string; style?: CSSProperties; grosor?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={grosor} strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden>
      {P[n]}
    </svg>
  );
}

/** Rama de hojas de eucalipto (decorativa). */
export function Rama({ size = 120, className, style, color = "currentColor" }: { size?: number; className?: string; style?: CSSProperties; color?: string }) {
  const hojas = [
    [30, 92, -50], [42, 76, 35], [52, 64, -45], [64, 50, 30], [72, 40, -40], [84, 28, 25], [92, 18, -35],
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={className} style={style} aria-hidden>
      <path d="M14 112 C 40 84, 70 50, 104 8" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" opacity=".7" />
      {hojas.map(([x, y, r], i) => (
        <ellipse key={i} cx={x} cy={y} rx="7" ry="15" fill={color} opacity={0.55 + (i % 3) * 0.15} transform={`rotate(${r} ${x} ${y}) translate(${r > 0 ? 9 : -9} 0)`} />
      ))}
    </svg>
  );
}

/** Ilustración de un plato criollo (reemplaza fotografías que el restaurante aún no ha entregado). */
export function PlatoIlustracion({ size = 220 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.7} viewBox="0 0 220 154" aria-hidden>
      <ellipse cx="110" cy="96" rx="104" ry="52" fill="#000" opacity=".18" />
      <ellipse cx="110" cy="88" rx="104" ry="52" fill="#f3efe6" />
      <ellipse cx="110" cy="88" rx="84" ry="40" fill="#fffdf8" />
      <path d="M58 86c0-22 18-38 40-38s38 16 38 38z" fill="#fbf6ea" stroke="#e9dfc8" strokeWidth="2" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <ellipse key={i} cx={70 + i * 8} cy={74 - Math.sin(i / 2.3) * 14} rx="3" ry="1.6" fill="#eadfc4" />
      ))}
      <path d="M118 96c10-16 34-20 52-10 6 4 6 12-2 16-16 8-40 6-50-6z" fill="#8a4b22" />
      <path d="M124 92c10-8 26-10 38-4" stroke="#5f2f12" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M128 100c10-6 24-6 34-2" stroke="#5f2f12" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="150" cy="64" r="11" fill="#d84a3a" /><circle cx="150" cy="64" r="6" fill="#ee7b62" />
      <circle cx="170" cy="72" r="9" fill="#d84a3a" />
      <path d="M128 60c8-12 22-14 30-6-10 2-18 6-30 6z" fill="#5f9e46" />
      <path d="M160 82c6-10 18-12 26-6-8 2-16 6-26 6z" fill="#4c8a38" />
      <path d="M86 46c4-8 12-10 16-6-4 2-10 4-16 6z" fill="#5f9e46" />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={60 + i * 9} y={100 + (i % 2) * 4} width="30" height="6" rx="3" fill="#f2b632" transform={`rotate(${-20 + i * 8} ${70 + i * 9} 104)`} />
      ))}
    </svg>
  );
}
