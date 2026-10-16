import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { downloadMediaMessage } from 'baileys';

const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RUTA_ADOPCIONES = path.join(__dirname, '..', '..', 'database', 'adopciones.json');
const tmp = path.join(__dirname, '..', '..', 'tmp');

if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true });

function leerAdopciones() {
    try {
        const data = fs.readFileSync(RUTA_ADOPCIONES, 'utf8');
        return JSON.parse(data);
    } catch {
        return {};
    }
}

function guardarAdopcion(adoptante, adoptado) {
    const db = leerAdopciones();
    if (!db[adoptante]) db[adoptante] = [];
    if (!db[adoptante].includes(adoptado)) {
        db[adoptante].push(adoptado);
    }
    fs.mkdirSync(path.dirname(RUTA_ADOPCIONES), { recursive: true });
    fs.writeFileSync(RUTA_ADOPCIONES, JSON.stringify(db, null, 2), 'utf8');
}

async function obtenerFoto(sock, jid) {
    try {
        const url = await sock.profilePictureUrl(jid, 'image');
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) return null;
        const buf = Buffer.from(await res.arrayBuffer());
        return buf.length > 0 ? buf : null;
    } catch {
        return null;
    }
}

function dibujarAvatarCircular(ctx, x, y, radio, buffer, nombre) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radio, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();

    if (buffer) {
        const img = new (require('canvas').Image)();
        img.src = buffer;
        ctx.drawImage(img, x - radio, y - radio, radio * 2, radio * 2);
    } else {
        // Fallback: círculo de color con inicial
        ctx.fillStyle = '#334155';
        ctx.fillRect(x - radio, y - radio, radio * 2, radio * 2);
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${radio}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((nombre || '?').charAt(0).toUpperCase(), x, y + 4);
    }
    ctx.restore();

    // Borde
    ctx.beginPath();
    ctx.arc(x, y, radio, 0, Math.PI * 2, true);
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 3;
    ctx.stroke();
}

async function generarConCanvas(sock, adoptante, adoptado, nombreA, nombreB) {
    const { createCanvas, Image } = require('canvas');
    const canvas = createCanvas(700, 400);
    const ctx = canvas.getContext('2d');

    // Fondo degradado
    const grad = ctx.createLinearGradient(0, 0, 700, 400);
    grad.addColorStop(0, '#05070d');
    grad.addColorStop(0.5, '#0a1f15');
    grad.addColorStop(1, '#05070d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 700, 400);

    // Marco decorativo doble
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 3;
    ctx.strokeRect(15, 15, 670, 370);
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(22, 22, 656, 356);

    // Esquinas decorativas
    const esquinas = [[15, 15], [685, 15], [15, 385], [685, 385]];
    ctx.fillStyle = '#4ade80';
    esquinas.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
    });

    // Título
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🍼 CERTIFICADO DE ADOPCIÓN ', 350, 65);

    // Línea separadora
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(100, 80);
    ctx.lineTo(600, 80);
    ctx.stroke();

    // Subtítulo
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px Arial, sans-serif';
    ctx.fillText('BOT-API • Registro oficial de familia', 350, 100);

    // Obtener fotos
    const fotoA = await obtenerFoto(sock, adoptante);
    const fotoB = await obtenerFoto(sock, adoptado);

    // Avatares
    dibujarAvatarCircular(ctx, 200, 220, 65, fotoA, nombreA);
    dibujarAvatarCircular(ctx, 500, 220, 65, fotoB, nombreB);

    // Corazón en el medio
    ctx.fillStyle = '#ef4444';
    ctx.font = '50px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('❤️', 350, 220);

    // Nombres debajo de los avatares
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const nA = nombreA.length > 18 ? nombreA.substring(0, 15) + '...' : nombreA;
    const nB = nombreB.length > 18 ? nombreB.substring(0, 15) + '...' : nombreB;
    ctx.fillText(nA, 200, 300);
    ctx.fillText(nB, 500, 300);

    // Etiquetas
    ctx.fillStyle = '#4ade80';
    ctx.font = '12px Arial, sans-serif';
    ctx.fillText('👑 ADOPTANTE', 200, 320);
    ctx.fillText('👶 ADOPTADO', 500, 320);

    // Texto inferior
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'italic 14px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
        `"${nombreA} adopta oficialmente a ${nombreB}"`,
        350, 360
    );

    // Fecha
    ctx.fillStyle = '#64748b';
    ctx.font = '11px Arial, sans-serif';
    const fecha = new Date().toLocaleDateString('es-ES', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
    ctx.fillText(`📅 ${fecha}`, 350, 385);

    return canvas.toBuffer('image/png');
}

