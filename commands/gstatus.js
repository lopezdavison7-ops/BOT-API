// commands/gstatus.js
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATUS_LOG_FILE = path.join(process.cwd(), 'database', 'statuslog.json');

export default {
    nombre: 'gstatus',
    categoria: 'Utilidades',
    alias: ['gst', 'estado', 'upstatus'],
    descripcion: 'Publica contenido como "estado" en el grupo',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {
            // Verificar que sea en un grupo
            if (!msg.key.remoteJid.endsWith('@g.us')) {
                await responder.texto('❌ Este comando solo funciona en grupos.');
                return;
            }

            const groupId = msg.key.remoteJid;

            // 1. LEER REGISTRO
            let statusLog = {};
            try {
                const data = await fs.readFile(STATUS_LOG_FILE, 'utf8');
                statusLog = JSON.parse(data);
            } catch {}

            const today = new Date().toDateString();
            const userJid = msg.key.participant || msg.key.remoteJid;

            // 2. LÍMITE DIARIO
            if (!statusLog[userJid]) statusLog[userJid] = {};
            if (!statusLog[userJid][today]) statusLog[userJid][today] = 0;

            if (statusLog[userJid][today] >= 10) {
                await responder.texto(`❌ Límite diario alcanzado (10 usos).`);
                return;
            }

            // 3. TIEMPO ENTRE USOS
            const lastTime = statusLog[userJid].lastTime || 0;
            const now = Date.now();
            if (now - lastTime < 5000) {
                await responder.texto(`⏳ Espera 5 segundos.`);
                return;
            }

            // 4. OBTENER CONTENIDO
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const textoEscrito = String(argumento || '').trim();

            let mensajeRespuesta = '';

            // ✅ CASO 1: Solo texto
            if (!quotedMsg && textoEscrito) {
                await sock.sendMessage(groupId, {
                    text: `📢 *ESTADO DEL GRUPO*\n\n${textoEscrito}`
                });
                mensajeRespuesta = `✅ Estado de texto publicado en el grupo.`;
            }

            // ✅ CASO 2: Imagen
            else if (quotedMsg?.imageMessage) {
                const imgBuffer = quotedMsg.imageMessage.file;
                if (!imgBuffer) throw new Error('No se pudo obtener la imagen.');
                await sock.sendMessage(groupId, {
                    image: imgBuffer,
                    caption: `📢 *ESTADO DEL GRUPO*\n\n${textoEscrito || '📸 Imagen'}`
                });
                mensajeRespuesta = `✅ Imagen publicada como estado en el grupo.`;
            }

            // ✅ CASO 3: Video
            else if (quotedMsg?.videoMessage) {
                const vidBuffer = quotedMsg.videoMessage.file;
                if (!vidBuffer) throw new Error('No se pudo obtener el video.');
                await sock.sendMessage(groupId, {
                    video: vidBuffer,
                    caption: `📢 *ESTADO DEL GRUPO*\n\n${textoEscrito || '🎥 Video'}`
                });
                mensajeRespuesta = `✅ Video publicado como estado en el grupo.`;
            }

            // ✅ CASO 4: Audio
            else if (quotedMsg?.audioMessage) {
                const audBuffer = quotedMsg.audioMessage.file;
                if (!audBuffer) throw new Error('No se pudo obtener el audio.');
                await sock.sendMessage(groupId, {
                    audio: audBuffer,
                    mimetype: quotedMsg.audioMessage.mimetype || 'audio/mpeg'
                });
                mensajeRespuesta = `✅ Audio publicado como estado en el grupo.`;
            }

            // ✅ CASO 5: Sticker
            else if (quotedMsg?.stickerMessage) {
                const stkBuffer = quotedMsg.stickerMessage.file;
                if (!stkBuffer) throw new Error('No se pudo obtener el sticker.');
                await sock.sendMessage(groupId, {
                    sticker: stkBuffer
                });
                mensajeRespuesta = `✅ Sticker publicado como estado en el grupo.`;
            }

            // ❌ Si no se pudo hacer nada
            else {
                await responder.texto(
                    `❌ *GSTATUS*\n\n` +
                    `Usa: *.gstatus texto* o responde a una foto/video/audio/sticker con *.gstatus*`
                );
                return;
            }

            // 5. ACTUALIZAR REGISTRO
            statusLog[userJid][today] += 1;
            statusLog[userJid].lastTime = now;
            await fs.writeFile(STATUS_LOG_FILE, JSON.stringify(statusLog, null, 2));

            // 6. RESPONDER
            await responder.texto(mensajeRespuesta);

        } catch (error) {
            console.error('[GSTATUS] Error:', error);
            await responder.texto('❌ Error al publicar en el grupo.');
        }
    }
};