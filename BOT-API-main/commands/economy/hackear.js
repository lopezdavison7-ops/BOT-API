

import {
    obtenerUsuario,
    guardarUsuario,
    modificarDinero
} from '../../database/economia.js';

const COOLDOWN_HACKEO = 15 * 60 * 1000;
const PROBABILIDAD_EXITO = 0.35;
const MIN_PORCENTAJE_ROBO = 0.10;
const MAX_PORCENTAJE_ROBO = 0.25;
const MULTA_PORCENTAJE = 0.15;

const EXITOS = [
    '💻 Entraste a su cuenta usando SQL injection',
    '🔓 Descifraste su contraseña: "123456"',
    '🎭 Suplantaste su identidad con phishing',
    '🦠 Instalaste un keylogger en su dispositivo',
    '📡 Interceptaste su conexión WiFi pública',
    '🔑 Encontraste su contraseña en un archivo .txt',
    '🤖 Usaste IA para romper su autenticación 2FA',
    '📱 Clonaste su SIM y accediste a su banco',
    '🌐 Explotaste una vulnerabilidad de día cero',
    '🎯 Adivinaste su PIN en 3 intentos'
];

const FALLOS = [
    '🚨 El banco detectó actividad sospechosa',
    '🔐 Su contraseña era demasiado fuerte',
    '👮 La policía cibernética te rastreó',
    '🛡️ Tenía autenticación de 2 factores',
    '💀 Su antivirus bloqueó tu malware',
    '📵 Te quedaste sin internet a mitad del hack',
    '🤦 Usaste "admin" como usuario y falló',
    '🔥 Tu laptop se sobrecalentó y se apagó',
    '😴 Te quedaste dormido hackeando',
    '🐌 Tu internet era demasiado lento'
];

function fmtTiempo(ms) {
    const minutos = Math.ceil(ms / 60000);
    if (minutos >= 60) {
        const horas = Math.floor(minutos / 60);
        const mins = minutos % 60;
        return `${horas}h ${mins}m`;
    }
    return `${minutos}m`;
}