async function generarConSharp(sock, adoptante, adoptado, nombreA, nombreB) {
    const sharp = require('sharp');
    const fotoA = await obtenerFoto(sock, adoptante);
    const fotoB = await obtenerFoto(sock, adoptado);

    const fecha = new Date().toLocaleDateString('es-ES', {
        year: 'numeric', month: 'long', day: 'numeric'
    });

    const svg = `
<svg width="700" height="400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#05070d"/>
      <stop offset="50%" style="stop-color:#0a1f15"/>
      <stop offset="100%" style="stop-color:#05070d"/>
    </linearGradient>
  </defs>
  <rect width="700" height="400" fill="url(#bg)"/>
  <rect x="15" y="15" width="670" height="370" fill="none" stroke="#22c55e" stroke-width="3"/>
  <rect x="22" y="22" width="656" height="356" fill="none" stroke="rgba(74,222,128,0.3)" stroke-width="1"/>
  
  <text x="350" y="65" font-family="Arial" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle">🍼 CERTIFICADO DE ADOPCIÓN 🍼</text>
  <line x1="100" y1="80" x2="600" y2="80" stroke="#4ade80" stroke-width="1"/>
  <text x="350" y="100" font-family="Arial" font-size="14" fill="#94a3b8" text-anchor="middle">BOT-API • Registro oficial de familia</text>
  
  <circle cx="200" cy="220" r="65" fill="#334155" stroke="#4ade80" stroke-width="3"/>
  <circle cx="500" cy="220" r="65" fill="#334155" stroke="#4ade80" stroke-width="3"/>
  
  <text x="350" y="240" font-family="Arial" font-size="50" text-anchor="middle">❤️</text>
  
  <text x="200" y="310" font-family="Arial" font-size="16" font-weight="bold" fill="#ffffff" text-anchor="middle">${nombreA.length > 18 ? nombreA.substring(0, 15) + '...' : nombreA}</text>
  <text x="500" y="310" font-family="Arial" font-size="16" font-weight="bold" fill="#ffffff" text-anchor="middle">${nombreB.length > 18 ? nombreB.substring(0, 15) + '...' : nombreB}</text>
  
  <text x="200" y="330" font-family="Arial" font-size="12" fill="#4ade80" text-anchor="middle">👑 ADOPTANTE</text>
  <text x="500" y="330" font-family="Arial" font-size="12" fill="#4ade80" text-anchor="middle">👶 ADOPTADO</text>
  
  <text x="350" y="365" font-family="Arial" font-size="14" font-style="italic" fill="#cbd5e1" text-anchor="middle">"${nombreA} adopta oficialmente a ${nombreB}"</text>
  <text x="350" y="388" font-family="Arial" font-size="11" fill="#64748b" text-anchor="middle">📅 ${fecha}</text>
</svg>`;

    return await sharp(Buffer.from(svg)).png().toBuffer();
}

export default {
    nombre: 'adoptar',
    categoria: 'Diversión',
    alias: ['adopt', 'hijo', 'hija'],
    descripcion: 'Adopta a otro usuario y genera un certificado oficial.',

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        const mencion = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const adoptado = mencion[0];
        const adoptante = msg.key.participant || msg.key.remoteJid;

        if (!adoptado || adoptado === adoptante) {
            return await responder.texto(
                '╭━━〔 👶 𝐀𝐎𝐏𝐂𝐈𝐎́𝐍 〕━━⬣\n' +
                '┃\n' +
                '┃  Debes mencionar a alguien para adoptar.\n' +
                '┃\n' +
                '┃ 💡 Ejemplo: .adoptar @usuario\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }

        const nombreAdoptante = msg.pushName || adoptante.split('@')[0];
        let nombreAdoptado = adoptado.split('@')[0];
        try {
            const info = await sock.onWhatsApp(adoptado);
            if (info && info[0]?.notify) nombreAdoptado = info[0].notify;
        } catch {}

        try {
            await sock.sendMessage(jid, { react: { text: '🍼', key: msg.key } });

            guardarAdopcion(adoptante, adoptado);

            let buffer = null;

            // Intento 1: Canvas local
            try {
                buffer = await generarConCanvas(sock, adoptante, adoptado, nombreAdoptante, nombreAdoptado);
                console.log('[ADOPTAR] ✅ Imagen generada con Canvas');
            } catch (e1) {
                console.log('[ADOPTAR] Canvas falló, usando Sharp:', e1?.message);
                // Intento 2: Sharp + SVG (ya instalado para stickers)
                try {
                    buffer = await generarConSharp(sock, adoptante, adoptado, nombreAdoptante, nombreAdoptado);
                    console.log('[ADOPTAR] ✅ Imagen generada con Sharp');
                } catch (e2) {
                    console.log('[ADOPTAR] Sharp también falló:', e2?.message);
                }
            }

            const caption =
                '╭━━〔 👶 𝐀𝐃𝐎𝐏𝐂𝐈𝐎́𝐍 𝐄𝐗𝐈𝐓𝐎𝐒𝐀 〕━━⬣\n' +
                '┃\n' +
                `┃ 🍼 *@${adoptante.split('@')[0]}* ha adoptado a\n` +
                `┃ 👶 *@${adoptado.split('@')[0]}*\n` +
                '┃\n' +
                '┃ 📜 Certificado registrado en BOT-API\n' +
                '┃ 📅 ' + new Date().toLocaleDateString('es-ES') + '\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣';

            if (buffer) {
                await sock.sendMessage(jid, {
                    image: buffer,
                    caption,
                    mentions: [adoptante, adoptado]
                }, { quoted: msg });
            } else {
                // Fallback final: solo texto
                await responder.texto(caption);
            }

            await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });

        } catch (error) {
            console.error('[ADOPTAR] Error:', error?.message || error);
            await responder.texto(
                ' Ocurrió un error al procesar la adopción.\n\n' +
                '️ Detalle: ' + (error?.message || 'Error desconocido')
            );
        }
    }
};