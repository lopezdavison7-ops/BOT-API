// ============================================================
// FOTO DEL MENÚ - SOLO OWNER
// Uso:
// 1. Cita una imagen y escribe .fotomenu
// 2. Envía una imagen con el texto .fotomenu
// ============================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { downloadMediaMessage } from 'baileys';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RUTA_FOTO = path.join(
    __dirname,
    '..',
    'media',
    'menu',
    'menu.jpg'
);

export default {
    nombre: 'fotomenu',
    categoria: 'Owner',
    alias: ['menufoto'],
    descripcion: 'Cambia la imagen del menú',
    owner: true,

    async ejecutar({ sock, msg, responder }) {
        try {
            let mensajeImagen = null;

            // ====================================================
            // IMAGEN ENVIADA DIRECTAMENTE
            // ====================================================

            if (msg.message?.imageMessage) {
                mensajeImagen = msg;
            }

            // ====================================================
            // IMAGEN CITADA
            // ====================================================

            if (!mensajeImagen) {
                const contexto =
                    msg.message?.extendedTextMessage?.contextInfo;

                if (contexto?.quotedMessage?.imageMessage) {
                    mensajeImagen = {
                        key: {
                            remoteJid: msg.key.remoteJid,
                            id: contexto.stanzaId,
                            fromMe: false,
                            participant: contexto.participant
                        },
                        message: contexto.quotedMessage
                    };
                }
            }

            // ====================================================
            // COMPROBAR IMAGEN
            // ====================================================

            if (!mensajeImagen) {
                await responder.texto(
                    '🖼️ *FOTO DEL MENÚ*\n\n' +
                    'Por favor, envía o cita una imagen junto con:\n\n' +
                    '*.fotomenu*\n\n' +
                    'Ejemplo:\n' +
                    'Cita una imagen → *.fotomenu*'
                );

                return;
            }

            await responder.texto(
                '⏳ Guardando la nueva foto del menú...'
            );

            // ====================================================
            // DESCARGAR IMAGEN
            // ====================================================

            const buffer = await downloadMediaMessage(
                mensajeImagen,
                'buffer',
                {},
                {
                    reuploadRequest: sock.updateMediaMessage
                }
            );

            if (!buffer || !buffer.length) {
                throw new Error(
                    'No se pudo descargar la imagen.'
                );
            }

            // ====================================================
            // CREAR CARPETA SI NO EXISTE
            // ====================================================

            fs.mkdirSync(
                path.dirname(RUTA_FOTO),
                { recursive: true }
            );

            // ====================================================
            // GUARDAR IMAGEN
            // ====================================================

            fs.writeFileSync(
                RUTA_FOTO,
                buffer
            );

            await responder.texto(
                '✅ *Foto del menú actualizada.*\n\n' +
                'La nueva imagen se utilizará cuando abras *.menu*.'
            );

        } catch (error) {
            console.error(
                '[FOTOMENU]',
                error
            );

            await responder.texto(
                '❌ No pude guardar la foto del menú.\n\n' +
                `Error: ${error.message}`
            );
        }
    }
};
