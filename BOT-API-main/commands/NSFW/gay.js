

import { obtenerStore } from '../../lib/jsonStore.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ARCHIVO_GRUPOS = path.join(__dirname, '..', '..', 'database', 'grupos.json');

const API = 'https://api.evogb.org/porn/video/gay?key=evogb-tYhNSXu6';
const MAX_VIDEOS = 3;

function obtenerGrupos() {
    try { return obtenerStore(ARCHIVO_GRUPOS) || {}; } catch (e) { return {}; }
}

export default {
    nombre: 'gay',
    categoria: 'NSFW',
    alias: ['gayvideo', 'vgay', 'gayporn'],
    descripcion: 'Videos +18 gay aleatorios (grupos NSFW / privado)',
    uso: '.gay [cantidad 1-3]',
    ejecutar: async ({ sock, msg, argumento, responder }) => {
        const chatJid = msg.key.remoteJid;
        const isGroup = chatJid.endsWith('@g.us');

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
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐏 ⚡ 〕━━⬣'
                );
            }
        }

        let cantidad = parseInt((argumento || '').trim());
        if (isNaN(cantidad) || cantidad < 1) cantidad = 1;
        if (cantidad > MAX_VIDEOS) cantidad = MAX_VIDEOS;

        await responder.texto('🔞 Buscando *' + cantidad + '* video(s) +18...');

        let enviados = 0;

        for (let i = 0; i < cantidad; i++) {
            try {
                const res = await fetch(API + '&_=' + Date.now() + '_' + i, {
                    signal: AbortSignal.timeout(20000)
                });
                if (!res.ok) continue;

                const json = await res.json();
                if (!json?.status || !json?.url) continue;

                await sock.sendMessage(chatJid, {
                    video: { url: json.url },
                    mimetype: 'video/mp4',
                    caption: '🔞 *+18* · 🏳️‍🌈 ' + (i + 1) + '/' + cantidad + '\n\n⚡ 𝐁𝐎-𝐀𝐈'
                }, { quoted: msg });

                enviados++;
            } catch (e) {
                console.error('[GAY] error:', e.message);
            }
        }

        if (!enviados) {
            return await responder.texto(
                '╭━━〔 ❌ 𝐆𝐀𝐘 〕━━⬣\n' +
                '┃\n' +
                '┃ Error obteniendo videos.\n' +
                '┃ Intenta de nuevo en unos segundos.\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }
    }
};