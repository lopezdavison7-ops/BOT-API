// commands/utils/reloj.js
// ============================================================
// COMANDO: RELOJ
// Genera una tarjeta de reloj (estilo neón) como IMAGEN, no
// texto — se arma en SVG y se convierte a PNG con `sharp` (ya
// es dependencia del proyecto, no se agrega nada pesado como
// un navegador headless).
//
// Uso: .reloj            -> Nicaragua (Managua) por defecto
// Uso: .reloj mexico      -> hora de México
// Uso: .reloj listar      -> muestra las regiones disponibles
// ============================================================

import sharp from 'sharp';
import moment from 'moment-timezone';

// ============================================================
// REGIONES DISPONIBLES
// ============================================================
const REGIONES = {
    nicaragua: { nombre: 'Nicaragua', zona: 'America/Managua' },
    managua: { nombre: 'Nicaragua', zona: 'America/Managua' },
    mexico: { nombre: 'México', zona: 'America/Mexico_City' },
    'méxico': { nombre: 'México', zona: 'America/Mexico_City' },
    espana: { nombre: 'España', zona: 'Europe/Madrid' },
    'españa': { nombre: 'España', zona: 'Europe/Madrid' },
    colombia: { nombre: 'Colombia', zona: 'America/Bogota' },
    argentina: { nombre: 'Argentina', zona: 'America/Argentina/Buenos_Aires' },
    chile: { nombre: 'Chile', zona: 'America/Santiago' },
    peru: { nombre: 'Perú', zona: 'America/Lima' },
    'perú': { nombre: 'Perú', zona: 'America/Lima' },
    venezuela: { nombre: 'Venezuela', zona: 'America/Caracas' },
    honduras: { nombre: 'Honduras', zona: 'America/Tegucigalpa' },
    guatemala: { nombre: 'Guatemala', zona: 'America/Guatemala' },
    salvador: { nombre: 'El Salvador', zona: 'America/El_Salvador' },
    costarica: { nombre: 'Costa Rica', zona: 'America/Costa_Rica' },
    panama: { nombre: 'Panamá', zona: 'America/Panama' },
    'panamá': { nombre: 'Panamá', zona: 'America/Panama' },
    dominicana: { nombre: 'República Dominicana', zona: 'America/Santo_Domingo' },
    ecuador: { nombre: 'Ecuador', zona: 'America/Guayaquil' },
    bolivia: { nombre: 'Bolivia', zona: 'America/La_Paz' },
    paraguay: { nombre: 'Paraguay', zona: 'America/Asuncion' },
    uruguay: { nombre: 'Uruguay', zona: 'America/Montevideo' },
    usa: { nombre: 'Estados Unidos (NY)', zona: 'America/New_York' },
    eeuu: { nombre: 'Estados Unidos (NY)', zona: 'America/New_York' }
};

const REGION_DEFECTO = 'nicaragua';

function normalizar(texto) {
    return String(texto || '')
        .toLowerCase()
        .trim();
}

