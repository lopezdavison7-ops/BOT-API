// lib/ttt.js
// ============================================================
// TRES EN RAYA (TTT) — motor del juego
// ============================================================
// Cada partida vive en memoria (Map por chat). Cuando un
// jugador manda un número suelto (1-9, SIN el prefijo del
// bot), se EDITA el mismo mensaje del tablero en vez de mandar
// uno nuevo — para eso se usa la opción `edit` de Baileys.
// ============================================================

import {
    modificarDinero
} from '../database/economia.js';

// chatJid -> {
//   tablero: Array(9) de null | 'X' | 'O',
//   jugadores: { X: jid, O: jid },
//   turno: 'X' | 'O',
//   messageKey: key del mensaje del tablero (para editar),
//   creado: timestamp
// }
const partidasActivas = new Map();

// Una partida abandonada se libera sola después de este tiempo
// sin movimientos, para no dejar el chat bloqueado para siempre.
const TIEMPO_LIMITE_MS = 10 * 60 * 1000; // 10 minutos

// Emojis "keycap" para las casillas vacías (1️⃣ a 9️⃣)
const NUMEROS_EMOJI = [
    '1️⃣', '2️⃣', '3️⃣',
    '4️⃣', '5️⃣', '6️⃣',
    '7️⃣', '8️⃣', '9️⃣'
];

const LINEAS_GANADORAS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // filas
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columnas
    [0, 4, 8], [2, 4, 6]             // diagonales
];

const RECOMPENSA_MIN = 1000;
const RECOMPENSA_MAX = 3000;

// ============================================================
// UTILIDADES INTERNAS
// ============================================================

function numeroAleatorio(min, max) {
    return Math.floor(
        Math.random() * (max - min + 1)
    ) + min;
}

function formatearTablero(tablero) {

    const celda = i => {

        if (tablero[i] === 'X') return '❌';
        if (tablero[i] === 'O') return '⭕';

        return NUMEROS_EMOJI[i];

    };

    return (
        `${celda(0)} ${celda(1)} ${celda(2)}\n` +
        `${celda(3)} ${celda(4)} ${celda(5)}\n` +
        `${celda(6)} ${celda(7)} ${celda(8)}`
    );

}

function verificarGanador(tablero) {

    for (const [a, b, c] of LINEAS_GANADORAS) {

        if (
            tablero[a] &&
            tablero[a] === tablero[b] &&
            tablero[a] === tablero[c]
        ) {

            return tablero[a];

        }

    }

    return null;

}

function tableroLleno(tablero) {
    return tablero.every(c => c !== null);
}

function estaExpirada(partida) {
    return (
        Date.now() - partida.creado >
        TIEMPO_LIMITE_MS
    );
}

// ============================================================
// API PÚBLICA
// ============================================================

export function hayPartidaActiva(chatJid) {

    const partida =
        partidasActivas.get(chatJid);

    if (!partida) {
        return false;
    }

    if (estaExpirada(partida)) {

        partidasActivas.delete(chatJid);
        return false;

    }

    return true;

}

export function crearPartida(
    chatJid,
    jidX,
    jidO
) {

    partidasActivas.set(chatJid, {
        tablero: Array(9).fill(null),
        jugadores: {
            X: jidX,
            O: jidO
        },
        turno: 'X',
        messageKey: null,
        creado: Date.now()
    });

}

export function guardarMessageKey(
    chatJid,
    messageKey
) {

    const partida =
        partidasActivas.get(chatJid);

    if (partida) {
        partida.messageKey = messageKey;
    }

}

export function cancelarPartida(chatJid) {

    const existia =
        partidasActivas.has(chatJid);

    partidasActivas.delete(chatJid);

    return existia;

}

