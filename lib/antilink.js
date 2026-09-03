// ============================================================
// BOT-API
// ANTILINK — SOLO WHATSAPP
// ============================================================

import fs from 'fs';
import path from 'path';

const DATABASE_DIR = path.join(process.cwd(), 'database');
const FILE = path.join(DATABASE_DIR, 'antilink.json');

function asegurarArchivo() {
    if (!fs.existsSync(DATABASE_DIR)) {
        fs.mkdirSync(DATABASE_DIR, { recursive: true });
    }

    if (!fs.existsSync(FILE)) {
        fs.writeFileSync(FILE, '{}', 'utf8');
    }
}

function cargar() {
    asegurarArchivo();

    try {
        const data = JSON.parse(
            fs.readFileSync(FILE, 'utf8')
        );

        return data &&
            typeof data === 'object' &&
            !Array.isArray(data)
            ? data
            : {};

    } catch {
        return {};
    }
}

function guardar(data) {
    asegurarArchivo();

    fs.writeFileSync(
        FILE,
        JSON.stringify(data, null, 2),
        'utf8'
    );
}

// ============================================================
// ESTADO
// ============================================================

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

    guardar(db);
}

export function desactivar(chatId) {
    const db = cargar();

    db[chatId] = {
        activo: false,
        actualizadoEn: Date.now()
    };

    guardar(db);
}

// ============================================================
// EXTRAER TEXTO
// ============================================================

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

// ============================================================
// DETECTOR — ÚNICAMENTE WHATSAPP
// ============================================================

export function contieneEnlaceWhatsApp(texto) {
    if (!texto) return false;

    const textoNormalizado =
        String(texto)
            .toLowerCase()
            .replace(/[()[\]{}<>]/g, ' ');

    const patrones = [

        // Invitaciones de grupos
        /chat\.whatsapp\.com\/[a-z0-9]+/i,

        // wa.me
        /wa\.me\/[^\s]+/i,

        // WhatsApp API
        /api\.whatsapp\.com\/[^\s]+/i,

        // WhatsApp normal
        /(?:https?:\/\/)?(?:www\.)?whatsapp\.com\/[^\s]+/i,

        // Dominios internos de WhatsApp
        /(?:https?:\/\/)?(?:www\.)?whatsapp\.net\/[^\s]+/i

    ];

    return patrones.some(
        patron => patron.test(textoNormalizado)
    );
}

// ============================================================
// DETECTAR Y ELIMINAR
// ============================================================

export async function revisarAntilink(
    sock,
    msg,
    esAdmin = false
) {
    try {

        if (!msg?.key) return false;

        // No procesar mensajes del propio bot
        if (msg.key.fromMe) return false;

        const chatId =
            msg.key.remoteJid;

        // Solo grupos
        if (!chatId?.endsWith('@g.us')) {
            return false;
        }

        // AntiLink apagado
        if (!estaActivo(chatId)) {
            return false;
        }

        // Los administradores pueden enviar enlaces
        if (esAdmin) {
            return false;
        }

        const texto =
            obtenerTexto(msg);

        // No es enlace de WhatsApp
        if (!contieneEnlaceWhatsApp(texto)) {
            return false;
        }

        // ====================================================
        // ELIMINAR MENSAJE
        // ====================================================

        await sock.sendMessage(
            chatId,
            {
                delete: msg.key
            }
        );

        // ====================================================
        // IDENTIFICAR USUARIO
        // ====================================================

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