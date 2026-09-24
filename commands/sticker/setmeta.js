// commands/sticker/setmeta.js — 🏷️ Configura pack y autor de tus stickers
// ============================================================
// Separa con: |  o  •  o  /
// Guarda por número puro (no JID) para evitar conflictos lid/pn
// ============================================================

import fs from 'fs';
import path from 'path';

const RUTA_DB = path.join(process.cwd(), 'database', 'stickerMeta.json');

// ---------- BOLD UNICODE ----------
function bold(t) {
    return String(t).replace(/[A-Za-z]/g, c =>
        String.fromCodePoint((c <= 'Z' ? 0x1D400 - 65 : 0x1D41A - 97) + c.charCodeAt(0))
    );
}

// ---------- CLAVE POR NÚMERO PURO ----------
function jidANumero(jid) {
    return String(jid || '').split('@')[0].replace(/\D/g, '');
}

// ---------- BASE DE DATOS ----------
function leerDB() {
    try {
        if (!fs.existsSync(RUTA_DB)) return {};
        return JSON.parse(fs.readFileSync(RUTA_DB, 'utf8'));
    } catch (e) {
        return {};
    }
}

function guardarDB(db) {
    fs.mkdirSync(path.dirname(RUTA_DB), { recursive: true });
    fs.writeFileSync(RUTA_DB, JSON.stringify(db, null, 2), 'utf8');
}

export default {
    nombre: 'setmeta',
    categoria: 'sticker',
    alias: ['setstickermeta', 'metasticker', 'stickermeta'],
    descripcion: 'Configura el pack y autor de tus stickers',
    uso: '.setmeta Pack | Autor  (también soporta • y /)',

    ejecutar: async ({ sock, msg, argumento, responder }) => {
        const sender = msg.key.participant || msg.key.remoteJid;
        const numero = jidANumero(sender);
        const db = leerDB();
        const user = db[numero] || {};

        const currentPack = user.stickerPackName || 'BOT-API';
        const currentAuthor = user.stickerPackAuthor || 'BOT-API';

        const raw = (argumento || '').trim();

        // ---------- SIN ARGUMENTOS: mostrar info ----------
        if (!raw) {
            return await responder.texto(
                '╭━━〔 🏷️ 𝐒𝐓𝐈𝐂𝐊𝐄𝐑 𝐌𝐄𝐓𝐀 〕━━⬣\n' +
                '┃\n' +
                '┃ 📦 Pack actual: *' + currentPack + '*\n' +
                '┃ ✍️ Autor actual: *' + currentAuthor + '*\n' +
                '┃\n' +
                '┣━━〔 💡 𝐔𝐒𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ ➪ .setmeta Pack | Autor\n' +
                '┃ ➪ .setmeta Pack • Autor\n' +
                '┃ ➪ .setmeta Pack / Autor\n' +
                '┃\n' +
                '┃ 📝 Ejemplos:\n' +
                '┃ ➪ .setmeta Alex | Aguilar\n' +
                '┃ ➪ .setmeta MiPack • Kendri\n' +
                '┃ ➪ .setmeta Bot / 2026\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        // ---------- PARSEAR CON 3 SEPARADORES ----------
        const separatorIndex = raw.search(/[|•\/]/);
        let pack, author;

        if (separatorIndex === -1) {
            pack = raw.trim();
            author = '';
        } else {
            pack = raw.slice(0, separatorIndex).trim();
            author = raw.slice(separatorIndex + 1).trim();
        }

        // ---------- VALIDACIONES ----------
        if (!pack) {
            return await responder.texto(
                '╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ El nombre del pack no puede\n' +
                '┃ estar vacío.\n' +
                '┃\n' +
                '┃ 💡 Usa:\n' +
                '┃ ➪ .setmeta Pack | Autor\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        if (pack.length > 30) {
            return await responder.texto('❌ El pack es muy largo (máx 30 caracteres).');
        }
        if (author && author.length > 30) {
            return await responder.texto('❌ El autor es muy largo (máx 30 caracteres).');
        }

        // ---------- GUARDAR POR NÚMERO PURO ----------
        db[numero] = {
            stickerPackName: pack,
            stickerPackAuthor: author || currentAuthor,
            jid: sender,
            actualizadoEn: Date.now()
        };
        guardarDB(db);

        console.log('[SETMETA] Guardado para número:', numero);
        console.log(`[SETMETA] Pack: ${pack} | Autor: ${author || currentAuthor}`);

        // ---------- RESPUESTA ----------
        const authorFinal = author || currentAuthor;

        await responder.texto(
            '╭━━〔 🏷️ ' + bold('STICKER META') + ' 〕━━⬣\n' +
            '┃\n' +
            '┃ ✅ Metadatos actualizados\n' +
            '┃\n' +
            '┃ 📦 Pack: *' + pack + '*\n' +
            '┃ ✍️ Autor: *' + authorFinal + '*\n' +
            '┃\n' +
            '┃ 💡 Todos tus stickers nuevos\n' +
            '┃    tendrán estos datos\n' +
            '┃\n' +
            '┃ 🔢 Clave: ' + numero + '\n' +
            '┃\n' +
            '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
        );
    }
};