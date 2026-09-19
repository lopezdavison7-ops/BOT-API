// commands/economy/coinflip.js
// ============================================================
// BOT-API — COINFLIP (Cara o Cruz)
// ============================================================
// .cf <cantidad> <cara|cruz> → apuesta dinero al lanzamiento
// ============================================================

import { obtenerUsuario, modificarDinero, guardarUsuario } from '../../database/economia.js';

export default {
    nombre: 'coinflip',
    categoria: 'economy',
    alias: ['cf', 'flip', 'cara', 'cruz'],
    descripcion: 'Apuesta dinero al lanzamiento de moneda (cara o cruz)',
    uso: '.cf <cantidad> <cara|cruz>',
    ejecutar: async ({ sock, msg, args, argumento, responder }) => {
        const chatJid = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;

        // Parsear argumentos
        const cantidad = parseInt(args[0]);
        const eleccion = args[1]?.toLowerCase();

        // Validar cantidad
        if (isNaN(cantidad) || cantidad <= 0) {
            return await responder.texto(
                '╭━━〔 🪙 𝐂𝐎𝐈𝐍𝐅𝐋𝐈𝐏 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Cantidad inválida\n' +
                '┃\n' +
                '┃ 📋 Uso:\n' +
                '┃ • .cf 1000 cara\n' +
                '┃ • .flip 500 cruz\n' +
                '┃\n' +
                '┃ 💡 Mínimo: ₡200\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        // Validar elección
        if (!eleccion || !['cara', 'cruz'].includes(eleccion)) {
            return await responder.texto(
                '╭━━〔 🪙 𝐂𝐎𝐈𝐍𝐅𝐋𝐈𝐏 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Elección inválida\n' +
                '┃\n' +
                '┃ 📋 Debes elegir:\n' +
                '┃ • *cara* o *cruz*\n' +
                '┃\n' +
                '┃ 💡 Ejemplo:\n' +
                '┃ .cf 1000 cara\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        // Validar mínimo
        if (cantidad < 200) {
            return await responder.texto(
                '╭━━〔 🪙 𝐂𝐎𝐈𝐍𝐅𝐋𝐈𝐏 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Cantidad muy baja\n' +
                '┃\n' +
                '┃ 📌 Mínimo: ₡200\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        // Obtener usuario y validar saldo
        const usuario = obtenerUsuario(sender);
        const saldo = usuario.dinero || 0;

        if (saldo < cantidad) {
            return await responder.texto(
                '╭━━〔 🪙 𝐂𝐎𝐈𝐍𝐅𝐋𝐈𝐏 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Saldo insuficiente\n' +
                '┃\n' +
                '┃ 💰 Tu saldo: ₡' + saldo.toLocaleString() + '\n' +
                '┃ 💵 Apuestas: ₡' + cantidad.toLocaleString() + '\n' +
                '┃\n' +
                '┃ 💡 Usa .daily o .monthly\n' +
                '┃    para ganar más dinero\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        // Lanzar moneda
        const resultado = Math.random() < 0.5 ? 'cara' : 'cruz';
        const gano = resultado === eleccion;
        const emoji = gano ? '🎉' : '💔';
        const titulo = gano ? '𝐆𝐀𝐍𝐀𝐒𝐓𝐄' : '𝐏𝐄𝐑𝐃𝐈𝐒𝐓𝐄';

        // Aplicar cambios
        if (gano) {
            usuario.dinero += cantidad;
        } else {
            usuario.dinero -= cantidad;
        }
        guardarUsuario(sender, usuario);

        const nuevoSaldo = usuario.dinero;
        const cantidadFmt = cantidad.toLocaleString();

        const texto =
            '╭━━〔 🪙 𝐂𝐎𝐈𝐍𝐅𝐋𝐈𝐏 〕━━⬣\n' +
            '┃\n' +
            '┃ ' + emoji + ' *' + titulo + '*\n' +
            '┃\n' +
            '┃ 🎯 Tu elección: *' + eleccion.toUpperCase() + '*\n' +
            '┃ 🪙 Resultado: *' + resultado.toUpperCase() + '*\n' +
            '┃\n' +
            '┣━━━━━━━━━━━━━━━━\n' +
            '┃\n' +
            (gano
                ? '┃ 💰 Ganaste: +₡' + cantidadFmt + '\n'
                : '┃ 💸 Perdiste: -₡' + cantidadFmt + '\n') +
            '┃\n' +
            '┣━━━━━━━━━━━━━━━━\n' +
            '┃\n' +
            '┃ 💵 Saldo anterior: ₡' + saldo.toLocaleString() + '\n' +
            '┃ 💰 Saldo actual: ₡' + nuevoSaldo.toLocaleString() + '\n' +
            '┃\n' +
            '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

        await responder.texto(texto);
    }
};