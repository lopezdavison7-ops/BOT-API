// commands/nsfw/girls.js
// ============================================================
// BOT-API — GIRLS (NSFW - Delirius API)
// La API devuelve la imagen directa (no JSON)
// ============================================================

import { obtenerStore, guardarStore } from '../../lib/jsonStore.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ARCHIVO_GRUPOS = path.join(__dirname, '..', '..', 'database', 'grupos.json');

const API = 'https://api.delirius.online/nsfw/girls';
const MAX_IMAGENES = 5;

function obtenerGrupos() {
    return obtenerStore(ARCHIVO_GRUPOS, {});
}

function guardarGrupos(grupos) {
    guardarStore(ARCHIVO_GRUPOS, grupos);
}

export default {
    nombre: 'girls',
    categoria: 'nsfw',
    alias: ['chicas', 'girl', 'mujer', 'chica'],
    descripcion: 'Imágenes de chicas NSFW (solo +18)',
    uso: '.girls | .girls <1-5> | .girls on/off (admins)',
    ejecutar: async ({ sock, msg, argumento, responder }) => {
        const chatJid = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        const isGroup = chatJid.endsWith('@g.us');
        const s = sock || global.conns?.[0];

        const input = String(argumento || '').trim().toLowerCase();

        // ============================================
        // MODO ADMIN: on / off (comparte flag nsfw con tetas)
        // ============================================
        if (isGroup && (input === 'on' || input === 'off')) {
            let esAdmin = false;
            try {
                const metadata = await s.groupMetadata(chatJid);
                const participante = metadata.participants.find(p => p.id === sender);
                esAdmin = Boolean(participante?.admin);
            } catch (e) {}

            if (!esAdmin) {
                return await responder.texto(
                    '╭━━〔 🔞 𝐍𝐒𝐅𝐖 〕━━⬣\n' +
                    '┃\n' +
                    '┃ ❌ Solo los admins pueden\n' +
                    '┃    activar/desactivar NSFW.\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            }

            const grupos = obtenerGrupos();
            if (!grupos[chatJid]) grupos[chatJid] = {};
            grupos[chatJid].nsfw = (input === 'on');
            guardarGrupos(grupos);

            return await responder.texto(
                '╭━━〔 🔞 𝐍𝐒𝐅𝐖 〕━━⬣\n' +
                '┃\n' +
                (input === 'on'
                    ? '┃ ✅ Contenido +18 *ACTIVADO*\n┃    en este grupo.\n'
                    : '┃ ❌ Contenido +18 *DESACTIVADO*\n┃    en este grupo.\n') +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        // ============================================
        // RESTRICCIÓN 18+ EN GRUPOS
        // ============================================
        if (isGroup) {
            const grupos = obtenerGrupos();
            if (!grupos[chatJid]?.nsfw) {
                return await responder.texto(
                    '╭━━〔 🔞 𝐍𝐒𝐅𝐖 〕━━⬣\n' +
                    '┃\n' +
                    '┃ ❌ El contenido +18 está\n' +
                    '┃    desactivado en este grupo.\n' +
                    '┃\n' +
                    '┃ 📌 Un admin puede activarlo con:\n' +
                    '┃    *.girls on*\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
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
        // GENERAR Y ENVIAR IMÁGENES
        // ============================================
        try {
            if (cantidad > 1) {
                await responder.texto(`⏳ Generando *${cantidad}* imágenes +18...`);
            }

            for (let i = 0; i < cantidad; i++) {
                const imageUrl = `${API}?_=${Date.now()}_${i}`;
                
                await responder.imagen(
                    { url: imageUrl },
                    `🔞 *+18* · 🔥 ${i + 1}/${cantidad}\n\n⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈`
                );
            }

        } catch (error) {
            console.error('[GIRLS] Error:', error?.message || error);
            await responder.texto(
                '╭━━〔 ❌ 𝐆𝐈𝐑𝐋𝐒 〕━━⬣\n' +
                '┃\n' +
                '┃ Error obteniendo imágenes.\n' +
                '┃\n' +
                `┃ ⚠️ ${error?.message || 'Error desconocido'}\n` +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }
    }
};