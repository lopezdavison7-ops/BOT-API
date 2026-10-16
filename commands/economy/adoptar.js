import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RUTA_ADOPCIONES = path.join(__dirname, '..', '..', 'database', 'adopciones.json');

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

function limpiarNombre(nombre) {
    if (!nombre) return 'Usuario';
    // Eliminar caracteres invisibles, espacios múltiples y símbolos raros
    return String(nombre)
        .replace(/[\u200B-\u200D\uFEFF]/g, '') // caracteres invisibles
        .replace(/\s+/g, ' ') // espacios múltiples a uno solo
        .replace(/[*_~`]/g, '') // caracteres de formato WhatsApp
        .trim()
        .slice(0, 25) || 'Usuario';
}

async function obtenerNombre(sock, jid, msg) {
    if (!jid) return 'Usuario';

    // 1. Si es el mismo que mandó el mensaje, usar pushName
    if (jid === msg.key.participant || jid === msg.key.remoteJid) {
        return limpiarNombre(msg.pushName) || jid.split('@')[0];
    }

    // 2. Si es @lid, intentar resolver a número real
    let jidReal = jid;
    if (jid.endsWith('@lid')) {
        try {
            if (sock?.signalRepository?.lidMapper?.getPNForLid) {
                const pn = await sock.signalRepository.lidMapper.getPNForLid(jid);
                if (pn) {
                    jidReal = pn.includes('@') ? pn : pn + '@s.whatsapp.net';
                }
            }
        } catch {}
    }

    // 3. Buscar en store de contactos (usando jidReal si existe)
    const jidsToCheck = [jidReal, jid].filter(Boolean);
    for (const j of jidsToCheck) {
        try {
            if (sock?.store?.contacts?.[j]?.name) {
                return limpiarNombre(sock.store.contacts[j].name);
            }
            if (sock?.store?.contacts?.[j]?.notify) {
                return limpiarNombre(sock.store.contacts[j].notify);
            }
            if (sock?.store?.contacts?.[j]?.verifiedName) {
                return limpiarNombre(sock.store.contacts[j].verifiedName);
            }
        } catch {}
    }

    // 4. Buscar en metadata del grupo
    try {
        if (msg.key.remoteJid?.endsWith('@g.us')) {
            const metadata = await sock.groupMetadata(msg.key.remoteJid);
            for (const p of (metadata.participants || [])) {
                const pJid = typeof p === 'string' ? p : (p.id || p.jid || '');
                if (pJid === jid || pJid === jidReal) {
                    if (p.name) return limpiarNombre(p.name);
                    if (p.notify) return limpiarNombre(p.notify);
                }
            }
        }
    } catch {}

    // 5. Fallback: número limpio sin @lid
    const numero = String(jidReal).split('@')[0].replace(/\D/g, '');
    return numero || 'Usuario';
}

export default {
    nombre: 'adoptar',
    categoria: 'Diversión',
    alias: ['adopt', 'hijo', 'hija', 'adoptados', 'misadoptados', 'listaadoptados'],
    descripcion: '.adoptar @usuario para adoptar | .adoptados para ver tu lista',

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        const mencion = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const adoptado = mencion[0];
        const adoptante = msg.key.participant || msg.key.remoteJid;
        const textoMsg = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').trim().toLowerCase();
        const nombreComando = textoMsg.split(' ')[0].replace('.', '');

        // ───────────── .adoptados ─────────────
        if (['adoptados', 'misadoptados', 'listaadoptados'].includes(nombreComando)) {
            const objetivo = adoptado || adoptante;
            const db = leerAdopciones();
            const lista = db[objetivo] || [];

            const nombreObjetivo = await obtenerNombre(sock, objetivo, msg);

            if (lista.length === 0) {
                return await responder.texto(
                    '━━〔 👶 𝐀𝐃𝐏𝐓𝐃𝐎𝐒 〕━━⬣\n' +
                    '┃\n' +
                    `┃  *${nombreObjetivo}* no ha adoptado a nadie aún.\n` +
                    '┃\n' +
                    '┃  Usa *.adoptar @usuario* para empezar tu familia.\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );
            }

            let texto =
                '╭━━〔 👶 𝐀𝐃𝐎𝐏𝐓𝐀𝐃𝐒 〕━━⬣\n' +
                '┃\n' +
                `┃ 👑 *${nombreObjetivo}* tiene *${lista.length}* adoptado(s):\n` +
                '┃\n';

            for (let i = 0; i < lista.length; i++) {
                const adoptadoJid = lista[i];
                const nombreAdoptado = await obtenerNombre(sock, adoptadoJid, msg);
                texto += `┃ ${i + 1}. *${nombreAdoptado}*\n`;
            }

            texto +=
                '┃\n' +
                '┃ 📅 Registrados en BOT-API\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━';

            return await sock.sendMessage(jid, {
                text: texto,
                mentions: [objetivo, ...lista]
            }, { quoted: msg });
        }

        // ───────────── .adoptar ─────────────
        if (!adoptado || adoptado === adoptante) {
            return await responder.texto(
                '╭━━〔 👶 𝐀𝐃𝐎𝐏𝐂𝐈𝐎́𝐍 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Debes mencionar a alguien para adoptar.\n' +
                '┃\n' +
                '┃ 💡 Ejemplo: .adoptar @usuario\n' +
                '\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }

        try {
            await sock.sendMessage(jid, { react: { text: '🍼', key: msg.key } });

            guardarAdopcion(adoptante, adoptado);

            const nombreAdoptante = await obtenerNombre(sock, adoptante, msg);
            const nombreAdoptado = await obtenerNombre(sock, adoptado, msg);

            const certificado =
                '╭━━━〔 📜 𝐂𝐄𝐑𝐓𝐈𝐅𝐈𝐂𝐀𝐃𝐎 𝐃𝐄 𝐀𝐃𝐎𝐏𝐂𝐈𝐎́𝐍 〕━━━╮\n' +
                '┃\n' +
                '┃  🍼 *¡NUEVA ADOPCIÓN REGISTRADA!*\n' +
                '┃\n' +
                `┃  👑 *Padre/Madre:* ${nombreAdoptante}\n` +
                `┃  👶 *Hijo/a:* ${nombreAdoptado}\n` +
                '\n' +
                '┃  ━━━━━━━━━━━━━━━━━━━━━━\n' +
                '┃\n' +
                '┃  "Por la presente se certifica que\n' +
                '┃   se ha realizado una adopción oficial\n' +
                '┃   registrada en el sistema BOT-API."\n' +
                '\n' +
                '┃  ━━━━━━━━━━━━━━━━━━━━━━\n' +
                '┃\n' +
                `┃  📅 Fecha: ${new Date().toLocaleDateString('es-ES')}\n` +
                '  🏛️ Registrado por:  BOT-API\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯';

            await sock.sendMessage(jid, {
                text: certificado,
                mentions: [adoptante, adoptado]
            }, { quoted: msg });

            await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });

        } catch (error) {
            console.error('[ADOPTAR] Error:', error?.message || error);
            await responder.texto(
                '❌ Ocurrió un error al procesar la adopción.\n\n' +
                '️ Detalle: ' + (error?.message || 'Error desconocido')
            );
        }
    }
};