// commands/group/detect.js — 🔞 Activa detector NSFW (solo admins)
import { getEstado, setEstado } from '../../lib/nsfwDetect.js';

function bold(t) {
    return String(t).replace(/[A-Za-z]/g, c =>
        String.fromCodePoint((c <= 'Z' ? 0x1D400 - 65 : 0x1D41A - 97) + c.charCodeAt(0))
    );
}

export default {
    nombre: 'detect',
    categoria: 'group',
    alias: ['detectnsfw', 'nsfwdetect', 'antinsfw'],
    descripcion: 'Activa/desactiva el detector NSFW de imágenes del grupo',
    uso: '.detect on | .detect on strict | .detect off | .detect status',
    ejecutar: async ({ sock, msg, argumento, responder }) => {
        const chatId = msg.key.remoteJid;

        if (!chatId.endsWith('@g.us')) {
            return await responder.texto('❌ Este comando solo funciona en grupos.');
        }

        // ---------- SOLO ADMINS ----------
        const sender = msg.key.participant || msg.key.remoteJid;
        try {
            const meta = await sock.groupMetadata(chatId);
            const yo = meta.participants.find(p => p.id === sender);
            if (!yo?.admin) {
                return await responder.texto('❌ Solo los *admins* pueden configurar el detector.');
            }
        } catch (e) {
            return await responder.texto('❌ No pude verificar los admins del grupo.');
        }

        const args = (argumento || '').toLowerCase().trim().split(/\s+/).filter(Boolean);
        const accion = args[0] || 'status';

        // ---------- ON ----------
        if (accion === 'on' || accion === 'activar') {
            const strict = args.includes('strict') || args.includes('estricto');
            setEstado(chatId, true, strict);
            return await responder.texto(
                '╭━━〔  𝐃𝐄𝐓𝐄𝐂𝐓𝐎𝐑 𝐍𝐒𝐅𝐖 〕━━⬣\n' +
                '┃\n' +
                '┃ ✅ Detector *ACTIVADO* en este grupo\n' +
                '┃ ' + (strict ? '🗑️ Modo: *ESTRICTO* (borra NSFW automático)' : '️ Modo: *REPORTAR* (solo avisa)') + '\n' +
                '┃\n' +
                '┃ 📸 Cada imagen enviada será analizada\n' +
                '┃ 🤖 Modelo: V2 (rápido, gratis)\n' +
                '┃\n' +
                '┃ 💡 Cambia el modo con:\n' +
                '┃ ➪ .detect on strict\n' +
                '┃ ➪ .detect off\n' +
                '┃\n' +
                '╰━━〔  𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        // ---------- OFF ----------
        if (accion === 'off' || accion === 'desactivar') {
            setEstado(chatId, false, false);
            return await responder.texto(
                '╭━━〔  𝐃𝐓𝐂𝐎 𝐍𝐅 〕━━\n' +
                '┃\n' +
                '┃ ❌ Detector *DESACTIVADO* en este grupo\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐏 ⚡ 〕━━⬣'
            );
        }

        // ---------- STATUS ----------
        const estado = getEstado(chatId);
        return await responder.texto(
            '╭━━〔 🔞 𝐃𝐄𝐓𝐄𝐂𝐓𝐎𝐑 𝐍𝐒𝐅𝐖 〕━━⬣\n' +
            '┃\n' +
            '┃ ' + (estado.on ? '✅ Estado: *ACTIVADO*' : '❌ Estado: *DESACTIVADO*') + '\n' +
            '┃ ' + (estado.on ? (estado.strict ? '🗑️ Modo: *ESTRICTO*' : '👁️ Modo: *REPORTAR*') : '🗑️ Modo: -') + '\n' +
            '┃\n' +
            '┃ 📋 Comandos:\n' +
            '┃ ➪ .detect on (reporta NSFW)\n' +
            '┃ ➪ .detect on strict (reporta y borra)\n' +
            '┃ ➪ .detect off (apaga)\n' +
            '┃\n' +
            '╰━━〔 ⚡ 𝐁𝐎-𝐀𝐏𝐈 ⚡ 〕━━⬣'
        );
    }
};