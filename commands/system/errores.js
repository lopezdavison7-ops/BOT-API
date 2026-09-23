// commands/system/errores.js — 📋 Ver últimos errores del bot
import { getLogs, clearLogs, getTotalLogs } from '../../lib/logs.js';

function bold(t) {
    return String(t).replace(/[A-Za-z]/g, c =>
        String.fromCodePoint((c <= 'Z' ? 0x1D400 - 65 : 0x1D41A - 97) + c.charCodeAt(0))
    );
}

export default {
    nombre: 'errores',
    categoria: 'system',
    alias: ['logs', 'error', 'log', 'debuglogs'],
    descripcion: 'Ver últimos errores/logs del bot (solo owner)',
    uso: '.errores [cantidad] | .errores clear | .errores error | .errores warn',
    ejecutar: async ({ sock, msg, argumento, responder, fromMe, isOwner }) => {
        const senderJid = msg.key.participant || msg.key.remoteJid;

        // Filtro de owner
        if (!fromMe && !isOwner) {
            // Intentar verificar si es owner por env
            const senderNum = senderJid.split('@')[0].replace(/\D/g, '');
            const owners = (process.env.OWNER || '').split(',').map(n => n.replace(/\D/g, ''));
            if (!owners.includes(senderNum)) {
                return await responder.texto('❌ Solo el owner puede ver los logs.');
            }
        }

        const args = (argumento || '').toLowerCase().trim().split(/\s+/);
        const accion = args[0];

        // CLEAR
        if (accion === 'clear' || accion === 'limpiar') {
            clearLogs();
            return await responder.texto(
                '╭━━〔 📋 𝐋𝐎𝐆𝐒 𝐋𝐈𝐌𝐏𝐈𝐀𝐃𝐎𝐒 〕━━⬣\n' +
                '┃\n' +
                '┃ ✅ Todos los logs fueron borrados\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        // Parsear cantidad y filtro
        let cantidad = 10;
        let filtro = 'all';

        for (const a of args) {
            if (/^\d+$/.test(a)) cantidad = parseInt(a);
            else if (['error', 'warn', 'log', 'all'].includes(a)) filtro = a;
        }

        cantidad = Math.min(Math.max(cantidad, 1), 50);

        // FILTRO: UNCAUGHT/REJECTION se incluyen en 'error'
        let filtrados = getLogs(cantidad, filtro);
        if (filtro === 'error') {
            filtrados = logs.filter(l => 
                l.tipo === 'ERROR' || l.tipo === 'UNCAUGHT' || l.tipo === 'REJECTION'
            ).slice(-cantidad);
        }

        const stats = getTotalLogs();

        if (filtrados.length === 0) {
            return await responder.texto(
                '╭━━〔 📋 𝐋𝐎𝐆𝐒 〕━━⬣\n' +
                '┃\n' +
                '┃ ✅ No hay logs del tipo *' + filtro + '*\n' +
                '┃\n' +
                '┃ 📊 Estadísticas:\n' +
                '┃ ➪ Total: ' + stats.total + '\n' +
                '┃ ➪ Errores: ' + stats.errores + '\n' +
                '┃ ➪ Warnings: ' + stats.warns + '\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        // Generar texto
        let texto =
            '╭━━〔 📋 𝐋𝐎𝐆𝐒 𝐃𝐄𝐋 𝐁𝐎𝐓 〕━━⬣\n' +
            '┃\n' +
            '┃ 📊 Total: ' + stats.total + ' | Errores: ' + stats.errores + '\n' +
            '┃ 🔍 Filtro: ' + filtro + ' | Últimos: ' + filtrados.length + '\n' +
            '┃\n';

        const iconos = {
            ERROR: '❌',
            UNCAUGHT: '💥',
            REJECTION: '⚠️',
            WARN: '🟡',
            LOG: '📝'
        };

        for (const log of filtrados) {
            const preview = log.mensaje
                .replace(/\n/g, ' ')
                .replace(/[*_~`]/g, '')
                .slice(0, 120);
            texto += '┃ ' + (iconos[log.tipo] || '📌') + ' *' + log.tipo + '* (' + log.fecha + ')\n';
            texto += '┃    ' + preview + (log.mensaje.length > 120 ? '...' : '') + '\n';
            texto += '┃\n';
        }

        texto +=
            '┣━━〔 💡 𝐔𝐒𝐎 〕━━⬣\n' +
            '┃\n' +
            '┃ ➪ .errores (últimos 10)\n' +
            '┃ ➪ .errores 20 (últimos 20)\n' +
            '┃ ➪ .errores error (solo errores)\n' +
            '┃ ➪ .errores warn (solo warnings)\n' +
            '┃ ➪ .errores clear (limpiar todo)\n' +
            '┃\n' +
            '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

        // Si es muy largo, dividir en partes
        if (texto.length > 4000) {
            const partes = texto.match(/[\s\S]{1,4000}/g) || [texto];
            for (let i = 0; i < partes.length; i++) {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: '📋 *Parte ' + (i + 1) + '/' + partes.length + '*\n\n' + partes[i]
                }, { quoted: msg });
            }
        } else {
            await responder.texto(texto);
        }
    }
};