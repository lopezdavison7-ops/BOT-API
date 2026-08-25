// commands/economy/slots.js
import {
    obtenerUsuario,
    modificarDinero
} from '../../database/economia.js';

const SIMBOLOS = [
    '🍒',
    '🍋',
    '🍇',
    '🍉',
    '⭐',
    '💎'
];

// Multiplicador según qué símbolo salió en trío
const MULTIPLICADORES = {
    '🍒': 2,
    '🍋': 3,
    '🍇': 4,
    '🍉': 5,
    '⭐': 8,
    '💎': 15
};

const APUESTA_MINIMA = 50;
const APUESTA_MAXIMA = 10000;

function girar() {
    return [
        SIMBOLOS[Math.floor(Math.random() * SIMBOLOS.length)],
        SIMBOLOS[Math.floor(Math.random() * SIMBOLOS.length)],
        SIMBOLOS[Math.floor(Math.random() * SIMBOLOS.length)]
    ];
}

export default {
    nombre: 'slots',

    categoria: 'economia',

    alias: [
        'tragamonedas',
        'casino'
    ],

    descripcion:
        `Apuesta en la tragamonedas. Uso: .slots <cantidad> (mín $${APUESTA_MINIMA}, máx $${APUESTA_MAXIMA})`,

    ejecutar: async ({
        msg,
        responder,
        argumento
    }) => {

        const id =
            msg.key.participant ||
            msg.key.remoteJid;

        const usuario =
            obtenerUsuario(id);

        const apuesta =
            Number(
                (argumento || '').trim()
            );

        if (
            !Number.isFinite(apuesta) ||
            !Number.isInteger(apuesta) ||
            apuesta <= 0
        ) {

            await responder.texto(
                '╭━━〔 ⚠️ 𝐒𝐋𝐎𝐓𝐒 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Indica cuánto quieres apostar.\n' +
                '┃\n' +
                '┃ 📌 Uso: .slots <cantidad>\n' +
                `┃ 📌 Mínimo › *$${APUESTA_MINIMA.toLocaleString()}*\n` +
                `┃ 📌 Máximo › *$${APUESTA_MAXIMA.toLocaleString()}*\n` +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;

        }

        if (apuesta < APUESTA_MINIMA) {

            await responder.texto(
                '╭━━〔 ❌ 𝐒𝐋𝐎𝐓𝐒 〕━━⬣\n' +
                '┃\n' +
                `┃ La apuesta mínima es *$${APUESTA_MINIMA.toLocaleString()}*\n` +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;

        }

        if (apuesta > APUESTA_MAXIMA) {

            await responder.texto(
                '╭━━〔 ❌ 𝐒𝐋𝐎𝐓𝐒 〕━━⬣\n' +
                '┃\n' +
                `┃ La apuesta máxima es *$${APUESTA_MAXIMA.toLocaleString()}*\n` +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;

        }

        if (apuesta > usuario.dinero) {

            await responder.texto(
                '╭━━〔 ❌ 𝐒𝐋𝐎𝐓𝐒 〕━━⬣\n' +
                '┃\n' +
                '┃ No tienes suficiente dinero en mano.\n' +
                '┃\n' +
                `┃ 💵 En mano › *$${usuario.dinero.toLocaleString()}*\n` +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;

        }

        const resultado =
            girar();

        const [a, b, c] =
            resultado;

        let ganancia = 0;
        let lineaResultado = '';

        if (a === b && b === c) {

            // Trío exacto: multiplicador alto según el símbolo
            const multiplicador =
                MULTIPLICADORES[a] || 2;

            ganancia =
                apuesta * multiplicador;

            lineaResultado =
                `┃ 🎉 ¡TRÍO! Multiplicador x${multiplicador}\n`;

        } else if (
            a === b ||
            b === c ||
            a === c
        ) {

            // Dos iguales: recupera la apuesta (x1.5)
            ganancia =
                Math.floor(apuesta * 1.5);

            lineaResultado =
                '┃ 🙂 Dos iguales, ganancia parcial.\n';

        } else {

            // Nada: pierde la apuesta completa
            ganancia = 0;
            lineaResultado =
                '┃ 😢 Sin suerte esta vez.\n';

        }

        const neto =
            ganancia - apuesta;

        modificarDinero(
            id,
            neto
        );

        const usuarioFinal =
            obtenerUsuario(id);

        await responder.texto(
            '╭〔 🎰 𝐒𝐋𝐎𝐓𝐒 〕⬣\n' +
            '┃\n' +
            `┃ [ ${a} | ${b} | ${c} ]\n` +
            '┃\n' +
            lineaResultado +
            '┃\n' +
            `┃ 💰 Apostaste › *$${apuesta.toLocaleString()}*\n` +
            `┃ ${neto >= 0 ? '📈 Ganaste' : '📉 Perdiste'} › *$${Math.abs(neto).toLocaleString()}*\n` +
            `┃ 💵 Saldo › *$${usuarioFinal.dinero.toLocaleString()}*\n` +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━⬣'
        );
    }
};
