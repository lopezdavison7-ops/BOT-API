// commands/economy/top.js
import {
    obtenerTodos
} from '../../database/economia.js';

function normalizarJID(id) {

    if (!id) return null;

    if (id.endsWith('@s.whatsapp.net')) {
        return id;
    }

    if (id.endsWith('@lid')) {
        return id;
    }

    if (/^\d+$/.test(id)) {
        return `${id}@s.whatsapp.net`;
    }

    if (id.endsWith('@g.us')) {
        return null;
    }

    return null;
}

function formatearDinero(cantidad) {

    if (cantidad >= 1000000) {
        return `${(cantidad / 1000000).toFixed(1)}M`;
    }

    if (cantidad >= 1000) {
        return `${(cantidad / 1000).toFixed(1)}K`;
    }

    return cantidad.toLocaleString();
}

export default {

    nombre: 'top',

    categoria: 'economia',

    alias: [
        'ranking',
        'rich',
        'ricos'
    ],

    descripcion:
        'Muestra el ranking de usuarios con más dinero.',

    ejecutar: async ({
        sock,
        msg,
        responder
    }) => {

        try {

            const datos =
                obtenerTodos();

            const usuarios =
                Object.entries(datos)

                    .map(([id, usuario]) => {

                        const jid =
                            normalizarJID(id);

                        return {
                            id,
                            jid,

                            dinero:
                                Number(
                                    usuario?.dinero || 0
                                ),

                            personajes:
                                Array.isArray(
                                    usuario?.personajes
                                )
                                    ? usuario.personajes.length
                                    : 0
                        };
                    })

                    .filter(
                        usuario =>
                            usuario.jid &&
                            usuario.dinero > 0
                    )

                    .sort(
                        (a, b) =>
                            b.dinero - a.dinero
                    )

                    .slice(0, 10);

            if (usuarios.length === 0) {

                await responder.texto(

                    `╭━━〔 💎 𝐓𝐎𝐏 𝐃𝐈𝐍𝐄𝐑𝐎 💎 〕━━⬣\n` +
                    `┃\n` +
                    `┃ 🏆 𝐑𝐀𝐍𝐊𝐈𝐍𝐆 𝐃𝐄 𝐃Ó𝐋𝐀𝐑𝐄𝐒\n` +
                    `┃ 👑 𝐀𝐮́𝐧 𝐧𝐨 𝐡𝐚𝐲 𝐮𝐬𝐮𝐚𝐫𝐢𝐨𝐬\n` +
                    `┃ 💵 𝐜𝐨𝐧 𝐝𝐢𝐧𝐞𝐫𝐨\n` +
                    `┃\n` +
                    `╰━━━━━━━━━━━━━━━━⬣\n\n` +
                    `╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣`

                );

                return;
            }

            const menciones = [];

            let texto =

                `╭━━〔 💎 𝐓𝐎𝐏 𝐃𝐈𝐍𝐄𝐑𝐎 💎 〕━━⬣\n` +
                `┃ 🏆 𝐑𝐀𝐍𝐊𝐈𝐍𝐆 𝐃𝐄 𝐃Ó𝐋𝐀𝐑𝐄𝐒\n` +
                `┃ 👑 𝐋𝐨𝐬 𝐦𝐚́𝐬 𝐫𝐢𝐜𝐨𝐬 𝐝𝐞𝐥 𝐠𝐫𝐮𝐩𝐨\n` +
                `┃ 📄 𝐏𝐠: 1/1\n` +
                `╰━━━━━━━━━━━━━━━━⬣\n\n`;

            usuarios.forEach(
                (usuario, indice) => {

                    const medallas = [
                        '🥇',
                        '🥈',
                        '🥉'
                    ];

                    const puesto =
                        medallas[indice] ||
                        `🏅 ${indice + 1}`;

                    const numero =
                        usuario.jid
                            .split('@')[0];

                    const mencion =
                        `@${numero}`;

                    menciones.push(
                        usuario.jid
                    );

                    texto +=

                        `┃ ${puesto} ${mencion}\n` +
                        `┃ 💵 $${formatearDinero(usuario.dinero)} dólares\n`;

                    if (
                        indice <
                        usuarios.length - 1
                    ) {
                        texto += `┃\n`;
                    }
                }
            );

            texto +=

                `\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣`;

            await sock.sendMessage(

                msg.key.remoteJid,

                {
                    text: texto,
                    mentions: menciones
                },

                {
                    quoted: msg
                }
            );

        } catch (error) {

            console.error(
                '[COMANDO top] Error:',
                error
            );

            await responder.texto(

                `❌ *TOP*\n\n` +
                `No se pudo mostrar el ranking.`

            );
        }
    }
};