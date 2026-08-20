// commands/interaction/reaccion.js
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// ============================================================
// LISTA DE REACCIONES (usando waifu.pics)
// ============================================================

const REACCIONES = {
    hug: 'hug',
    kiss: 'kiss',
    pat: 'pat',
    slap: 'slap',
    poke: 'poke',
    cuddle: 'cuddle',
    wave: 'wave',
    smile: 'smile',
    dance: 'dance',
    cry: 'cry',
    happy: 'happy',
    angry: 'angry',
    love: 'love',
    bite: 'bite',
    blush: 'blush',
    highfive: 'highfive',
    handhold: 'handhold',
    feed: 'feed',
    bonk: 'bonk',
    yeet: 'yeet',
    wink: 'wink',
    stare: 'stare',
    tickle: 'tickle',
    punch: 'punch',
    kick: 'kick'
};

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

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
// DESCARGAR GIF Y CONVERTIRLO A MP4
// ============================================================

async function descargarYConvertir(url) {
    const carpeta = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'reaccion-')
    );

    const gifPath = path.join(carpeta, 'original.gif');
    const mp4Path = path.join(carpeta, 'convertido.mp4');

    try {
        // 1. Descargar el GIF
        const res = await fetch(url);
        const buffer = await res.buffer();
        fs.writeFileSync(gifPath, buffer);

        // 2. Convertir GIF a MP4 usando ffmpeg
        await execFileAsync(
            'ffmpeg',
            [
                '-y',
                '-i', gifPath,
                '-movflags', '+faststart',
                '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2',
                '-c:v', 'libx264',
                '-preset', 'fast',
                '-crf', '23',
                '-an',
                mp4Path
            ],
            { maxBuffer: 20 * 1024 * 1024 }
        );

        // 3. Leer el MP4 generado
        const mp4Buffer = fs.readFileSync(mp4Path);
        return mp4Buffer;

    } finally {
        // Limpiar carpeta temporal
        await fs.promises.rm(carpeta, { recursive: true, force: true }).catch(() => {});
    }
}

// ============================================================
// COMANDO PRINCIPAL
// ============================================================

export default {
    nombre: 'reaccion',
    categoria: 'Interacción',
    alias: ['hug', 'kiss', 'pat', 'slap', 'poke', 'cuddle', 'wave', 'smile', 'dance', 'cry', 'happy', 'angry', 'love', 'bite', 'blush', 'highfive', 'handhold', 'feed', 'bonk', 'yeet', 'wink', 'stare', 'tickle', 'punch', 'kick'],
    descripcion: 'Envía un GIF de reacción en formato MP4 (sin errores).',

    async ejecutar({ sock, msg, responder }) {
        const tipo = obtenerTipo(msg);

        try {
            console.log(`[REACCION] Ejecutando: ${tipo}`);

            const tipoApi = REACCIONES[tipo];
            if (!tipoApi) {
                return responder.texto(`❌ Reacción *${tipo}* no disponible.`);
            }

            const apiUrl = `https://api.waifu.pics/sfw/${tipoApi}`;
            const res = await fetch(apiUrl);
            const data = await res.json();
            const gifUrl = data.url;

            if (!gifUrl) {
                return responder.texto(`❌ No se pudo obtener el GIF para *${tipo}*.`);
            }

            // Descargar y convertir a MP4
            const mp4Buffer = await descargarYConvertir(gifUrl);

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

            // Enviar el video MP4 (WhatsApp lo reproduce como GIF)
            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    video: mp4Buffer,
                    mimetype: 'video/mp4',
                    caption,
                    mentions: menciones
                },
                { quoted: msg }
            );

        } catch (error) {
            console.error('[REACCION] Error:', error?.message || error);
            await responder.texto(`❌ No pude enviar la reacción *${tipo}*.\n\n⚠️ ${error?.message || 'Error desconocido'}`);
        }
    }
};