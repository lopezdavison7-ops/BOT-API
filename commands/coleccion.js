import {
    obtenerUsuario
} from '../database/economia.js';

export default {
    nombre: 'coleccion',

    categoria: 'economia',

    alias: [
        'collection',
        'cartas',
        'cards'
    ],

    descripcion:
        'Muestra las cartas de tu colección.',

    ejecutar: async ({
        msg,
        responder
    }) => {

        const id =
            msg.key.participant ||
            msg.key.remoteJid;

        const usuario =
            obtenerUsuario(id);

        const personajes =
            Array.isArray(usuario.personajes)
                ? usuario.personajes
                : [];

        if (personajes.length === 0) {

            await responder.texto(
                `╭〔 🎴 𝐂𝐎𝐋𝐄𝐂𝐂𝐈Ó𝐍 〕⬣\n` +
                `┃\n` +
                `┃ 📦 Tu colección está vacía.\n` +
                `┃\n` +
                `┃ Usa *.rw* para conseguir\n` +
                `┃ tu primera carta.\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━⬣\n\n` +
                `╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`
            );

            return;
        }

        let texto =
            `╭〔 🎴 𝐌𝐈 𝐂𝐎𝐋𝐄𝐂𝐂𝐈Ó𝐍 〕⬣\n` +
            `┃\n`;

        personajes.forEach(
            (carta, indice) => {

                texto +=
                    `┃ ${indice + 1}. 👤 *${carta.nombre || 'Sin nombre'}*\n` +
                    `┃    📖 ${carta.serie || 'Sin serie'}\n` +
                    `┃    💴 ¥${Number(carta.valor || 0).toLocaleString()}\n` +
                    `┃\n`;
            }
        );

        texto +=
            `╰━━━━━━━━━━━━━━━━⬣\n\n` +
            `🎴 Total: *${personajes.length}* carta(s)\n\n` +
            `╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`;

        await responder.texto(texto);
    }
};
