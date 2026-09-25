

import {
    modificarDinero
} from '../database/economia.js';

import {
    resolverJidReal
} from './resolverJid.js';

const partidasActivas = new Map();

const TIEMPO_LIMITE_MS =
    10 * 60 * 1000;

const NUMEROS_EMOJI = [
    '1️⃣',
    '2️⃣',
    '3️⃣',
    '4️⃣',
    '5️⃣',
    '6️⃣',
    '7️⃣',
    '8️⃣',
    '9️⃣'
];

const LINEAS_GANADORAS = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],

    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],

    [0, 4, 8],
    [2, 4, 6]
];

const RECOMPENSA_MIN = 1000;
const RECOMPENSA_MAX = 3000;

function numeroAleatorio(min, max) {
    return Math.floor(
        Math.random() * (max - min + 1)
    ) + min;
}

function normalizarJid(jid) {
    if (!jid) {
        return '';
    }
    return String(jid)
        .trim()
        .toLowerCase();
}

function obtenerJidsRemitente(msg) {
    const candidatos = [
        msg?.key?.participantAlt,
        msg?.key?.participant,
        msg?.key?.remoteJidAlt,
        msg?.key?.remoteJid
    ];

    return [
        ...new Set(
            candidatos
                .filter(Boolean)
                .map(normalizarJid)
        )
    ];
}

async function resolverRemitente(sock, chatJid, msg) {
    const candidatos = obtenerJidsRemitente(msg);

    if (!candidatos.length) {
        return [];
    }

    const resueltos = [];

    for (const jid of candidatos) {
        resueltos.push(jid);

        try {
            const real = await resolverJidReal(
                sock,
                chatJid,
                jid
            );

            if (real) {
                resueltos.push(normalizarJid(real));
            }
        } catch (error) {
            console.error(
                '[TTT] Error resolviendo remitente:',
                error?.message || error
            );
        }
    }

    return [
        ...new Set(
            resueltos.filter(Boolean)
        )
    ];
}

function esMismoUsuario(
    identificadores,
    jugador
) {
    const objetivo = normalizarJid(jugador);

    if (!objetivo) {
        return false;
    }

    return identificadores.some(
        jid => normalizarJid(jid) === objetivo
    );
}

