import {
    obtenerUsuario,
    guardarUsuario
} from '../database/economia.js';

const COOLDOWN = 60 * 1000;

const TRABAJOS = [
    {
        texto: '🔨 Trabajaste ayudando en una construcción.',
        minimo: 100,
        maximo: 300
    },
    {
        texto: '🚚 Hiciste un viaje en camión.',
        minimo: 150,
        maximo: 400
    },
    {
        texto: '💻 Hiciste un pequeño trabajo en línea.',
        minimo: 120,
        maximo: 350
    },
    {
        texto: '🌾 Trabajaste en el campo.',
        minimo: 80,
        maximo: 280
    },
    {
        texto: '🛠️ Reparaste un vehículo.',
        minimo: 180,
        maximo: 450
    }
];

function numeroAleatorio(minimo, maximo) {
    return Math.floor(
        Math.random() * (maximo - minimo + 1)
    ) + minimo;
}

/*
 * ============================================================
 * OBTENER ID REAL DEL USUARIO
 * ============================================================
 *
 * En grupos NO debemos usar:
 *
 * msg.key.remoteJid
 *
 * porque eso es el ID del GRUPO.
 *
 * Para grupos usamos:
 *
 * msg.key.participant
 *
 * Así cada usuario tiene su propio dinero.
 */
function obtenerIdUsuario(msg) {

    const remoteJid =
        msg.key?.remoteJid || '';

    const esGrupo =
        remoteJid.endsWith('@g.us');

    if (esGrupo) {

        return (
            msg.key?.participant ||
            msg.participant ||
            null
        );
    }

    return remoteJid || null;
}

export default {

    nombre: 'w',

    categoria: 'economia',

    alias: [
        'work',
        'trabajar'
    ],

    descripcion:
        'Trabaja para ganar dinero.',

    ejecutar: async ({
        msg,
        responder
    }) => {

        try {

            // ====================================================
            // OBTENER USUARIO
            // ====================================================

            const id =
                obtenerIdUsuario(msg);

            if (!id) {

                await responder.texto(
                    `❌ *TRABAJO*\n\n` +
                    `No pude identificar al usuario.`
                );

                return;
            }

            console.log(
                `[COMANDO w] Usuario: ${id}`
            );

            // ====================================================
            // OBTENER CUENTA PERSONAL
            // ====================================================

            const usuario =
                obtenerUsuario(id);

            // ====================================================
            // COOLDOWN PERSONAL
            // ====================================================

            const ahora =
                Date.now();

            const diferencia =
                ahora -
                (usuario.ultimoTrabajo || 0);

            if (
                diferencia <
                COOLDOWN
            ) {

                const restante =
                    Math.ceil(
                        (COOLDOWN - diferencia) /
                        1000
                    );

                await responder.texto(
                    `⏳ *TRABAJO*\n\n` +
                    `Ya trabajaste recientemente.\n\n` +
                    `🕐 Espera *${restante} segundos* para volver a trabajar.`
                );

                return;
            }

            // ====================================================
            // ELEGIR TRABAJO
            // ====================================================

            const trabajo =
                TRABAJOS[
                    Math.floor(
                        Math.random() *
                        TRABAJOS.length
                    )
                ];

            // ====================================================
            // CALCULAR GANANCIA
            // ====================================================

            const ganado =
                numeroAleatorio(
                    trabajo.minimo,
                    trabajo.maximo
                );

            // ====================================================
            // ACTUALIZAR SALDO
            // ====================================================

            usuario.dinero =
                Number(usuario.dinero || 0) +
                ganado;

            usuario.ultimoTrabajo =
                ahora;

            // ====================================================
            // GUARDAR CUENTA DEL USUARIO
            // ====================================================

            guardarUsuario(
                id,
                usuario
            );

            console.log(
                `[COMANDO w] ✓ ${id} ganó ${ganado}. Saldo: ${usuario.dinero}`
            );

            // ====================================================
            // RESPUESTA
            // ====================================================

            await responder.texto(

                `╭〔 💼 𝐓𝐑𝐀𝐁𝐀𝐉𝐎 〕⬣\n` +
                `┃\n` +
                `┃ ${trabajo.texto}\n` +
                `┃\n` +
                `┃ 💰 Ganaste › *$${ganado.toLocaleString()}*\n` +
                `┃ 💵 Saldo › *$${usuario.dinero.toLocaleString()}*\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━⬣`

            );

        } catch (error) {

            console.error(
                '[COMANDO w] Error:',
                error
            );

            try {

                await responder.texto(

                    `❌ *TRABAJO*\n\n` +
                    `No se pudo completar el trabajo.\n\n` +
                    `⚠️ ${error.message}`

                );

            } catch {}
        }
    }
};
