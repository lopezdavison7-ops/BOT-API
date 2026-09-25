

import { obtenerUsuario, guardarUsuario } from '../../database/economia.js';

export default {
    nombre: 'dar',
    categoria: 'economy',
    alias: ['regalar', 'transfer', 'transferir', 'pay', 'enviar'],
    descripcion: 'Regala dinero de tu saldo a otro usuario',
    uso: '.dar @user <cantidad>',
    ejecutar: async ({ sock, msg, args, argumento, responder }) => {
        const chatJid = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;

        let target = null;
        const quotedMention = msg.message?.extendedTextMessage?.contextInfo?.participant;
        const textMentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;

        if (quotedMention) {
            target = quotedMention;
        } else if (textMentions && textMentions.length > 0) {
            target = textMentions[0];
        } else if (args && args.length > 0) {

            const numMatch = argumento.match(/\d+/);
            if (numMatch) {
                target = numMatch[0] + '@s.whatsapp.net';
            }
        }

        if (!target) {
            return await responder.texto(
                '╭━━〔 💸 𝐃𝐀𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Debes mencionar a alguien\n' +
                '┃\n' +
                '┃ 📋 Uso:\n' +
                '┃ • .dar @usuario 1000\n' +
                '┃ • .regalar @amigo 500\n' +
                '┃\n' +
                '┃ 💡 Menciona al usuario o\n' +
                '┃    cita su mensaje\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        if (target === sender) {
            return await responder.texto(
                '╭━━〔 💸 𝐃𝐀𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ No puedes darte dinero\n' +
                '┃    a ti mismo 😅\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        const cantidadMatch = argumento.match(/\d+/g);
        const cantidad = cantidadMatch ? parseInt(cantidadMatch[cantidadMatch.length - 1]) : 0;

        if (isNaN(cantidad) || cantidad <= 0) {
            return await responder.texto(
                '╭━━〔 💸 𝐃𝐀𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Cantidad inválida\n' +
                '┃\n' +
                '┃ 📋 Uso:\n' +
                '┃ • .dar @usuario 1000\n' +
                '┃\n' +
                '┃ 💡 Mínimo: ₡100\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        if (cantidad < 100) {
            return await responder.texto(
                '╭━━〔 💸 𝐃𝐀𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Cantidad muy baja\n' +
                '┃\n' +
                '┃ 📌 Mínimo: ₡100\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        const usuarioOrigen = obtenerUsuario(sender);
        const usuarioDestino = obtenerUsuario(target);

        const saldoOrigen = usuarioOrigen.dinero || 0;

        if (saldoOrigen < cantidad) {
            return await responder.texto(
                '╭━━〔 💸 𝐃𝐀𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Saldo insuficiente\n' +
                '┃\n' +
                '┃ 💰 Tu saldo: ₡' + saldoOrigen.toLocaleString() + '\n' +
                '┃ 💵 Quieres dar: ₡' + cantidad.toLocaleString() + '\n' +
                '┃\n' +
                '┃ 💡 Usa .daily o .monthly\n' +
                '┃    para ganar más dinero\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        const saldoAnteriorOrigen = saldoOrigen;
        const saldoAnteriorDestino = usuarioDestino.dinero || 0;

        usuarioOrigen.dinero -= cantidad;
        usuarioDestino.dinero += cantidad;

        guardarUsuario(sender, usuarioOrigen);
        guardarUsuario(target, usuarioDestino);

        const nuevoSaldoOrigen = usuarioOrigen.dinero;
        const nuevoSaldoDestino = usuarioDestino.dinero;
        const cantidadFmt = cantidad.toLocaleString();

        const texto =
            '╭━━〔 💸 𝐓𝐑𝐀𝐍𝐒𝐅𝐄𝐑𝐄𝐍𝐂𝐈𝐀 〕━━⬣\n' +
            '┃\n' +
            '┃ ✅ *Transferencia exitosa*\n' +
            '┃\n' +
            '┃ 👤 *De:* @' + sender.split('@')[0] + '\n' +
            '┃ 👥 *Para:* @' + target.split('@')[0] + '\n' +
            '┃ 💵 *Cantidad:* ₡' + cantidadFmt + '\n' +
            '┃\n' +
            '┣━━━━━━━━━━━━━━━━\n' +
            '┃\n' +
            '┃ 💰 *Tu saldo:*\n' +
            '┃   Antes: ₡' + saldoAnteriorOrigen.toLocaleString() + '\n' +
            '┃   Ahora: ₡' + nuevoSaldoOrigen.toLocaleString() + '\n' +
            '┃\n' +
            '┣━━━━━━━━━━━━━━━━\n' +
            '┃\n' +
            '┃ 💰 *Saldo del destinatario:*\n' +
            '┃   Antes: ₡' + saldoAnteriorDestino.toLocaleString() + '\n' +
            '┃   Ahora: ₡' + nuevoSaldoDestino.toLocaleString() + '\n' +
            '┃\n' +
            '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

        await sock.sendMessage(
            chatJid,
            { text: texto, mentions: [sender, target] },
            { quoted: msg }
        );
    }
};