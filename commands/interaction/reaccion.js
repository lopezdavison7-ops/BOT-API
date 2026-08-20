// commands/interaction/reaccion.js
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// Lista de reacciones
const REACCIONES = {
    hug: ['https://media.tenor.com/_T1L0wQ0jWwAAAAC/anime-hug.gif'],
    kiss: ['https://media.tenor.com/Gf4G9Xj0x7YAAAAC/anime-kiss.gif'],
    pat: ['https://media.tenor.com/5lJg4kQgY2AAAAAC/anime-pat.gif'],
    slap: ['https://media.tenor.com/oOqPz4xKvQAAAAAC/anime-slap.gif'],
    poke: ['https://media.tenor.com/3VtY8yE3O6AAAAAC/anime-poke.gif'],
    cuddle: ['https://media.tenor.com/L0qP8e7g5gAAAAAC/anime-cuddle.gif'],
    wave: ['https://media.tenor.com/f7i3VlG5ZqAAAAAC/anime-wave.gif'],
    smile: ['https://media.tenor.com/1F6E9yS5R4AAAAAC/anime-smile.gif'],
    dance: ['https://media.tenor.com/t5j4SxIeU4AAAAAC/anime-dance.gif'],
    cry: ['https://media.tenor.com/5LwWmH1Pq8AAAAAC/anime-cry.gif'],
    happy: ['https://media.tenor.com/1XmR5gC9xQAAAAAC/anime-happy.gif'],
    angry: ['https://media.tenor.com/7n1aN7H7Oa0AAAAC/anime-angry.gif'],
    love: ['https://media.tenor.com/7f9Xb3H2t8AAAAAC/anime-love.gif'],
    bite: ['https://media.tenor.com/6K8H1rU5N4AAAAAC/anime-bite.gif'],
    blush: ['https://media.tenor.com/0Vq5m5T7JYAAAAAC/anime-blush.gif'],
    highfive: ['https://media.tenor.com/5lJg4kQgY2AAAAAC/anime-highfive.gif'],
    handhold: ['https://media.tenor.com/L0qP8e7g5gAAAAAC/anime-handhold.gif'],
    feed: ['https://media.tenor.com/1F6E9yS5R4AAAAAC/anime-feed.gif'],
    bonk: ['https://media.tenor.com/4tXy9aZ8r8AAAAAC/anime-bonk.gif'],
    yeet: ['https://media.tenor.com/oOqPz4xKvQAAAAAC/anime-yeet.gif'],
    wink: ['https://media.tenor.com/f7i3VlG5ZqAAAAAC/anime-wink.gif'],
    stare: ['https://media.tenor.com/7n1aN7H7Oa0AAAAC/anime-stare.gif'],
    tickle: ['https://media.tenor.com/5lJg4kQgY2AAAAAC/anime-tickle.gif'],
    punch: ['https://media.tenor.com/oOqPz4xKvQAAAAAC/anime-punch.gif'],
    kick: ['https://media.tenor.com/2B4zV2jHbXAAAAAC/anime-kick.gif']
};

function obtenerTipo(msg) {
    const texto = msg?.message?.conversation || msg?.message?.extendedTextMessage?.text || '';
    if (!texto) return 'hug';
    const partes = texto.trim().split(/\s+/);
    const comando = partes[0]?.replace(/^\./, '').toLowerCase();
    return comando || 'hug';
}

function obtenerAutor(msg) {
    const key = msg?.key || {};
    const candidatos = [key.participant, key.senderPn, key.participantAlt, key.remoteJid];
    for (const c of candidatos) {
        if (!c) continue;
        if (String(c).endsWith('@g.us')) continue;
        return c;
    }
    return null;
}

function obtenerMencion(msg) {
    const ctx = msg?.message?.extendedTextMessage?.contextInfo;
    const m = ctx?.mentionedJid || [];
    return m.length > 0 ? m[0] : null;
}

function obtenerRespondido(msg) {
    const ctx = msg?.message?.extendedTextMessage?.contextInfo;
    if (!ctx?.quotedMessage) return null;
    return ctx.participant || ctx.participantAlt || null;
}

function crearMencion(jid) {
    if (!jid) return null;
    const num = String(jid).split('@')[0].split(':')[0];
    return num ? `@${num}` : null;
}

function obtenerAccion(t) {
    const a = {
        hug: 'abraza', kiss: 'besa', pat: 'acaricia', slap: 'da una bofetada a',
        poke: 'molesta a', cuddle: 'se acurruca con', wave: 'saluda a',
        smile: 'sonríe a', dance: 'baila con', cry: 'llora con',
        happy: 'se alegra con', angry: 'se enoja con', love: 'ama a',
        bite: 'muerde a', blush: 'se sonroja con', highfive: 'choca la mano con',
        handhold: 'toma de la mano a', feed: 'alimenta a', bonk: 'golpea suavemente a',
        yeet: 'lanza a', wink: 'le guiña el ojo a', stare: 'mira a',
        tickle: 'hace cosquillas a', punch: 'golpea a', kick: 'patea a'
    };
    return a[t] || t;
}

