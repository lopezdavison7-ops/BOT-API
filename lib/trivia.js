// lib/trivia.js
// ============================================================
// TRIVIA — motor del juego
// ============================================================
// Cada partida vive en memoria (Map por chat). El bot manda una
// pregunta de opción múltiple (A/B/C/D) y cualquiera en el chat
// puede responder mandando SOLO la letra (o la palabra completa
// de la opción), sin el prefijo del bot — mismo patrón que TTT.
// Si nadie acierta a tiempo, se revela la respuesta sola.
//
// Además, cada usuario solo puede INICIAR una trivia (.trivia)
// cada 3 horas — responder no tiene límite, el límite es para
// no dejar el chat lleno de trivias seguidas de la misma persona.
// ============================================================

import path from 'path';
import { fileURLToPath } from 'url';

import {
    modificarDinero
} from '../database/economia.js';

import {
    obtenerStore,
    guardarStore
} from './jsonStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARCHIVO_COOLDOWN =
    path.join(__dirname, '..', 'database', 'trivia.json');

// chatJid -> {
//   pregunta, opciones: ['...','...','...','...'],
//   correctaIndex: 0-3,
//   messageKey, timeoutId, creado
// }
const partidasActivas = new Map();

const LETRAS = ['A', 'B', 'C', 'D'];

const TIEMPO_LIMITE_MS = 30 * 1000; // 30 segundos para responder

const RECOMPENSA_MIN = 500;
const RECOMPENSA_MAX = 1500;

// 3 horas en milisegundos
export const COOLDOWN_TRIVIA = 3 * 60 * 60 * 1000;

// ============================================================
// BANCO DE PREGUNTAS
// ============================================================
const PREGUNTAS = [
    { p: '¿Cuál es el planeta más grande del sistema solar?', o: ['Marte', 'Júpiter', 'Saturno', 'Neptuno'], r: 1 },
    { p: '¿En qué continente está Egipto?', o: ['Asia', 'Europa', 'África', 'Oceanía'], r: 2 },
    { p: '¿Cuántos huesos tiene el cuerpo humano adulto?', o: ['186', '206', '226', '246'], r: 1 },
    { p: '¿Cuál es el río más largo del mundo?', o: ['Nilo', 'Amazonas', 'Yangtsé', 'Misisipi'], r: 1 },
    { p: '¿Qué gas respiramos principalmente para vivir?', o: ['Dióxido de carbono', 'Hidrógeno', 'Oxígeno', 'Nitrógeno'], r: 2 },
    { p: '¿Cuál es la capital de Japón?', o: ['Pekín', 'Seúl', 'Tokio', 'Bangkok'], r: 2 },
    { p: '¿Quién pintó la Mona Lisa?', o: ['Miguel Ángel', 'Leonardo da Vinci', 'Rafael', 'Picasso'], r: 1 },
    { p: '¿Cuál es el metal líquido a temperatura ambiente?', o: ['Hierro', 'Mercurio', 'Plomo', 'Aluminio'], r: 1 },
    { p: '¿Cuántos lados tiene un hexágono?', o: ['5', '6', '7', '8'], r: 1 },
    { p: '¿Cuál es el océano más grande del mundo?', o: ['Atlántico', 'Índico', 'Ártico', 'Pacífico'], r: 3 },
    { p: '¿Qué país tiene forma de bota?', o: ['España', 'Italia', 'Grecia', 'Portugal'], r: 1 },
    { p: '¿Cuál es el animal terrestre más grande?', o: ['Rinoceronte', 'Hipopótamo', 'Elefante africano', 'Jirafa'], r: 2 },
    { p: '¿En qué año llegó el ser humano a la Luna?', o: ['1965', '1969', '1972', '1959'], r: 1 },
    { p: '¿Cuál es la moneda oficial de Japón?', o: ['Yuan', 'Won', 'Yen', 'Rupia'], r: 2 },
    { p: '¿Cuántos corazones tiene un pulpo?', o: ['1', '2', '3', '4'], r: 2 },
    { p: '¿Cuál es el idioma más hablado del mundo como lengua materna?', o: ['Inglés', 'Español', 'Mandarín', 'Hindi'], r: 2 },
    { p: '¿Qué instrumento mide la temperatura?', o: ['Barómetro', 'Termómetro', 'Altímetro', 'Higrómetro'], r: 1 },
    { p: '¿Cuál es el hueso más largo del cuerpo humano?', o: ['Húmero', 'Tibia', 'Fémur', 'Radio'], r: 2 },
    { p: '¿Cuántos jugadores tiene un equipo de fútbol en cancha?', o: ['9', '10', '11', '12'], r: 2 },
    { p: '¿Cuál es la estrella más cercana a la Tierra?', o: ['Alfa Centauri', 'El Sol', 'Sirio', 'Proxima Centauri'], r: 1 },
    { p: '¿Qué órgano bombea la sangre en el cuerpo humano?', o: ['Pulmón', 'Hígado', 'Corazón', 'Riñón'], r: 2 },
    { p: '¿Cuál es el desierto más grande del mundo (frío incluido)?', o: ['Sahara', 'Gobi', 'Antártida', 'Atacama'], r: 2 },
    { p: '¿Cuántos colores tiene el arcoíris?', o: ['5', '6', '7', '8'], r: 2 },
    { p: '¿Qué país inventó el papel?', o: ['Egipto', 'China', 'India', 'Grecia'], r: 1 },
    { p: '¿Cuál es el mamífero que puede volar?', o: ['Ardilla voladora', 'Murciélago', 'Colibrí', 'Petauro'], r: 1 },
    { p: '¿Cuántos minutos dura un partido de fútbol reglamentario?', o: ['80', '90', '100', '120'], r: 1 },
    { p: '¿Cuál es el país más poblado del mundo?', o: ['China', 'Estados Unidos', 'India', 'Indonesia'], r: 2 },
    { p: '¿Qué elemento químico tiene el símbolo "O"?', o: ['Oro', 'Osmio', 'Oxígeno', 'Óxido'], r: 2 },
    { p: '¿Cuál es la capital de Francia?', o: ['Lyon', 'Marsella', 'París', 'Niza'], r: 2 },
    { p: '¿Cuántas patas tiene una araña?', o: ['6', '8', '10', '12'], r: 1 }
];