export default {
    nombre: 'hackear',
    categoria: 'economy',
    alias: ['hack', 'hackeo', 'ciberataque', 'phishing'],
    descripcion: 'Intenta hackear el banco de otro usuario',
    uso: '.hackear @user',
    ejecutar: async ({ sock, msg, argumento, responder }) => {
        const chatJid = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;

        let target = null;
        const quotedMention = msg.message?.extendedTextMessage?.contextInfo?.participant;
        const textMentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;

        if (quotedMention) {
            target = quotedMention;
        } else if (textMentions && textMentions.length > 0) {
            target = textMentions[0];
        } else if (argumento) {
            const numMatch = argumento.match(/\d+/);
            if (numMatch) {
                target = numMatch[0] + '@s.whatsapp.net';
            }
        }

        if (!target) {
            return await responder.texto(
                '╭━━〔 💻 𝐇𝐀𝐂𝐊𝐄𝐀𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Debes mencionar a alguien\n' +
                '┃\n' +
                '┃ 📋 Uso:\n' +
                '┃ • .hackear @usuario\n' +
                '┃ • .hack @amigo\n' +
                '┃\n' +
                '┃ 💡 Solo puedes hackear el\n' +
                '┃    BANCO de otros usuarios\n' +
                '┃\n' +
                '┃ ⚠️ Si fallas, te multan\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        if (target === sender) {
            return await responder.texto(
                '╭━━〔 💻 𝐇𝐀𝐂𝐊𝐄𝐀𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ No puedes hackearte\n' +
                '┃    a ti mismo 😅\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        const hacker = obtenerUsuario(sender);
        const victima = obtenerUsuario(target);

        const ahora = Date.now();
        const ultimoHackeo = hacker.ultimoHackeo || 0;
        const tiempoTranscurrido = ahora - ultimoHackeo;

        if (tiempoTranscurrido < COOLDOWN_HACKEO) {
            const restante = COOLDOWN_HACKEO - tiempoTranscurrido;
            return await responder.texto(
                '╭━━〔 ⏳ 𝐇𝐀𝐂𝐊𝐄𝐀𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Cooldown activo\n' +
                '┃\n' +
                '┃ ⏱️ Puedes hackear de nuevo en:\n' +
                '┃    *' + fmtTiempo(restante) + '*\n' +
                '┃\n' +
                '┃ 💡 Cooldown: 15 minutos\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        const bancoVictima = victima.banco || 0;

        if (bancoVictima < 500) {
            return await responder.texto(
                '╭━━〔 💻 𝐇𝐀𝐂𝐊𝐄𝐀𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Esta cuenta no vale la pena\n' +
                '┃\n' +
                '┃ 🏦 Banco de @' + target.split('@')[0] + ':\n' +
                '┃    ₡' + bancoVictima.toLocaleString() + '\n' +
                '┃\n' +
                '┃ 📌 Mínimo para hackear: ₡500\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣',
                { mentions: [target] }
            );
        }

        hacker.ultimoHackeo = ahora;

        const exito = Math.random() < PROBABILIDAD_EXITO;
        const escenario = exito
            ? EXITOS[Math.floor(Math.random() * EXITOS.length)]
            : FALLOS[Math.floor(Math.random() * FALLOS.length)];

        if (exito) {

            const porcentaje = MIN_PORCENTAJE_ROBO + Math.random() * (MAX_PORCENTAJE_ROBO - MIN_PORCENTAJE_ROBO);
            const montoRobado = Math.floor(bancoVictima * porcentaje);

            victima.banco -= montoRobado;
            hacker.dinero += montoRobado;

            guardarUsuario(sender, hacker);
            guardarUsuario(target, victima);

            const texto =
                '╭━━〔 💻 𝐇𝐀𝐂𝐊𝐄𝐎 𝐄𝐗𝐈𝐓𝐎𝐒𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ 🎉 *¡Hackeo exitoso!*\n' +
                '┃\n' +
                '┃ 👤 *Hacker:* @' + sender.split('@')[0] + '\n' +
                '┃ 👥 *Víctima:* @' + target.split('@')[0] + '\n' +
                '┃\n' +
                '┣━━━━━━━━━━━━━━━━\n' +
                '┃\n' +
                '┃ 💻 *Método:*\n' +
                '┃ ' + escenario + '\n' +
                '┃\n' +
                '┣━━━━━━━━━━━━━━━━\n' +
                '┃\n' +
                '┃ 💰 *Robaste del banco:*\n' +
                '┃    ₡' + montoRobado.toLocaleString() + '\n' +
                '┃\n' +
                '┃ 🏦 *Banco de la víctima:*\n' +
                '┃    Antes: ₡' + (bancoVictima).toLocaleString() + '\n' +
                '┃    Ahora: ₡' + victima.banco.toLocaleString() + '\n' +
                '┃\n' +
                '┃ 💵 *Tu dinero (mano):*\n' +
                '┃    Ahora: ₡' + hacker.dinero.toLocaleString() + '\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            await sock.sendMessage(
                chatJid,
                { text: texto, mentions: [sender, target] },
                { quoted: msg }
            );

        } else {

            const dineroHacker = hacker.dinero || 0;
            const multa = Math.floor(dineroHacker * MULTA_PORCENTAJE);

            hacker.dinero = Math.max(0, hacker.dinero - multa);

            guardarUsuario(sender, hacker);

            const texto =
                '╭━━〔 🚨 𝐇𝐀𝐂𝐊𝐄𝐎 𝐅𝐀𝐋𝐋𝐈𝐃𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ 💀 *¡Hackeo fallido!*\n' +
                '┃\n' +
                '┃ 👤 *Hacker:* @' + sender.split('@')[0] + '\n' +
                '┃ 👥 *Objetivo:* @' + target.split('@')[0] + '\n' +
                '┃\n' +
                '┣━━━━━━━━━━━━━━━━\n' +
                '┃\n' +
                '┃ ❌ *Qué salió mal:*\n' +
                '┃ ' + escenario + '\n' +
                '┃\n' +
                '┣━━━━━━━━━━━━━━━━\n' +
                '┃\n' +
                '┃ 💸 *Multa por intento fallido:*\n' +
                '┃    -₡' + multa.toLocaleString() + '\n' +
                '┃\n' +
                '┃ 💵 *Tu dinero (mano):*\n' +
                '┃    Ahora: ₡' + hacker.dinero.toLocaleString() + '\n' +
                '┃\n' +
                '┃ ⏳ *Cooldown:* 15 minutos\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            await sock.sendMessage(
                chatJid,
                { text: texto, mentions: [sender, target] },
                { quoted: msg }
            );
        }
    }
};