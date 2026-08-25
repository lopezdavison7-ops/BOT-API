// commands/economy/rob.js
// ============================================================
// COMANDO: ROB
// BOT-API
//
// Intenta robarle dinero a otro usuario. Riesgo real: si falla,
// paga una multa. Tiene cooldown propio (COOLDOWN_ROBO) para
// no dejarlo spamear.
// ============================================================

import {
    obtenerUsuario,
    modificarDinero,
    puedeRobar,
    tiempoRestanteRobo,
    registrarRobo
} from '../../database/economia.js';

// Probabilidad de éxito del robo (0.45 = 45%)
const PROBABILIDAD_EXITO = 0.45;

// Porcentaje del dinero de la víctima que se roba si sale bien
const PORCENTAJE_MIN = 0.10;
const PORCENTAJE_MAX = 0.25;

// Tope máximo de dinero robado en un solo golpe
const TOPE_ROBO = 5000;

// La víctima necesita al menos esto para que valga la pena robarle
const MINIMO_VICTIMA = 200;

// Multa fija si el robo sale mal (rango aleatorio)
const MULTA_MIN = 100;
const MULTA_MAX = 300;

function numeroAleatorio(minimo, maximo) {
    return Math.floor(
        Math.random() * (maximo - minimo + 1)
    ) + minimo;
}

function formatearMs(ms) {

    const totalSegundos =
        Math.ceil(ms / 1000);

    const minutos =
        Math.floor(totalSegundos / 60);

    const segundos =
        totalSegundos % 60;

    if (minutos <= 0) {
        return `${segundos}s`;
    }

    return `${minutos}m ${segundos}s`;
}

export default {

    nombre: 'rob',

    categoria: 'economia',

    alias: [
        'robar',
        'steal'
    ],

    descripcion:
        'Intenta robarle dinero a otro usuario. Uso: .rob @usuario',

    ejecutar: async ({
        msg,
        responder
    }) => {

        const ladron =
            msg.key.participant ||
            msg.key.remoteJid;

        const mencionados =
            msg.message?.extendedTextMessage
                ?.contextInfo
                ?.mentionedJid || [];

        if (mencionados.length === 0) {

            await responder.texto(
                '╭━━〔 ⚠️ 𝐑𝐎𝐁 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Menciona a quién quieres robarle.\n' +
                '┃\n' +
                '┃ 📌 Uso: .rob @usuario\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;

        }

        const victima =
            mencionados[0];

        if (victima === ladron) {

            await responder.texto(
                '╭━━〔 ❌ 𝐑𝐎𝐁 〕━━⬣\n' +
                '┃\n' +
                '┃ No puedes robarte a ti mismo.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;

        }

        // -------------------------------------------------------
        // COOLDOWN
        // -------------------------------------------------------

        if (!puedeRobar(ladron)) {

            const restante =
                tiempoRestanteRobo(ladron);

            await responder.texto(
                '╭━━〔 ⏳ 𝐑𝐎𝐁 〕━━⬣\n' +
                '┃\n' +
                '┃ Ya intentaste robar hace poco.\n' +
                '┃\n' +
                `┃ 🕐 Espera › *${formatearMs(restante)}*\n` +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;

        }

        // -------------------------------------------------------
        // VALIDAR DINERO DE LA VÍCTIMA
        // -------------------------------------------------------

        const cuentaVictima =
            obtenerUsuario(victima);

        const dineroVictima =
            Number(
                cuentaVictima.dinero || 0
            );

        if (dineroVictima < MINIMO_VICTIMA) {

            await responder.texto(
                '╭━━〔 ❌ 𝐑𝐎𝐁 〕━━⬣\n' +
                '┃\n' +
                '┃ Esa persona no tiene suficiente\n' +
                '┃ dinero para que valga la pena\n' +
                '┃ robarle.\n' +
                '┃\n' +
                `┃ 📌 Mínimo › *$${MINIMO_VICTIMA.toLocaleString()}*\n` +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣',
                {
                    mentions: [victima]
                }
            );

            return;

        }

        // -------------------------------------------------------
        // INTENTO DE ROBO
        // -------------------------------------------------------

        registrarRobo(
            ladron
        );

        const exito =
            Math.random() < PROBABILIDAD_EXITO;

        if (!exito) {

            const multa =
                numeroAleatorio(
                    MULTA_MIN,
                    MULTA_MAX
                );

            const cuentaLadron =
                obtenerUsuario(ladron);

            const dineroLadron =
                Number(
                    cuentaLadron.dinero || 0
                );

            // No puede quedar en negativo por la multa.
            const multaReal =
                Math.min(
                    multa,
                    dineroLadron
                );

            if (multaReal > 0) {

                modificarDinero(
                    ladron,
                    -multaReal
                );

            }

            await responder.texto(
                '╭━━〔 🚨 𝐑𝐎𝐁 𝐅𝐀𝐋𝐋𝐈𝐃𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ Te atraparon intentando robar.\n' +
                '┃\n' +
                `┃ 💸 Multa › *$${multaReal.toLocaleString()}*\n` +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣',
                {
                    mentions: [victima]
                }
            );

            return;

        }

        // -------------------------------------------------------
        // ROBO EXITOSO
        // -------------------------------------------------------

        const porcentaje =
            PORCENTAJE_MIN +
            Math.random() *
            (PORCENTAJE_MAX - PORCENTAJE_MIN);

        const robado =
            Math.min(
                Math.floor(
                    dineroVictima * porcentaje
                ),
                TOPE_ROBO
            );

        modificarDinero(
            victima,
            -robado
        );

        modificarDinero(
            ladron,
            robado
        );

        await responder.texto(
            '╭〔 💰 𝐑𝐎𝐁 𝐄𝐗𝐈𝐓𝐎𝐒𝐎 〕⬣\n' +
            '┃\n' +
            `┃ 🥷 Le robaste a @${victima.split('@')[0]}\n` +
            '┃\n' +
            `┃ 💵 Ganaste › *$${robado.toLocaleString()}*\n` +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━⬣',
            {
                mentions: [victima]
            }
        );
    }
};
