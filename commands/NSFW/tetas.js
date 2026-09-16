// commands/nsfw/tetas.js
// ============================================================
// BOT-API — TETAS (NSFW - Delirius API)
// ============================================================
// .tetas          → 1 imagen random
// .tetas 3        → hasta 5 imágenes
// .tetas on/off   → (admins) activar/desactivar NSFW en el grupo
// ============================================================

import { obtenerStore, guardarStore } from '../../lib/jsonStore.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ARCHIVO_GRUPOS = path.join(__dirname, '..', '..', 'database', 'grupos.json');

const API = 'https://api.delirius.online/nsfw/boobs';
const MAX_IMAGENES = 5;

function obtenerGrupos() {
    return obtenerStore(ARCHIVO_GRUPOS, {});
}

function guardarGrupos(grupos) {
    guardarStore(ARCHIVO_GRUPOS, grupos);
}

// ---------- EXTRAER URL DE LA RESPUESTA ----------
function extraerUrl(d) {
    if (!d) return '';
    if (typeof d === 'string') return d;
    if (Array.isArray(d)) {
        const primero = d[0];
        if (typeof primero === 'string') return primero;
        return primero?.url || primero?.image || primero?.img || primero?.link || '';
    }
    return d.url || d.image || d.img || d.link || '';
}

export default {
    nombre: 'tetas',
    categoria: 'nsfw',
    alias: ['boobs', 'teta', 'pechos'],
    descripcion: 'Imágenes NSFW random (solo +18)',
    uso: '.tetas | .tetas <1-5> | .tetas on/off (admins)',
    ejecutar: async ({ sock, msg, argumento, responder }) => {
        const chatJid = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        const isGroup = chatJid.endsWith('@g.us');
        const s = sock || global.conns?.[0];

        const input = String(argumento || '').trim().toLowerCase();

        // ============================================
        // MODO ADMIN: on / off
        // ============================================
        if (isGroup && (input === 'on' || input === 'off')) {
            // Verificar admin
            let esAdmin = false;
            try {
                const metadata = await s.groupMetadata(chatJid);
                const participante = metadata.participants.find(p => p.id === sender);
                esAdmin = Boolean(participante?.admin);
            } catch (e) {}

            if (!esAdmin) {
                return await responder.texto(
                    '╭━━〔  𝐍𝐒𝐅𝐖 〕━━⬣\n' +
                    '┃\n' +
                    '┃ Solo los admins pueden\n' +
                    '┃ activar/desactivar NSFW.\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            }

            const grupos = obtenerGrupos();
            if (!grupos[chatJid]) grupos[chatJid] = {};
            grupos[chatJid].nsfw = (input === 'on');
            guardarGrupos(grupos);

            return await responder.texto(
                '╭━━〔 🔞 𝐒𝐅𝐖 〕━━⬣\n' +
                '┃\n' +
                (input === 'on'
                    ? '┃ ✅ Contenido +18 *ACTIVADO*\n┃    en este grupo.\n'
                    : '┃ ❌ Contenido +18 *DESACTIVADO*\n┃    en este grupo.\n') +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        // ============================================
        // RESTRICCIÓN 18+ EN GRUPOS
        // ============================================
        if (isGroup) {
            const grupos = obtenerGrupos();
            if (!grupos[chatJid]?.nsfw) {
                return await responder.texto(
                    '╭━━〔  𝐍𝐒𝐅𝐖 〕━━⬣\n' +
                    '┃\n' +
                    '┃ ❌ El contenido +18 está\n' +
                    '┃    desactivado en este grupo.\n' +
                    '┃\n' +
                    '┃ 📌 Un admin puede activarlo con:\n' +
                    '┃    .tetas on\n' +
                    '┃\n' +
                    '╰━━〔  𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            }
        }

        // ============================================
        // CANTIDAD DE IMÁGENES
        // ============================================
        let cantidad = 1;
        if (/^\d+$/.test(input)) {
            cantidad = Math.min(Math.max(parseInt(input), 1), MAX_IMAGENES);
        }

        // ============================================
        // PEDIR IMÁGENES A LA API
        // ============================================
        try {
            const urls = [];

            for (let i = 0; i < cantidad; i++) {
                const res = await fetch(API);
                const json = await res.json();
                const url = extraerUrl(json.data || json.datos);
                if (url) urls.push(url);
            }

            if (!urls.length) {
                return await responder.texto(
                    '╭━━〔 ❌ 𝐓𝐄𝐓𝐀𝐒 〕━━⬣\n' +
                    '┃\n' +
                    '┃ La API no devolvió imágenes.\n' +
                    '┃ Intenta de nuevo.\n' +
                    '┃\n' +
                    '╰━━〔  𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            }

            // ---------- ENVIAR ----------
            for (let i = 0; i < urls.length; i++) {
                await responder.imagen(
                    { url: urls[i] },
                    '🔞 *+18* · 🔥 ' + (i + 1) + '/' + urls.length + '\n\n⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈'
                );
            }

        } catch (error) {
            console.error('[TETAS] Error:', error?.message || error);
            await responder.texto(
                '╭━━〔 ❌ 𝐓𝐄𝐓𝐀𝐒 〕━━⬣\n' +
                '┃\n' +
                '┃ Error obteniendo imágenes.\n' +
                '┃\n' +
                `┃ ⚠️ ${error?.message || 'Error desconocido'}\n` +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐈 ⚡ 〕━━⬣'
            );
        }
    }
};