function textoSinObjetivo(t, a) {
    const m = {
        hug: `${a} quiere dar muchos abrazos 🤗`,
        kiss: `${a} quiere dar muchos besos 😘`,
        pat: `${a} quiere dar muchas caricias 🥰`,
        wave: `${a} quiere saludar a todos 👋`,
        dance: `${a} quiere bailar 💃`,
        smile: `${a} está sonriendo 😄`,
        love: `${a} está repartiendo amor ❤️`
    };
    return m[t] || `${a} quiere hacer muchas reacciones 🎭`;
}

// ============================================================
// CONVERTIR GIF A STICKER ANIMADO (USANDO FFMPEG)
// ============================================================

async function crearStickerAnimado(buffer) {
    const carpeta = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'reaccion-sticker-')
    );
    const entrada = path.join(carpeta, 'entrada.gif');
    const salida = path.join(carpeta, 'sticker.webp');

    try {
        await fs.promises.writeFile(entrada, buffer);

        const filtro = [
            'scale=384:384:force_original_aspect_ratio=decrease',
            'pad=384:384:(ow-iw)/2:(oh-ih)/2:color=black@0',
            'fps=10',
            'format=yuva420p'
        ].join(',');

        await execFileAsync(
            'ffmpeg',
            [
                '-y',
                '-i',
                entrada,
                '-vf',
                filtro,
                '-an',
                '-c:v',
                'libwebp',
                '-lossless',
                '0',
                '-q:v',
                '75',
                '-compression_level',
                '6',
                salida
            ],
            { maxBuffer: 20 * 1024 * 1024 }
        );

        const resultado = await fs.promises.readFile(salida);
        if (!resultado.length) throw new Error('Sticker vacío.');
        return resultado;

    } finally {
        await fs.promises.rm(carpeta, { recursive: true, force: true }).catch(() => {});
    }
}

// ============================================================
// DESCARGAR GIF
// ============================================================

async function descargarGif(url) {
    const res = await fetch(url);
    const buffer = await res.buffer();
    return buffer;
}

// ============================================================
// COMANDO PRINCIPAL
// ============================================================

export default {
    nombre: 'reaccion',
    categoria: 'Interacción',
    alias: ['hug', 'kiss', 'pat', 'slap', 'poke', 'cuddle', 'wave', 'smile', 'dance', 'cry', 'happy', 'angry', 'love', 'bite', 'blush', 'highfive', 'handhold', 'feed', 'bonk', 'yeet', 'wink', 'stare', 'tickle', 'punch', 'kick'],
    descripcion: 'Reacciones con stickers animados.',

    async ejecutar({ sock, msg, responder }) {
        const tipo = obtenerTipo(msg);

        try {
            const urls = REACCIONES[tipo];
            if (!urls || !urls.length) {
                return responder.texto(`❌ No hay GIF para ${tipo}`);
            }

            const url = urls[Math.floor(Math.random() * urls.length)];

            // Descargar el GIF como buffer
            const buffer = await descargarGif(url);

            // Convertirlo a sticker animado WebP
            const stickerBuffer = await crearStickerAnimado(buffer);

            // Obtener autor y objetivo
            const autor = obtenerAutor(msg);
            const mencionado = obtenerMencion(msg);
            const respondido = obtenerRespondido(msg);
            const objetivo = mencionado || respondido || null;

            const textoAutor = crearMencion(autor) || '@usuario';
            const menciones = [];

            let caption = `🎭 *${tipo.toUpperCase()}*\n\n`;

            if (objetivo) {
                const textoObjetivo = crearMencion(objetivo);
                if (textoObjetivo) {
                    const accion = obtenerAccion(tipo);
                    caption += `💫 ${textoAutor} ${accion} ${textoObjetivo}`;
                    if (autor) menciones.push(autor);
                    if (objetivo && !menciones.includes(objetivo)) menciones.push(objetivo);
                } else {
                    caption += `💫 ${textoSinObjetivo(tipo, textoAutor)}`;
                }
            } else {
                caption += `💫 ${textoSinObjetivo(tipo, textoAutor)}`;
                if (autor) menciones.push(autor);
            }

            // Enviar el sticker animado
            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    sticker: stickerBuffer,
                    packname: 'BOT-API',
                    author: 'Reacciones'
                },
                { quoted: msg }
            );

        } catch (error) {
            console.error('[REACCION] Error:', error?.message || error);
            await responder.texto(`❌ No pude enviar la reacción *${tipo}*.\n\n⚠️ Error al procesar el sticker.`);
        }
    }
};