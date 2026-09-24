// commands/sticker/setmeta.js — 🏷️ Configura pack y autor de tus stickers
import fs from 'fs';
import path from 'path';

const RUTA_DB = path.join(process.cwd(), 'database', 'stickerMeta.json');

// ---------- BOLD UNICODE ----------
function bold(t) {
    return String(t).replace(/[A-Za-z]/g, c =>
        String.fromCodePoint((c <= 'Z' ? 0x1D400 - 65 : 0x1D41A - 97) + c.charCodeAt(0))
    );
}

// ---------- CLAVE POR NÚMERO PURO (evita mismatch lid/pn) ----------
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
    alias: ['metasticker', 'stickermeta'],
    descripcion: 'Configura el pack y autor de tus stickers',
    uso: '.setmeta Pack | Autor',
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
                '╭━━〔 🏷️ 𝐓𝐈𝐂𝐊𝐄𝐑 𝐌𝐄𝐓𝐀 〕━━⬣\n' +
                '┃\n' +
                '┃ 📦 Pack actual: *' + currentPack + '*\n' +
                '┃ ✍️ Autor actual: *' + currentAuthor + '*\n' +
                '┃\n' +
                '┣━━〔 💡 𝐔𝐒𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ ➪ .setmeta Pack | Autor\n' +
                '┃\n' +
                '┃ 📝 Ejemplo:\n' +
                '┃ ➪ .setmeta Alex | ⚡BOT-API💻\n' +
                '┃\n' +
                '╰━━〔  𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        // ---------- PARSEAR ----------
        const partes = raw.split('|').map(s => s.trim());
        const pack = partes[0] || '';
        const author = partes[1] || '';

        if (!pack || !author) {
            return await responder.texto(
                '╭━━〔  𝐅𝐎𝐑𝐌𝐀𝐓𝐎 𝐈𝐍𝐂𝐎𝐑𝐑𝐄𝐂𝐓𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ 📋 Usa el separador | entre pack y autor:\n' +
                '┃\n' +
                '┃ ➪ .setmeta Pack | Autor\n' +
                '┃ ➪ .setmeta Alex | ⚡BOT-API💻\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        if (pack.length > 30) {
            return await responder.texto('❌ El pack es muy largo (máx 30 caracteres).');
        }
        if (author.length > 30) {
            return await responder.texto('❌ El autor es muy largo (máx 30 caracteres).');
        }

        // ---------- GUARDAR POR NÚMERO PURO ----------
        db[numero] = {
            stickerPackName: pack,
            stickerPackAuthor: author,
            jid: sender,
            actualizadoEn: Date.now()
        };
        guardarDB(db);

        console.log('[SETMETA] Guardado para número:', numero);

        await responder.texto(
            '╭━━〔 🏷️ 𝐓𝐈𝐂𝐊𝐄𝐑 𝐌𝐄𝐓𝐀 〕━━⬣\n' +
            '┃\n' +
            '┃ ✅ Metadatos actualizados\n' +
            '┃\n' +
            '┃ 📦 Pack: *' + pack + '*\n' +
            '┃ ✍️ Autor: *' + author + '*\n' +
            '┃\n' +
            '┃ 💡 Todos tus stickers nuevos\n' +
            '┃    tendrán estos datos\n' +
            '┃\n' +
            '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
        );
    }
};