function formatearTablero(tablero) {
    const celda = i => {
        if (tablero[i] === 'X') {
            return '❌';
        }
        if (tablero[i] === 'O') {
            return '⭕';
        }
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
    return tablero.every(
        celda => celda !== null
    );
}

function estaExpirada(partida) {
    return (
        Date.now() - partida.creado >
        TIEMPO_LIMITE_MS
    );
}

export function hayPartidaActiva(chatJid) {
    const partida = partidasActivas.get(chatJid);

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
    partidasActivas.set(
        chatJid,
        {
            tablero: Array(9).fill(null),
            jugadores: {
                X: jidX,
                O: jidO
            },
            turno: 'X',
            messageKey: null,
            creado: Date.now()
        }
    );
}

export function guardarMessageKey(
    chatJid,
    messageKey
) {
    const partida = partidasActivas.get(chatJid);

    if (!partida) {
        return;
    }

    partida.messageKey = messageKey;
}

export function cancelarPartida(chatJid) {
    const existia = partidasActivas.has(chatJid);
    partidasActivas.delete(chatJid);
    return existia;
}

export async function manejarMensajeTTT(
    sock,
    msg
) {
    const chatJid = msg?.key?.remoteJid;

    if (!chatJid) {
        return false;
    }

    const partida = partidasActivas.get(chatJid);

    if (!partida) {
        return false;
    }

    if (estaExpirada(partida)) {
        partidasActivas.delete(chatJid);
        return false;
    }

    const texto = (
        msg?.message?.conversation ||
        msg?.message?.extendedTextMessage?.text ||
        msg?.message?.imageMessage?.caption ||
        msg?.message?.videoMessage?.caption ||
        ''
    ).trim();

    if (!/^[1-9]$/.test(texto)) {
        return false;
    }

    const identificadores = await resolverRemitente(
        sock,
        chatJid,
        msg
    );

    if (!identificadores.length) {
        return true;
    }

    async function idsDeJugador(jid) {
        const ids = [normalizarJid(jid)];
        try {
            const real = await resolverJidReal(sock, chatJid, jid);
            if (real) ids.push(normalizarJid(real));
        } catch (e) {}
        return ids;
    }

    const idsX = await idsDeJugador(partida.jugadores.X);
    const idsO = await idsDeJugador(partida.jugadores.O);

    console.log('[TTT] Remitente IDs:', identificadores);
    console.log('[TTT] Jugador X IDs:', idsX);
    console.log('[TTT] Jugador O IDs:', idsO);

    let simboloRemitente = null;

    function coincide(idsJugador) {
        for (const idJ of idsJugador) {
            if (esMismoUsuario(identificadores, idJ)) return true;
        }
        return false;
    }

    if (coincide(idsX)) {
        simboloRemitente = 'X';
    } else if (coincide(idsO)) {
        simboloRemitente = 'O';
    }

    console.log('[TTT] Símbolo detectado:', simboloRemitente);

    if (!simboloRemitente) {
        console.log('[TTT] No es jugador, ignorando');
        return false;
    }

    if (!partida.messageKey) {
        return true;
    }

    if (simboloRemitente !== partida.turno) {
        console.log('[TTT] No es su turno, ignorando');
        return true;
    }

    const indice = Number(texto) - 1;

    if (partida.tablero[indice] !== null) {
        return true;
    }

    partida.tablero[indice] = simboloRemitente;
    partida.creado = Date.now();

    const ganadorSimbolo = verificarGanador(partida.tablero);
    const empate = !ganadorSimbolo && tableroLleno(partida.tablero);

    const jidX = partida.jugadores.X;
    const jidO = partida.jugadores.O;

    let encabezado = '';
    let pie = '';

    if (ganadorSimbolo) {
        const jidGanador = ganadorSimbolo === 'X' ? jidX : jidO;
        const recompensa = numeroAleatorio(RECOMPENSA_MIN, RECOMPENSA_MAX);

        try {
            modificarDinero(jidGanador, recompensa);
        } catch (error) {
            console.error(
                '[TTT] Error entregando recompensa:',
                error?.message || error
            );
        }

        encabezado = `🎉 *¡@${jidGanador.split('@')[0]} ha ganado!*\n\n`;
        pie = `\n💰 Recompensa: +$${recompensa.toLocaleString()}`;
        partidasActivas.delete(chatJid);
    }

    else if (empate) {
        encabezado = '🤝 *¡Empate!*\n\n';
        partidasActivas.delete(chatJid);
    }

    else {
        partida.turno = simboloRemitente === 'X' ? 'O' : 'X';
        const jidSiguiente = partida.turno === 'X' ? jidX : jidO;
        encabezado =
            `⚔️ Turno de @${jidSiguiente.split('@')[0]} ` +
            `(${partida.turno === 'X' ? '❌' : '⭕'})\n\n`;
    }

    const texto2 =
        encabezado +
        formatearTablero(partida.tablero) +
        pie;

    let editado = false;

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
        editado = true;
        console.log('[TTT] ✅ Tablero editado correctamente');
    } catch (error) {
        console.error(
            '[TTT] ❌ Error editando tablero:',
            error?.message || error
        );

        try {
            const enviado = await sock.sendMessage(
                chatJid,
                {
                    text: texto2 + '\n\n📝 _(tablero reenviado)_',
                    mentions: [jidX, jidO]
                }
            );

            if (enviado?.key) {
                partida.messageKey = enviado.key;
            }
        } catch (fallbackError) {
            console.error(
                '[TTT] Error enviando tablero de respaldo:',
                fallbackError?.message || fallbackError
            );
        }
    }

    return true;
}

export {
    formatearTablero
};