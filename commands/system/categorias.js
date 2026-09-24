// commands/system/categorias.js — 🔧 Activar/desactivar categorías POR CHAT
import {
    categoriaActiva,
    setCategoria,
    resetCategoria,
    listarEstados,
    origenEstado
} from '../../lib/categoriaConfig.js';

function bold(t) {
    return String(t).replace(/[A-Za-z]/g, c =>
        String.fromCodePoint((c <= 'Z' ? 0x1D400 - 65 : 0x1D41A - 97) + c.charCodeAt(0))
    );
}

export default {
    nombre: 'desactivar',
    categoria: 'system',
    alias: ['activar', 'cmd', 'categoria'],
    descripcion: 'Activa o desactiva una categoría en este chat (o global si eres owner)',
    uso: '.desactivar nsfw | .activar nsfw | .desactivar nsfw global | .cat',

    ejecutar: async ({ sock, msg, argumento, responder, jid, isGroup, fromMe }) => {
        const nombreCmd = (
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text || ''
        ).trim().split(/\s+/)[0].replace(/^\./, '').toLowerCase();

        const partes = String(argumento || '').toLowerCase().trim().split(/\s+/).filter(Boolean);
        const categoria = partes[0] || '';
        const esGlobal = partes.includes('global') || partes.includes('todo');

        // ---------- LISTAR ----------
        if (!categoria || categoria === 'lista' || categoria === 'all') {
            const estados = listarEstados(jid);

            if (!estados.length) {
                return await responder.texto(
                    '╭━━〔  𝐂𝐀𝐓𝐄𝐆𝐎𝐑Í𝐀𝐒 〕━━⬣\n' +
                    '┃\n' +
                    '┃ ✅ Todas las categorías están\n' +
                    '┃    activadas por defecto aquí.\n' +
                    '┃\n' +
                    '┃ 💡 Uso:\n' +
                    '┃ ➪ .desactivar nsfw\n' +
                    '┃ ➪ .activar nsfw\n' +
                    '┃ ➪ .desactivar nsfw global\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            }

            let texto =
                '╭━━〔  𝐂𝐀𝐓𝐄𝐆𝐎𝐑Í𝐀𝐒 〕━━⬣\n' +
                '┃\n';

            for (const e of estados) {
                texto += '┃ ' + (e.activa ? '🟢' : '🔴') + ' ' + e.categoria.toUpperCase();
                texto += ' — ' + (e.origen === 'chat' ? 'este chat' : e.origen === 'global' ? 'GLOBAL' : 'default') + '\n';
            }

            texto +=
                '┃\n' +
                '┃ 💡 .desactivar <cat> [global]\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            return await responder.texto(texto);
        }

        // ---------- ACTIVAR / DESACTIVAR ----------
        const activar = nombreCmd === 'activar';
        const chatObjetivo = esGlobal ? null : jid;

        setCategoria(chatObjetivo, categoria, activar);

        const alcance = esGlobal ? 'GLOBAL' : (isGroup ? 'ESTE GRUPO' : 'ESTE CHAT');

        await responder.texto(
            '╭━━〔 ' + (activaEmoji(activar)) + ' 𝐂𝐀𝐓𝐄𝐆𝐎𝐑Í𝐀 ' + (activar ? '𝐀𝐂𝐓𝐈𝐕𝐀𝐃𝐀' : '𝐃𝐄𝐒𝐀𝐂𝐓𝐈𝐕𝐀𝐃𝐀') + ' 〕━━⬣\n' +
            '┃\n' +
            '┃ 📂 Categoría: *' + categoria.toUpperCase() + '*\n' +
            '┃\n' +
            '┃ 🌎 Alcance: *' + alcance + '*\n' +
            '┃ ' + (activar ? '🟢' : '🔴') + ' Estado: ' + (activar ? 'ACTIVADA' : 'DESACTIVADA') + '\n' +
            '┃\n' +
            (esGlobal
                ? '┃ Aplica en todos los chats.\n'
                : '┃ Solo aplica en este chat.\n' +
                  '┃ 💡 Para todo el bot:\n' +
                  '┃ ➪ .' + nombreCmd + ' ' + categoria + ' global\n') +
            '┃\n' +
            '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
        );
    }
};

function activaEmoji(activar) {
    return activar ? '🟢' : '🔴';
}