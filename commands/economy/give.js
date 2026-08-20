// commands/economy/give.js
import {
    obtenerUsuario,
    modificarDinero
} from '../../database/economia.js';

export default {
    nombre: 'give',

    categoria: 'economia',

    alias: [
        'dar',
        'transferir'
    ],

    descripcion:
        'Transfiere dinero a otro usuario. Uso: .give @usuario cantidad',

    ejecutar: async ({
        msg,
        responder,
        argumento
    }) => {

        const mencionados =
            msg.message?.extendedTextMessage
                ?.contextInfo
                ?.mentionedJid || [];

        if (
            mencionados.length === 0
        ) {

            await responder.texto(
                `❌ *FALTA EL USUARIO*\n\n` +
                `Menciona a la persona que recibirá el dinero.\n\n` +
                `Ejemplo:\n` +
                `*.give @usuario 5000*`
            );

            return;
        }

        const cantidadTexto =
            argumento
                .trim()
                .split(/\s+/)
                .pop();

        const cantidad =
            Number(
                cantidadTexto
            );

        if (
            !Number.isInteger(cantidad) ||
            cantidad <= 0
        ) {

            await responder.texto(
                `❌ *CANTIDAD INVÁLIDA*\n\n` +
                `La cantidad debe ser un número entero positivo.\n\n` +
                `Ejemplo: *.give @usuario 5000*`
            );

            return;
        }

        const emisor =
            msg.key.remoteJid;

        const receptor =
            mencionados[0];

        if (
            receptor === emisor
        ) {

            await responder.texto(
                `❌ No puedes enviarte dinero a ti mismo.`
            );

            return;
        }

        const usuario =
            obtenerUsuario(emisor);

        const saldo =
            Number(
                usuario.dinero || 0
            );

        if (
            saldo < cantidad
        ) {

            await responder.texto(
                `❌ *SALDO INSUFICIENTE*\n\n` +
                `💰 Tu saldo: *$${saldo.toLocaleString()}*\n` +
                `💸 Intentaste enviar: *$${cantidad.toLocaleString()}*`
            );

            return;
        }

        // ----------------------------------------------------
        // TRANSFERENCIA
        // ----------------------------------------------------

        modificarDinero(
            emisor,
            -cantidad
        );

        modificarDinero(
            receptor,
            cantidad
        );

        await responder.texto(
            `╭〔 💸 𝐓𝐑𝐀𝐍𝐒𝐅𝐄𝐑𝐄𝐍𝐂𝐈𝐀 〕⬣\n` +
            `┃\n` +
            `┃ 💰 Cantidad › *$${cantidad.toLocaleString()}*\n` +
            `┃\n` +
            `┃ ✅ Transferencia realizada.\n` +
            `┃\n` +
            `╰━━━━━━━━━━━━━━━━⬣\n\n` +
            `╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`
        );
    }
};