// commands/interaction/reaccion.js
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// ============================================================
// LISTA DE GIFs 100% FUNCIONALES (desde GitHub)
// ============================================================

const REACCIONES = {
    hug: [
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/9535cb9a55.gif',
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/6b238024da.gif'
    ],
    kiss: [
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/be310f02b3.gif',
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/f35004c537.gif'
    ],
    pat: [
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/aa04882cf0.gif',
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/7f567b121c.gif'
    ],
    slap: [
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/ec33cb4472.gif',
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/4816236c79.gif'
    ],
    poke: [
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/5db2be6da3.gif',
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/3cbe4e0e10.gif'
    ],
    cuddle: [
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/8b8bf1db46.gif',
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/0aa8081040.gif'
    ],
    wave: [
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/247a461176.gif',
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/c9db25d0ec.gif'
    ],
    smile: [
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/ba554e8789.gif',
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/75b144c16e.gif'
    ],
    dance: [
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/42c581756f.gif',
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/e7d6758d51.gif'
    ],
    cry: [
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/e9df37559b.gif',
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/bb7e8d6b25.gif'
    ],
    happy: [
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/a2b43a93d9.gif',
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/bd5e4143da.gif'
    ],
    angry: [
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/db1be31c46.gif',
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/77ff5a340a.gif'
    ],
    love: [
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/24a7d1bf51.gif',
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/b25cb710db.gif'
    ],
    bite: [
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/c2e853e3d6.gif',
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/f04c393170.gif'
    ],
    blush: [
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/76de9dc2fa.gif',
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/8a6c1ad34e.gif'
    ],
    highfive: [
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/c22ff49754.gif',
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/a9682e795d.gif'
    ],
    handhold: [
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/4cd2f2cb31.gif',
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/c6dce7a3c9.gif'
    ],
    feed: [
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/25aaf06bf6.gif',
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/9656accc24.gif'
    ],
    bonk: [
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/17703ba93a.gif',
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/783a7b6d82.gif'
    ],
    yeet: [
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/c50d016a77.gif',
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/2d308ed364.gif'
    ],
    wink: [
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/7db01288c2.gif',
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/017d797e31.gif'
    ],
    stare: [
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/44be5e7886.gif',
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/a8a6c1ad34e.gif'
    ],
    tickle: [
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/29c1e3038c.gif',
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/a68bfb29f6.gif'
    ],
    punch: [
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/3e73b3353f.gif',
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/cb2257db20.gif'
    ],
    kick: [
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/aef80fd62e.gif',
        'https://raw.githubusercontent.com/Kone457/Nexus/main/Anime/22c76d8edc.gif'
    ]
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
// DESCARGAR Y CONVERTIR A MP4 (Infalible)
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

            const urls = REACCIONES[tipo];
            if (!urls || urls.length === 0) {
                return responder.texto(`❌ No hay GIFs para *${tipo}*.`);
            }

            const url = urls[Math.floor(Math.random() * urls.length)];

            // Descargar y convertir a MP4
            const mp4Buffer = await descargarYConvertir(url);

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