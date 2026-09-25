

import { spawn } from 'child_process';
import { unlink, writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

const API_BASE = 'https://api.delirius.online/canvas/bratvideo?text=';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

async function videoASticker(videoBuffer) {
    const id = randomBytes(8).toString('hex');
    const tmpVideo = join(tmpdir(), `brat_${id}.mp4`);
    const tmpSticker = join(tmpdir(), `brat_${id}.webp`);

    try {

        await writeFile(tmpVideo, videoBuffer);

        await new Promise((resolve, reject) => {
            const ffmpeg = spawn('ffmpeg', [
                '-y',
                '-i', tmpVideo,
                '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000',
                '-vcodec', 'libwebp_anim',
                '-lossless', '0',
                '-q:v', '70',
                '-preset', 'default',
                '-loop', '0',
                '-an',
                '-vsync', '0',
                tmpSticker
            ]);

            let stderr = '';
            ffmpeg.stderr.on('data', (data) => { stderr += data.toString(); });

            ffmpeg.on('close', (code) => {
                if (code !== 0) reject(new Error('ffmpeg error: ' + stderr.slice(-300)));
                else resolve();
            });

            ffmpeg.on('error', reject);
        });

        const stickerBuffer = await readFile(tmpSticker);
        return stickerBuffer;

    } finally {

        try { await unlink(tmpVideo); } catch {}
        try { await unlink(tmpSticker); } catch {}
    }
}

export default {
    nombre: 'bratv',
    categoria: 'stickers',
    alias: ['bratvideo', 'bratanimado', 'bratanimado'],
    descripcion: 'Genera un sticker ANIMADO estilo brat con texto',
    uso: '.bratv <texto>',
    ejecutar: async ({ argumento, responder, sock, msg }) => {
        const texto = String(argumento || '').trim();

        if (!texto) {
            return await responder.texto(
                '╭━━〔 💚 𝐁𝐑𝐀𝐓 𝐀𝐍𝐈𝐌𝐀𝐃𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Escribe el texto para el sticker\n' +
                '┃\n' +
                '┃ 📋 Uso:\n' +
                '┃ • .bratv hola\n' +
                '┃ • .bratv brat summer\n' +
                '┃\n' +
                '┃ 💡 Máximo 60 caracteres\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        if (texto.length > 60) {
            return await responder.texto('❌ El texto es muy largo.\nMáximo 50 caracteres.');
        }

        try {

            const apiUrl = API_BASE + encodeURIComponent(texto);
            const response = await fetch(apiUrl, {
                headers: { 'User-Agent': UA },
                signal: AbortSignal.timeout(30000)
            });

            if (!response.ok) {
                throw new Error('API respondió HTTP ' + response.status);
            }

            const videoBuffer = Buffer.from(await response.arrayBuffer());

            if (videoBuffer.length === 0) {
                throw new Error('El video vino vacío');
            }

            const stickerBuffer = await videoASticker(videoBuffer);

            if (!stickerBuffer || stickerBuffer.length === 0) {
                throw new Error('No se pudo convertir a sticker');
            }

            const chatJid = msg.key.remoteJid;
            const s = sock || global.conns?.[0];

            await s.sendMessage(
                chatJid,
                {
                    sticker: stickerBuffer,
                    isAnimated: true,
                    packname: 'BOT-API ⚡',
                    author: texto
                },
                { quoted: msg }
            );

        } catch (error) {
            console.error('[BRATV] Error:', error?.message || error);
            await responder.texto(
                '╭━━〔 ❌ 𝐁𝐑𝐀𝐓𝐕 〕━━⬣\n' +
                '┃\n' +
                '┃ No pude generar el sticker animado.\n' +
                '┃\n' +
                `┃ ⚠️ ${error?.message || 'Error desconocido'}\n` +
                '┃\n' +
                '┃ 💡 Revisa que ffmpeg esté instalado\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━'
            );
        }
    }
};