// ============================================================
// PROCESAR UN MENSAJE ENTRANTE
// ============================================================
// Devuelve `true` si el mensaje era un movimiento válido de TTT
// y ya fue manejado (el llamador NO debe seguir procesándolo
// como comando normal). Devuelve `false` si no tiene nada que
// ver con TTT y debe seguir el flujo normal.
// ============================================================

export async function manejarMensajeTTT(
    sock,
    msg
) {

    const chatJid =
        msg.key.remoteJid;

    if (!chatJid) {
        return false;
    }

    const partida =
        partidasActivas.get(chatJid);

    if (!partida) {
        return false;
    }

    if (estaExpirada(partida)) {

        partidasActivas.delete(chatJid);
        return false;

    }

    const texto = (
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        ''
    ).trim();

    // Debe ser EXACTAMENTE un dígito del 1 al 9, sin prefijo
    // ni texto alrededor.
    if (!/^[1-9]$/.test(texto)) {
        return false;
    }

    const remitente =
        msg.key.participant ||
        msg.key.remoteJid;

    const simboloRemitente =
        partida.jugadores.X === remitente
            ? 'X'
            : partida.jugadores.O === remitente
                ? 'O'
                : null;

    // El mensaje es un número suelto pero de alguien que no
    // está en esta partida — se ignora sin interferir (podría
    // ser cualquier otra conversación del grupo).
    if (!simboloRemitente) {
        return false;
    }

    if (!partida.messageKey) {
        // El tablero inicial todavía no terminó de enviarse.
        return true;
    }

    // ---------------------------------------------------
    // VALIDACIONES DEL MOVIMIENTO
    // ---------------------------------------------------

    if (simboloRemitente !== partida.turno) {

        // No es su turno — se ignora en silencio para no
        // llenar el chat de avisos por cada número suelto.
        return true;

    }

    const indice =
        Number(texto) - 1;

    if (partida.tablero[indice] !== null) {

        // Casilla ocupada, se ignora también.
        return true;

    }

    // ---------------------------------------------------
    // APLICAR MOVIMIENTO
    // ---------------------------------------------------

    partida.tablero[indice] =
        simboloRemitente;

    const ganadorSimbolo =
        verificarGanador(partida.tablero);

    const empate =
        !ganadorSimbolo &&
        tableroLleno(partida.tablero);

    const jidX =
        partida.jugadores.X;

    const jidO =
        partida.jugadores.O;

    let encabezado;
    let pie = '';

    if (ganadorSimbolo) {

        const jidGanador =
            ganadorSimbolo === 'X'
                ? jidX
                : jidO;

        const recompensa =
            numeroAleatorio(
                RECOMPENSA_MIN,
                RECOMPENSA_MAX
            );

        modificarDinero(
            jidGanador,
            recompensa
        );

        encabezado =
            `🎉 *¡@${jidGanador.split('@')[0]} ha ganado!*\n\n`;

        pie =
            `\n💰 Recompensa: +$${recompensa.toLocaleString()}`;

        partidasActivas.delete(
            chatJid
        );

    } else if (empate) {

        encabezado =
            '🤝 *¡Empate!*\n\n';

        partidasActivas.delete(
            chatJid
        );

    } else {

        partida.turno =
            simboloRemitente === 'X'
                ? 'O'
                : 'X';

        const jidSiguiente =
            partida.turno === 'X'
                ? jidX
                : jidO;

        encabezado =
            `⚔️ Turno de @${jidSiguiente.split('@')[0]} ` +
            `(${partida.turno === 'X' ? '❌' : '⭕'})\n\n`;

    }

    const texto2 =
        encabezado +
        formatearTablero(
            partida.tablero
        ) +
        pie;

    try {

        await sock.sendMessage(
            chatJid,
            {
                text: texto2,
                mentions: [jidX, jidO]
            },
            {
                edit: partida.messageKey
            }
        );

    } catch (error) {

        console.error(
            '[TTT] Error editando el tablero:',
            error?.message || error
        );

    }

    return true;

}

export {
    formatearTablero
};
