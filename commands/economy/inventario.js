// commands/economy/inventario.js
import {
    obtenerInventario
} from '../../database/economia.js';

// Mismo catálogo que shop.js (nombre + emoji por id), para
// mostrar el inventario bonito en vez de ids sueltos.
const CATALOGO = {

    boost: '⚡ BOOST',
    ticket: '🎟️ TICKET',
    chest: '🎁 CHEST'

};

export default {
    nombre: 'inventario',

    categoria: 'economia',

    alias: [
        'inv',
        'items'
    ],

    descripcion:
        'Muestra los items que has comprado en .shop.',

    ejecutar: async ({
        msg,
        responder
    }) => {

        const id =
            msg.key.participant ||
            msg.key.remoteJid;

        const items =
            obtenerInventario(id);

        if (items.length === 0) {

            await responder.texto(
                '╭━━〔 🎒 𝐈𝐍𝐕𝐄𝐍𝐓𝐀𝐑𝐈𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ No tienes ningún item todavía.\n' +
                '┃\n' +
                '┃ 📌 Cómpralos con *.shop*\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;

        }

        // Agrupar por cantidad
        const conteo = {};

        items.forEach(itemId => {

            conteo[itemId] =
                (conteo[itemId] || 0) + 1;

        });

        let texto =
            '╭〔 🎒 𝐈𝐍𝐕𝐄𝐍𝐓𝐀𝐑𝐈𝐎 〕⬣\n' +
            '┃\n';

        Object.entries(conteo).forEach(
            ([itemId, cantidad]) => {

                const nombre =
                    CATALOGO[itemId] ||
                    itemId;

                texto +=
                    `┃ ${nombre} › *x${cantidad}*\n`;

            }
        );

        texto +=
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━⬣';

        await responder.texto(
            texto
        );
    }
};
