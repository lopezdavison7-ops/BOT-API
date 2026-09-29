import fetch from 'node-fetch';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { obtenerPerfil } from '../../database/perfiles.js';

const API_URL = 'https://api.delirius.online/canvas/bratanime?text=';

async function procesarSticker(buffer, userId) {
    try {
        const imagen = await loadImage(buffer);
        const canvas = createCanvas(512, 512);
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, 512, 512);

        const scale = Math.min(512 / imagen.width, 512 / imagen.height);
        const w = imagen.width * scale;
        const h = imagen.height * scale;
        const x = (512 - w) / 2;
        const y = (512 - h) / 2;

        ctx.drawImage(imagen, x, y, w, h);

        const perfil = obtenerPerfil(userId);
        const marca = perfil?.nombre || perfil?.desc || '';

        if (marca) {
            const fontSize = 24;
            ctx.font = `bold ${fontSize}px Arial`;
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';

            ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.lineWidth = 4;
            ctx.strokeText(marca, 500, 500);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fillText(marca, 500, 500);
        }

        return canvas.toBuffer('image/webp');
    } catch (error) {
        console.error('[BRATANIME] Error procesando:', error.message);
        return buffer;
    }
}

export default {
    nombre: 'bratanime',
    categoria: 'canvas',
    alias: ['brat', 'bratanime', 'animebrat'],
    descripcion: 'Genera sticker estilo brat anime con texto y marca de agua',
    uso: '.bratanime <texto>',

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        const texto = String(argumento || '').trim();
        const userId = msg.key.participant || msg.key.senderPn || msg.key.remoteJid;

        if (!texto) {
            return await responder.texto(
                '╭━━〔 🎨 𝐁𝐑𝐀𝐓 𝐀𝐍𝐈𝐄 〕━━\n' +
                '┃\n' +
                '┃ ❌ Escribe el texto\n' +
                '┃\n' +
                '┃ 💡 Ejemplos:\n' +
                '┃ ➪ .brat TWICE\n' +
                '┃ ➪ .bratanime Hello\n' +
                '┃\n' +
                '┃ 📝 Máximo 50 caracteres\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        if (texto.length > 50) {
            return await responder.texto('❌ Máximo 50 caracteres');
        }

        try {
            await responder.texto('🎨 Generando sticker...');

            const res = await fetch(API_URL + encodeURIComponent(texto), {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'image/*, application/json'
                },
                signal: AbortSignal.timeout(30000)
            });

            if (!res.ok) throw new Error('API respondió ' + res.status);

            const contentType = res.headers.get('content-type') || '';
            let buffer;

            if (contentType.includes('image')) {
                const arrayBuffer = await res.arrayBuffer();
                buffer = Buffer.from(arrayBuffer);
            } else {
                const json = await res.json();
                const imageUrl = json.url || json.data?.url || json.result?.url;

                if (!imageUrl) throw new Error('No se encontró URL de imagen');

                const imgRes = await fetch(imageUrl, {
                    signal: AbortSignal.timeout(30000)
                });

                if (!imgRes.ok) throw new Error('Error descargando imagen');

                const arrayBuffer = await imgRes.arrayBuffer();
                buffer = Buffer.from(arrayBuffer);
            }

            if (buffer.length < 500) {
                throw new Error('Imagen vacía');
            }

            const stickerBuffer = await procesarSticker(buffer, userId);

            await sock.sendMessage(jid, {
                sticker: stickerBuffer
            }, { quoted: msg });

        } catch (error) {
            console.error('[BRATANIME] Error:', error.message);
            await responder.texto('❌ Error: ' + error.message);
        }
    }
};