// ============================================================
// UTILIDADES INTERNAS
// ============================================================
function numeroAleatorio(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function preguntaAleatoria() {
    return PREGUNTAS[Math.floor(Math.random() * PREGUNTAS.length)];
}

function formatearPregunta(pregunta) {
    const opciones = pregunta.o
        .map((op, i) => `┃ ${LETRAS[i]}) ${op}`)
        .join('\n');

    return (
        `❓ *${pregunta.p}*\n┃\n` +
        opciones
    );
}

function limpiarPartida(chatJid) {
    const partida = partidasActivas.get(chatJid);
    if (partida?.timeoutId) clearTimeout(partida.timeoutId);
    partidasActivas.delete(chatJid);
}

function normalizar(texto) {
    return String(texto || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

// ============================================================
// COOLDOWN (3 horas por usuario para INICIAR trivia)
// ============================================================
export function puedeUsarTrivia(id) {
    const datos = obtenerStore(ARCHIVO_COOLDOWN, {});
    const ultimoUso = datos[id];

    if (!ultimoUso) return true;

    return (Date.now() - ultimoUso) >= COOLDOWN_TRIVIA;
}

export function tiempoRestanteTrivia(id) {
    const datos = obtenerStore(ARCHIVO_COOLDOWN, {});
    const ultimoUso = datos[id];

    if (!ultimoUso) return 0;

    const restante = COOLDOWN_TRIVIA - (Date.now() - ultimoUso);
    return restante > 0 ? restante : 0;
}

export function registrarUsoTrivia(id) {
    const datos = obtenerStore(ARCHIVO_COOLDOWN, {});
    datos[id] = Date.now();
    guardarStore(ARCHIVO_COOLDOWN);
}

export function formatearTiempoRestante(ms) {
    const horas = Math.floor(ms / (60 * 60 * 1000));
    const minutos = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));

    if (horas > 0) return `${horas}h ${minutos}m`;
    return `${minutos}m`;
}

// ============================================================
// API PÚBLICA
// ============================================================
export function hayPartidaActiva(chatJid) {
    return partidasActivas.has(chatJid);
}

export async function crearPregunta(sock, chatJid, msg) {
    const pregunta = preguntaAleatoria();

    const texto =
        '╭〔 🧠 𝐓𝐑𝐈𝐕𝐈𝐀 〕⬣\n┃\n' +
        formatearPregunta(pregunta) +
        '\n┃\n' +
        `┃ ⏱️ Tienes 30 segundos.\n` +
        `┃ 📌 Responde con la letra (A, B, C o D)\n` +
        `┃     SIN el punto del bot.\n` +
        '┃\n╰━━━━━━━━━━━━━━━━⬣';

    const enviado = await sock.sendMessage(
        chatJid,
        { text: texto },
        { quoted: msg }
    );

    const partida = {
        pregunta,
        messageKey: enviado.key,
        creado: Date.now(),
        timeoutId: null
    };

    partida.timeoutId = setTimeout(() => {
        revelarPorTiempo(sock, chatJid);
    }, TIEMPO_LIMITE_MS);

    partidasActivas.set(chatJid, partida);
}

export function cancelarPartida(chatJid) {
    const existia = partidasActivas.has(chatJid);
    limpiarPartida(chatJid);
    return existia;
}

async function revelarPorTiempo(sock, chatJid) {
    const partida = partidasActivas.get(chatJid);
    if (!partida) return;

    limpiarPartida(chatJid);

    const correcta = partida.pregunta.o[partida.pregunta.r];

    try {
        await sock.sendMessage(chatJid, {
            text:
                '╭〔 ⏱️ 𝐓𝐑𝐈𝐕𝐈𝐀 〕⬣\n┃\n' +
                '┃ ⌛ Se acabó el tiempo, nadie acertó.\n┃\n' +
                `┃ ✅ La respuesta era: *${LETRAS[partida.pregunta.r]}) ${correcta}*\n┃\n` +
                '╰━━━━━━━━━━━━━━━━⬣'
        });
    } catch (error) {
        console.error('[TRIVIA] Error revelando respuesta:', error?.message || error);
    }
}

// ============================================================
// PROCESAR UN MENSAJE ENTRANTE
// ============================================================
// Devuelve `true` si el mensaje era una respuesta válida de
// trivia y ya fue manejado (el llamador NO debe seguirlo
// procesando como comando normal). Devuelve `false` si no.
// ============================================================
export async function manejarMensajeTrivia(sock, msg) {
    const chatJid = msg.key.remoteJid;
    if (!chatJid) return false;

    const partida = partidasActivas.get(chatJid);
    if (!partida) return false;

    const texto = (
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        ''
    ).trim();

    if (!texto) return false;

    const remitente = msg.key.participant || msg.key.remoteJid;

    // Se acepta: una letra sola (A-D) o el texto completo de la opción.
    const letra = texto.toUpperCase();
    let indiceElegido = LETRAS.indexOf(letra);

    if (indiceElegido === -1) {
        indiceElegido = partida.pregunta.o.findIndex(
            op => normalizar(op) === normalizar(texto)
        );
    }

    // No es una respuesta válida de trivia (podría ser cualquier
    // otro mensaje del chat) — se ignora sin interferir.
    if (indiceElegido === -1) return false;

    const acerto = indiceElegido === partida.pregunta.r;

    if (!acerto) {
        // Respuesta incorrecta: se ignora en silencio para no
        // llenar el chat, la partida sigue abierta.
        return true;
    }

    limpiarPartida(chatJid);

    const recompensa = numeroAleatorio(RECOMPENSA_MIN, RECOMPENSA_MAX);
    modificarDinero(remitente, recompensa);

    const correcta = partida.pregunta.o[partida.pregunta.r];

    try {
        await sock.sendMessage(chatJid, {
            text:
                '╭〔 🎉 𝐓𝐑𝐈𝐕𝐈𝐀 〕⬣\n┃\n' +
                `┃ ✅ ¡@${remitente.split('@')[0]} acertó!\n┃\n` +
                `┃ La respuesta era: *${LETRAS[partida.pregunta.r]}) ${correcta}*\n┃\n` +
                `┃ 💰 Recompensa: +$${recompensa.toLocaleString()}\n┃\n` +
                '╰━━━━━━━━━━━━━━━━⬣',
            mentions: [remitente]
        });
    } catch (error) {
        console.error('[TRIVIA] Error anunciando ganador:', error?.message || error);
    }

    return true;
}