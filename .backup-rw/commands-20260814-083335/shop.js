import {
    obtenerUsuario,
    modificarDinero
} from '../database/economia.js';

const ITEMS = [
    {
        id: 'boost',
        nombre: '⚡ BOOST',
        precio: 5000,
        descripcion: 'Objeto especial para futuras funciones.'
    },
    {
        id: 'ticket',
        nombre: '🎟️ TICKET',
        precio: 10000,
        descripcion: 'Ticket especial para futuras funciones.'
    },
    {
        id: 'chest',
        nombre: '🎁 CHEST',
        precio: 15000,
        descripcion: 'Cofre especial para futuras recompensas.'
    }
];

export default {
    nombre: 'shop',

    categoria: 'economia',

    alias: [
        'tienda',
        'store'
    ],

    descripcion:
        'Muestra la tienda. Uso: .shop o .shop comprar id',

    ejecutar: async ({
        msg,
        responder,
        argumento
    }) => {

        const id =
            msg.key.remoteJid;

        const usuario =
            obtenerUsuario(id);

        const partes =
            argumento
                .trim()
                .split(/\s+/)
                .filter(Boolean);

        // ----------------------------------------------------
        // MOSTRAR TIENDA
        // ----------------------------------------------------

        if (
            partes.length === 0
        ) {

            let texto =
                `╭〔 🛒 𝐁𝐎𝐓-𝐀𝐏𝐈 𝐒𝐇𝐎𝐏 〕⬣\n` +
                `┃\n`;

            ITEMS.forEach(
                (item, indice) => {

                    texto +=
                        `┃ ${indice + 1}. ${item.nombre}\n` +
                        `┃    🆔 ${item.id}\n` +
                        `┃    💰 $${item.precio.toLocaleString()}\n` +
                        `┃    ℹ️ ${item.descripcion}\n` +
                        `┃\n`;
                }
            );

            texto +=
                `╰━━━━━━━━━━━━━━━━⬣\n\n` +
                `💡 Comprar:\n` +
                `*.shop comprar boost*\n\n` +
                `💰 Tu saldo: *$${Number(usuario.dinero || 0).toLocaleString()}*\n\n` +
                `╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`;

            await responder.texto(
                texto
            );

            return;
        }

        // ----------------------------------------------------
        // COMPRAR
        // ----------------------------------------------------

        if (
            partes[0].toLowerCase() !== 'comprar'
        ) {

            await responder.texto(
                `❌ Uso incorrecto.\n\n` +
                `Usa *.shop* para ver la tienda.\n` +
                `Ejemplo: *.shop comprar boost*`
            );

            return;
        }

        const itemId =
            partes[1]?.toLowerCase();

        const item =
            ITEMS.find(
                producto =>
                    producto.id === itemId
            );

        if (!item) {

            await responder.texto(
                `❌ Ese artículo no existe.\n\n` +
                `Usa *.shop* para ver los artículos disponibles.`
            );

            return;
        }

        const saldo =
            Number(
                usuario.dinero || 0
            );

        if (
            saldo < item.precio
        ) {

            await responder.texto(
                `❌ *SALDO INSUFICIENTE*\n\n` +
                `🛒 Artículo: ${item.nombre}\n` +
                `💰 Precio: *$${item.precio.toLocaleString()}*\n` +
                `💵 Tu saldo: *$${saldo.toLocaleString()}*`
            );

            return;
        }

        // ----------------------------------------------------
        // COBRAR
        // ----------------------------------------------------

        modificarDinero(
            id,
            -item.precio
        );

        await responder.texto(
            `╭〔 ✅ 𝐂𝐎𝐌𝐏𝐑𝐀 𝐑𝐄𝐀𝐋𝐈𝐙𝐀𝐃𝐀 〕⬣\n` +
            `┃\n` +
            `┃ 🛒 Artículo › *${item.nombre}*\n` +
            `┃ 💰 Precio › *$${item.precio.toLocaleString()}*\n` +
            `┃\n` +
            `┃ ⚡ Compra registrada.\n` +
            `┃\n` +
            `╰━━━━━━━━━━━━━━━━⬣\n\n` +
            `╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`
        );
    }
};
