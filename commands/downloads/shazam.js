// ============================================================
// BOT-API
// COMANDO: SHAZAM
// Identifica una canción desde un audio o video citado.
// ============================================================

import { downloadMediaMessage } from 'baileys';
import { identifySong } from '../../controllers/shazamScraper.js';

function obtenerContextInfo(message) {
    return (
        message?.message?.extendedTextMessage?.contextInfo ||
        message?.message?.imageMessage?.contextInfo ||
        message?.message?.videoMessage?.contextInfo ||
        message?.message?.documentMessage?.contextInfo ||
        message?.message?.audioMessage?.contextInfo ||
        message?.message?.viewOnceMessageV2?.message?.extendedTextMessage?.contextInfo ||
        message?.message?.viewOnceMessage?.message?.extendedTextMessage?.contextInfo ||
        null
    );
}

function unwrapMessage(message) {
    if (!message) return null;

    if (
        message.audioMessage ||
        message.videoMessage ||
        message.documentMessage
    ) {
        return message;
    }

    if (message.viewOnceMessageV2?.message) {
        return unwrapMessage(message.viewOnceMessageV2.message);
    }

    if (message.viewOnceMessage?.message) {
        return unwrapMessage(message.viewOnceMessage.message);
    }

    if (message.ephemeralMessage?.message) {
        return unwrapMessage(message.ephemeralMessage.message);
    }

    if (message.documentWithCaptionMessage?.message) {
        return unwrapMessage(message.documentWithCaptionMessage.message);
    }

    return null;
}

function obtenerJidRemitente(contextInfo, msg) {
    return (
        contextInfo?.participant ||
        contextInfo?.participantAlt ||
        msg?.key?.participant ||
        msg?.key?.remoteJid
    );
}

export default {
    nombre: 'shazam',
    categoria: 'Multimedia',
    alias: ['whatsong', 'findsong', 'find'],
    descripcion: 'Identifica una canción desde un audio o video citado.',

    async ejecutar({ sock, msg }) {
        const remoteJid = msg?.key?.remoteJid;

        if (!remoteJid) return;

        const contextInfo = obtenerContextInfo(msg);
        const quotedMsg = contextInfo?.quotedMessage;

        if (!quotedMsg) {
            return await sock.sendMessage(
                remoteJid,
                { text: '❗ Responde a un audio o video con .shazam.' },
                { quoted: msg }
            );
        }

        const target = unwrapMessage(quotedMsg);

        if (!target) {
            return await sock.sendMessage(
                remoteJid,
                { text: '❗ El mensaje citado no contiene un audio o video válido.' },
                { quoted: msg }
            );
        }

        await sock.sendMessage(remoteJid, {
            react: { text: '⏳', key: msg.key }
        });

        try {
            const sender = obtenerJidRemitente(contextInfo, msg);
            const botJid = sock?.user?.id || '';
            const botNumero = botJid.split(':')[0];

            const downloadMsg = {
                key: {
                    remoteJid,
                    id: contextInfo?.stanzaId,
                    participant: sender,
                    participantAlt: contextInfo?.participantAlt,
                    fromMe: Boolean(
                        contextInfo?.participant &&
                        contextInfo.participant.split(':')[0] === botNumero
                    )
                },
                message: target
            };

            const buffer = await downloadMediaMessage(
                downloadMsg,
                'buffer',
                {},
                { logger: console }
            );

            if (!buffer || buffer.length === 0) {
                throw new Error('No se pudo descargar el archivo.');
            }

            const track = await identifySong(buffer, {
                seconds: 60
            });

            const title = track.title || 'Desconocido';
            const artist = track.artist || 'Desconocido';
            const album = track.album || 'Desconocido';
            const genre = track.genre || 'Desconocido';
            const releaseDate = track.releaseDate || 'Desconocida';
            const label = track.label || 'Desconocida';

            const texto = `╭〔 🖥️ 𝐓𝐄𝐑𝐌𝐈𝐍𝐀𝐋 𝐄𝐗𝐄𝐂 〕━⬣

┃ 🎵 𝐒𝐇𝐀𝐙𝐀𝐌 𝐑𝐄𝐒𝐔𝐋𝐓

┃ ➥ *${title}*

┣━━━━━━━━━━━━⬣
┃ > 🎤 𝐀𝐫𝐭𝐢𝐬𝐭𝐚 › ${artist}
┃ > 💿 𝐀́𝐥𝐛𝐮𝐦 › ${album}
┃ > 🎼 𝐆𝐞́𝐧𝐞𝐫𝐨 › ${genre}
┃ > 📅 𝐅𝐞𝐜𝐡𝐚 › ${releaseDate}
┃ > 🏷️ 𝐒𝐞𝐥𝐥𝐨 › ${label}

╰━━〔 ⚡ 𝐒𝐘𝐒𝐓𝐄𝐌 𝐀𝐂𝐓𝐈𝐕𝐄 〕━━⬣`;

            if (track.coverArt) {
                await sock.sendMessage(
                    remoteJid,
                    {
                        image: { url: track.coverArt },
                        caption: texto
                    },
                    { quoted: msg }
                );
            } else {
                await sock.sendMessage(
                    remoteJid,
                    { text: texto },
                    { quoted: msg }
                );
            }

            await sock.sendMessage(remoteJid, {
                react: { text: '✅', key: msg.key }
            });
        } catch (error) {
            console.error('[SHAZAM] Error:', error);

            await sock.sendMessage(remoteJid, {
                react: { text: '❌', key: msg.key }
            });

            await sock.sendMessage(
                remoteJid,
                {
                    text: `❌ Error al identificar: ${error?.message || 'No se encontró coincidencia.'}`
                },
                { quoted: msg }
            );
        }
    }
};
