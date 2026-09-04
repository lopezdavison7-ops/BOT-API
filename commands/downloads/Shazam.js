// ============================================================
// BOT-API
// COMANDO: SHAZAM
// ============================================================
// Identifica canciones desde un audio o video citado.
// Usa el scraper ubicado en:
// controllers/shazamScraper.js
//
// Comandos:
// .shazam
// .whatsong
// .findsong
// .find
//
// Uso:
// Responde a un audio o video con .shazam
// ============================================================

import { downloadMediaMessage } from 'baileys';
import { identifySong } from '../../controllers/shazamScraper.js';

export default {
    nombre: 'shazam',
    categoria: 'Multimedia',

    alias: [
        'whatsong',
        'findsong',
        'find'
    ],

    descripcion: 'Identifica una canción desde un audio o video citado.',

    async ejecutar({ sock, msg, prefijo }) {
        const remoteJid = msg?.key?.remoteJid;

        if (!remoteJid) return;

        // --------------------------------------------------------
        // Obtener mensaje citado
        // --------------------------------------------------------

        const contextInfo =
            msg.message?.extendedTextMessage?.contextInfo ||
            msg.message?.imageMessage?.contextInfo ||
            msg.message?.videoMessage?.contextInfo ||
            msg.message?.documentMessage?.contextInfo;

        const quotedMsg = contextInfo?.quotedMessage;

        if (!quotedMsg) {
            await sock.sendMessage(
                remoteJid,
                {
                    text:
                        `╭〔 🎵 𝐒𝐇𝐀𝐙𝐀𝐌 〕━⬣\n\n` +
                        `┃ ❗ Responde a un audio o video\n` +
                        `┃ con ${prefijo}shazam.\n\n` +
                        `╰━━〔 ⚡ 𝐒𝐘𝐒𝐓𝐄𝐌 〕━━⬣`
                },
                { quoted: msg }
            );

            return;
        }

        // --------------------------------------------------------
        // Desenrollar mensajes de WhatsApp
        // --------------------------------------------------------

        function unwrapMessage(message) {
            if (!message) return null;

            // Audio directo
            if (message.audioMessage) {
                return message;
            }

            // Video directo
            if (message.videoMessage) {
                return message;
            }

            // Documento que realmente sea audio/video
            if (message.documentMessage) {
                const mimetype =
                    message.documentMessage.mimetype || '';

                if (
                    mimetype.startsWith('audio/') ||
                    mimetype.startsWith('video/')
                ) {
                    return message;
                }
            }

            // View Once
            if (message.viewOnceMessage?.message) {
                return unwrapMessage(
                    message.viewOnceMessage.message
                );
            }

            // View Once V2
            if (message.viewOnceMessageV2?.message) {
                return unwrapMessage(
                    message.viewOnceMessageV2.message
                );
            }

            // Mensaje efímero
            if (message.ephemeralMessage?.message) {
                return unwrapMessage(
                    message.ephemeralMessage.message
                );
            }

            // Documento con caption
            if (message.documentWithCaptionMessage?.message) {
                return unwrapMessage(
                    message.documentWithCaptionMessage.message
                );
            }

            return null;
        }

        const target = unwrapMessage(quotedMsg);

        if (!target) {
            await sock.sendMessage(
                remoteJid,
                {
                    text:
                        `╭〔 ⚠️ 𝐒𝐇𝐀𝐙𝐀𝐌 〕━⬣\n\n` +
                        `┃ ❗ El mensaje citado no contiene\n` +
                        `┃ un audio o video válido.\n\n` +
                        `╰━━〔 ⚡ 𝐒𝐘𝐒𝐓𝐄𝐌 〕━━⬣`
                },
                { quoted: msg }
            );

            return;
        }

        // --------------------------------------------------------
        // Reacción de procesamiento
        // --------------------------------------------------------

        try {
            await sock.sendMessage(
                remoteJid,
                {
                    react: {
                        text: '⏳',
                        key: msg.key
                    }
                }
            );
        } catch {}

        try {
            // ----------------------------------------------------
            // Construir mensaje para Baileys
            // ----------------------------------------------------

            const participant = contextInfo?.participant;

            const botNumber =
                sock?.user?.id
                    ?.split(':')[0]
                    ?.split('@')[0];

            const participantNumber =
                participant
                    ?.split(':')[0]
                    ?.split('@')[0];

            const fromMe =
                Boolean(
                    botNumber &&
                    participantNumber &&
                    botNumber === participantNumber
                );

            const downloadMsg = {
                key: {
                    remoteJid,
                    id: contextInfo?.stanzaId,
                    fromMe,
                    ...(participant
                        ? { participant }
                        : {})
                },
                message: target
            };

            // ----------------------------------------------------
            // Descargar audio/video
            // ----------------------------------------------------

            const buffer = await downloadMediaMessage(
                downloadMsg,
                'buffer',
                {},
                {
                    logger: console
                }
            );

            if (!buffer || buffer.length === 0) {
                throw new Error(
                    'No se pudo descargar el audio o video.'
                );
            }

            // ----------------------------------------------------
            // Identificar canción
            // ----------------------------------------------------

            const track = await identifySong(
                buffer,
                {
                    seconds: 60
                }
            );

            if (!track) {
                throw new Error(
                    'No se encontraron coincidencias.'
                );
            }

            // ----------------------------------------------------
            // Datos obtenidos
            // ----------------------------------------------------

            const title =
                track.title ||
                'Desconocido';

            const artist =
                track.artist ||
                'Desconocido';

            const album =
                track.album ||
                'Desconocido';

            const genre =
                track.genre ||
                'Desconocido';

            const releaseDate =
                track.releaseDate ||
                'Desconocida';

            const label =
                track.label ||
                'Desconocida';

            // ----------------------------------------------------
            // Diseño BOT-API
            // ----------------------------------------------------

            let texto =
                `╭〔 🖥️ 𝐓𝐄𝐑𝐌𝐈𝐍𝐀𝐋 𝐄𝐗𝐄𝐂 〕━⬣\n\n`;

            texto +=
                `┃ 🎵 𝐒𝐇𝐀𝐙𝐀𝐌 𝐑𝐄𝐒𝐔𝐋𝐓\n\n`;

            texto +=
                `┃ ➥ *${title}*\n\n`;

            texto +=
                `┣━━━━━━━━━━━━⬣\n`;

            texto +=
                `┃ > 🎤 𝐀𝐫𝐭𝐢𝐬𝐭𝐚 › ${artist}\n`;

            texto +=
                `┃ > 💿 𝐀́𝐥𝐛𝐮𝐦 › ${album}\n`;

            texto +=
                `┃ > 🎼 𝐆𝐞́𝐧𝐞𝐫𝐨 › ${genre}\n`;

            texto +=
                `┃ > 📅 𝐅𝐞𝐜𝐡𝐚 › ${releaseDate}\n`;

            texto +=
                `┃ > 🏷️ 𝐒𝐞𝐥𝐥𝐨 › ${label}\n\n`;

            texto +=
                `╰━━〔 ⚡ 𝐒𝐘𝐒𝐓𝐄𝐌 𝐀𝐂𝐓𝐈𝐕𝐄 〕━━⬣`;

            // ----------------------------------------------------
            // Enviar resultado
            // ----------------------------------------------------

            if (track.coverArt) {
                await sock.sendMessage(
                    remoteJid,
                    {
                        image: {
                            url: track.coverArt
                        },
                        caption: texto
                    },
                    {
                        quoted: msg
                    }
                );
            } else {
                await sock.sendMessage(
                    remoteJid,
                    {
                        text: texto
                    },
                    {
                        quoted: msg
                    }
                );
            }

            // ----------------------------------------------------
            // Reacción correcta
            // ----------------------------------------------------

            try {
                await sock.sendMessage(
                    remoteJid,
                    {
                        react: {
                            text: '✅',
                            key: msg.key
                        }
                    }
                );
            } catch {}

        } catch (error) {

            console.error(
                '[SHAZAM] Error:',
                error
            );

            try {
                await sock.sendMessage(
                    remoteJid,
                    {
                        react: {
                            text: '❌',
                            key: msg.key
                        }
                    }
                );
            } catch {}

            await sock.sendMessage(
                remoteJid,
                {
                    text:
                        `╭〔 ❌ 𝐒𝐇𝐀𝐙𝐀𝐌 𝐄𝐑𝐑𝐎𝐑 〕━⬣\n\n` +
                        `┃ No pude identificar la canción.\n\n` +
                        `┃ ➥ ${
                            error?.message ||
                            'Sin coincidencias.'
                        }\n\n` +
                        `╰━━〔 ⚡ 𝐒𝐘𝐒𝐓𝐄𝐌 〕━━⬣`
                },
                {
                    quoted: msg
                }
            );
        }
    }
};