// commands/downloads/play2.js
import ytdl from '@distube/ytdl-core';
import { Readable } from 'stream';

export default {
    nombre: 'play2',
    categoria: 'Descargas',
    alias: ['videomp4', 'ytmp4v2'],
    descripcion: 'Descarga videos de YouTube (MP4) usando ytdl-core',

    async ejecutar({ sock, msg, responder, argumento }) {
        const url = String(argumento || '').trim();

        if (!url) {
            return responder.texto(
                `❌ *PLAY2*\n\nPega un enlace de YouTube válido.\n\n📌 Ejemplo:\n*.play2 https://youtube.com/watch?v=...*`
            );
        }

        if (!ytdl.validateURL(url)) {
            return responder.texto('❌ *PLAY2*\n\nURL de YouTube no válida.');
        }

        try {
            // Mensaje de espera
            await responder.texto('⏳ *DESCARGANDO...*\n\n⏬ Obteniendo video de YouTube...');

            // Descargar el video directamente con ytdl-core
            const info = await ytdl.getInfo(url);
            const stream = ytdl(url, {
                quality: 'highestvideo',
                filter: 'videoandaudio'
            });

            // Convertir stream a buffer
            const chunks = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }
            const buffer = Buffer.concat(chunks);

            // Enviar el video MP4
            const caption = `
╭〔 🎬 𝐏𝐋𝐀𝐘𝟐 〕⬣
┃
┃ 🎬 Título: ${info.videoDetails.title}
┃
┃ ⏱️ Duración: ${info.videoDetails.lengthSeconds} segundos
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣
`;

            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    video: buffer,
                    mimetype: 'video/mp4',
                    caption
                },
                { quoted: msg }
            );

        } catch (error) {
            console.error('[PLAY2] Error:', error?.message || error);
            await responder.texto(
                `❌ *PLAY2*\n\nNo se pudo descargar el video.\n\n⚠️ ${error?.message || 'Error desconocido'}`
            );
        }
    }
};