function formatearUptime(segundos) {
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    const s = Math.floor(segundos % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function escaparXML(texto) {
    return String(texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// ============================================================
// GENERAR EL SVG DE LA TARJETA
// ============================================================
function generarSVG({ hora, minuto, segundo, meridiano, fecha, diaSemana, zonaTexto, unixTime, uptimeTexto }) {
    const ancho = 700;
    const alto = 940;

    return `
<svg width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="10" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <linearGradient id="fondo" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0b0f16" />
      <stop offset="100%" stop-color="#050709" />
    </linearGradient>
  </defs>

  <rect width="${ancho}" height="${alto}" fill="url(#fondo)" />

  <rect x="40" y="40" width="${ancho - 80}" height="${alto - 80}" rx="28"
        fill="#0d1420" stroke="#22d3ee" stroke-width="2" filter="url(#glow)" />

  <circle cx="${ancho - 100}" cy="110" r="9" fill="#22c55e" filter="url(#glow)" />

  <text x="80" y="105" font-family="Arial, sans-serif" font-size="20" fill="#22d3ee" font-weight="bold">🕐 RELOJ EN VIVO</text>
  <text x="80" y="150" font-family="Arial, sans-serif" font-size="30" fill="#ffffff" font-weight="bold">${escaparXML(zonaTexto)}</text>

  <line x1="80" y1="185" x2="${ancho - 80}" y2="185" stroke="#1e2937" stroke-width="2" />

  <text x="${ancho / 2}" y="400" text-anchor="middle" font-family="Arial, sans-serif"
        font-size="110" fill="#22d3ee" font-weight="bold" filter="url(#glow)">${hora}:${minuto}:${segundo}</text>
  <text x="${ancho - 100}" y="360" text-anchor="middle" font-family="Arial, sans-serif"
        font-size="30" fill="#9ca3af" font-weight="bold">${meridiano}</text>

  <line x1="80" y1="450" x2="${ancho - 80}" y2="450" stroke="#1e2937" stroke-width="2" />

  <text x="${ancho / 2}" y="510" text-anchor="middle" font-family="Arial, sans-serif"
        font-size="32" fill="#ffffff" font-weight="bold">${escaparXML(fecha)}</text>
  <text x="${ancho / 2}" y="550" text-anchor="middle" font-family="Arial, sans-serif"
        font-size="24" fill="#22d3ee" font-weight="bold">${escaparXML(diaSemana.toUpperCase())}</text>

  <line x1="80" y1="590" x2="${ancho - 80}" y2="590" stroke="#1e2937" stroke-width="2" />

  <rect x="80" y="630" width="${ancho - 160}" height="90" rx="14" fill="#111827" stroke="#1e2937" />
  <text x="${ancho / 2}" y="665" text-anchor="middle" font-family="Arial, sans-serif"
        font-size="16" fill="#9ca3af" letter-spacing="2">⏱️ BOT ACTIVO DESDE HACE</text>
  <text x="${ancho / 2}" y="700" text-anchor="middle" font-family="Arial, sans-serif"
        font-size="26" fill="#22d3ee" font-weight="bold">${uptimeTexto}</text>

  <rect x="80" y="740" width="${(ancho - 176) / 2}" height="100" rx="14" fill="#111827" stroke="#1e2937" />
  <text x="${80 + (ancho - 176) / 4}" y="775" text-anchor="middle" font-family="Arial, sans-serif"
        font-size="14" fill="#9ca3af" letter-spacing="2">ZONA HORARIA</text>
  <text x="${80 + (ancho - 176) / 4}" y="808" text-anchor="middle" font-family="Arial, sans-serif"
        font-size="22" fill="#22d3ee" font-weight="bold">${escaparXML(zonaTexto)}</text>

  <rect x="${80 + (ancho - 176) / 2 + 16}" y="740" width="${(ancho - 176) / 2}" height="100" rx="14" fill="#111827" stroke="#1e2937" />
  <text x="${80 + (ancho - 176) / 2 + 16 + (ancho - 176) / 4}" y="775" text-anchor="middle" font-family="Arial, sans-serif"
        font-size="14" fill="#9ca3af" letter-spacing="2">UNIX TIME</text>
  <text x="${80 + (ancho - 176) / 2 + 16 + (ancho - 176) / 4}" y="808" text-anchor="middle" font-family="Arial, sans-serif"
        font-size="22" fill="#22d3ee" font-weight="bold">${unixTime}</text>

  <text x="${ancho / 2}" y="880" text-anchor="middle" font-family="Arial, sans-serif"
        font-size="14" fill="#4b5563">Generado por BOT-API</text>
</svg>`;
}

export default {
    nombre: 'reloj',

    categoria: 'Utilidades',

    alias: [
        'relojlive'
    ],

    descripcion:
        'Tarjeta de reloj en vivo (imagen). Uso: .reloj <región opcional>. Ej: .reloj mexico',

    ejecutar: async ({
        sock,
        msg,
        jid,
        responder,
        argumento
    }) => {

        const entrada = normalizar(argumento);

        if (entrada === 'listar' || entrada === 'regiones') {
            const lista = [...new Set(Object.values(REGIONES).map(r => r.nombre))].sort();
            await responder.texto(
                '╭〔 🌎 𝐑𝐄𝐆𝐈𝐎𝐍𝐄𝐒 〕⬣\n┃\n' +
                lista.map(n => `┃ • ${n}`).join('\n') +
                '\n┃\n╰━━━━━━━━━━━━━━━━⬣'
            );
            return;
        }

        const region = REGIONES[entrada || REGION_DEFECTO];

        if (!region) {
            await responder.texto(
                '╭〔 ⚠️ 𝐑𝐄𝐋𝐎𝐉 〕⬣\n' +
                '┃\n' +
                `┃ ❌ No reconozco "${argumento}".\n` +
                '┃\n' +
                '┃ 📌 Uso: .reloj <región>\n' +
                '┃ 📌 Ejemplo: .reloj mexico\n' +
                '┃ 📌 Ver todas: .reloj listar\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
            return;
        }

        try {
            const ahora = moment.tz(region.zona);

            const hora24 = ahora.hour();
            const meridiano = hora24 >= 12 ? 'PM' : 'AM';
            const hora12 = hora24 % 12 === 0 ? 12 : hora24 % 12;

            const svg = generarSVG({
                hora: String(hora12).padStart(2, '0'),
                minuto: ahora.format('mm'),
                segundo: ahora.format('ss'),
                meridiano,
                fecha: ahora.format('DD [de] MMMM [de] YYYY'),
                diaSemana: ahora.format('dddd'),
                zonaTexto: region.nombre,
                unixTime: ahora.unix(),
                uptimeTexto: formatearUptime(process.uptime())
            });

            const buffer = await sharp(Buffer.from(svg))
                .png()
                .toBuffer();

            const chatJid = jid || msg.key.remoteJid;

            await sock.sendMessage(
                chatJid,
                {
                    image: buffer,
                    caption: `🕐 Hora actual en *${region.nombre}*`
                },
                { quoted: msg }
            );

        } catch (error) {
            console.error('[RELOJ] Error:', error?.message || error);
            await responder.texto('❌ No se pudo generar la tarjeta del reloj.');
        }
    }
};
