

import path from 'path';
import { obtenerStore, guardarStore } from './jsonStore.js';

const FILE = path.join(process.cwd(), 'database', 'antilink.json');

function cargar() {
    return obtenerStore(FILE, {});
}

function guardar() {
    guardarStore(FILE);
}

export function estaActivo(chatId) {
    const db = cargar();
    return Boolean(db[chatId]?.activo);
}

export function activar(chatId) {
    const db = cargar();

    db[chatId] = {
        activo: true,
        actualizadoEn: Date.now()
    };

    guardar();
}

export function desactivar(chatId) {
    const db = cargar();

    db[chatId] = {
        activo: false,
        actualizadoEn: Date.now()
    };

    guardar();
}

function obtenerTexto(msg) {
    const message = msg?.message;

    if (!message) return '';

    return (
        message.conversation ||
        message.extendedTextMessage?.text ||
        message.imageMessage?.caption ||
        message.videoMessage?.caption ||
        message.documentMessage?.caption ||
        message.buttonsResponseMessage?.selectedDisplayText ||
        message.listResponseMessage?.title ||
        ''
    );
}

export function contieneEnlaceWhatsApp(texto) {
    if (!texto) return false;

    const textoNormalizado =
        String(texto)
            .toLowerCase()
            .replace(/[()[\]{}<>]/g, ' ');

    const patrones = [

        /chat\.whatsapp\.com\/[a-z0-9]+/i,

        /wa\.me\/[^\s]+/i,

        /api\.whatsapp\.com\/[^\s]+/i,

        /(?:https?:\/\/)?(?:www\.)?whatsapp\.com\/[^\s]+/i,

        /(?:https?:\/\/)?(?:www\.)?whatsapp\.net\/[^\s]+/i

    ];

    return patrones.some(
        patron => patron.test(textoNormalizado)
    );
}

export async function revisarAntilink(
    sock,
    msg,
    esAdmin = false
) {
    try {

        if (!msg?.key) return false;

        if (msg.key.fromMe) return false;

        const chatId =
            msg.key.remoteJid;

        if (!chatId?.endsWith('@g.us')) {
            return false;
        }

        if (!estaActivo(chatId)) {
            return false;
        }

        if (esAdmin) {
            return false;
        }

        const texto =
            obtenerTexto(msg);

        if (!contieneEnlaceWhatsApp(texto)) {
            return false;
        }

        await sock.sendMessage(
            chatId,
            {
                delete: msg.key
            }
        );

        const participante =
            msg.key.participantAlt ||
            msg.key.participant ||
            '';

        const mention =
            participante.includes('@')
                ? participante
                : null;

        const nombre =
            msg.pushName ||
            'Usuario';

        const aviso =
            mention
                ? `╭〔 🚫 𝐀𝐍𝐓𝐈𝐋𝐈𝐍𝐊 〕⬣
┃
┃ 👤 @${mention.split('@')[0]}
┃
┃ 🔗 Solo se permiten enlaces
┃ que no sean de WhatsApp.
┃
┃ 🗑️ Tu mensaje fue eliminado.
┃
╰━━━━━━━━━━━━━━━━⬣`
                : `╭〔 🚫 𝐀𝐍𝐓𝐈𝐋𝐈𝐍𝐊 〕⬣
┃
┃ 👤 ${nombre}
┃
┃ 🔗 Los enlaces de WhatsApp
┃ no están permitidos.
┃
┃ 🗑️ Tu mensaje fue eliminado.
┃
╰━━━━━━━━━━━━━━━━⬣`;

        await sock.sendMessage(
            chatId,
            {
                text: aviso,
                ...(mention
                    ? { mentions: [mention] }
                    : {})
            }
        );

        return true;

    } catch (error) {

        console.error(
            '[ANTILINK] Error:',
            error?.message || error
        );

        return false;
    }
}