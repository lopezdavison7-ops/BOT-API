

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

export default {
    nombre: 'tetas',
    categoria: 'nsfw',
    alias: ['boobs', 'teta', 'pechos', 'bust'],
    descripcion: 'Imágenes NSFW random (solo +18)',
    uso: '.tetas | .tetas <1-5> | .tetas on/off (admins)',
    ejecutar: async ({ sock, msg, argumento, responder }) => {
        const chatJid = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        const isGroup = chatJid.endsWith('@g.us');
        const s = sock || global.conns?.[0];

        const input = String(argumento || '').trim().toLowerCase();

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
                    '┃    *.tetas on*\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            }
        }

        let cantidad = 1;
        if (/^\d+$/.test(input)) {
            cantidad = Math.min(Math.max(parseInt(input), 1), MAX_IMAGENES);
        }

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
            console.error('[TETAS] Error:', error?.message || error);
            await responder.texto(
                '╭━━〔 ❌ 𝐓𝐄𝐓𝐀𝐒 〕━━⬣\n' +
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