// commands/sticker/setmeta.js — 🏷️ Configura pack y autor de tus stickers
import fs from 'fs';
import path from 'path';

const RUTA_DB = path.join(process.cwd(), 'database', 'stickerMeta.json');

// ---------- BOLD UNICODE ----------
function bold(t) {
    return String(t).replace(/[A-Za-zÁÉÍÓÚáéíóúÑñ]/g, c => {
        const map = {
            'A':'𝐀','B':'𝐁','C':'𝐂','D':'𝐃','E':'𝐄','F':'𝐅','G':'𝐆','H':'𝐇','I':'𝐈','J':'𝐉','K':'𝐊','L':'𝐋','M':'𝐌','N':'𝐍','O':'𝐎','P':'𝐏','Q':'𝐐','R':'𝐑','S':'𝐒','T':'𝐓','U':'𝐔','V':'𝐕','W':'𝐖','X':'𝐗','Y':'𝐘','Z':'𝐙',
            'a':'𝐚','b':'𝐛','c':'𝐜','d':'𝐝','e':'𝐞','f':'𝐟','g':'𝐠','h':'𝐡','i':'𝐢','j':'𝐣','k':'𝐤','l':'𝐥','m':'𝐦','n':'𝐧','o':'𝐨','p':'𝐩','q':'𝐪','r':'𝐫','s':'𝐬','t':'𝐭','u':'𝐮','v':'𝐯','w':'𝐰','x':'𝐱','y':'𝐲','z':'𝐳',
            'Á':'𝐀','É':'𝐄','Í':'𝐈','Ó':'𝐎','Ú':'𝐔','á':'𝐚','é':'𝐞','í':'𝐢','ó':'𝐨','ú':'𝐮','Ñ':'𝐍','ñ':'𝐧'
        };
        return map[c] || c;
    });
}

// ---------- BASE DE DATOS DE METADATOS ----------
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
    alias: ['metasticker', 'stickermeta', 'stickermeta'],
    descripcion: 'Configura el pack y autor de tus stickers',
    uso: '.setmeta Pack | Autor',
    ejecutar: async ({ sock, msg, argumento, responder }) => {
        const sender = msg.key.participant || msg.key.remoteJid;
        const db = leerDB();
        const user = db[sender] || {};

        const currentPack = user.stickerPackName || 'BOT-API';
        const currentAuthor = user.stickerPackAuthor || 'BOT-API';

        const raw = (argumento || '').trim();

        // ---------- SIN ARGUMENTOS: mostrar info ----------
        if (!raw) {
            return await responder.texto(
                '╭〔 ⚙️ ' + bold('AURA REED') + ' 〕⬣\n' +
                '┃ 🏷️ ' + bold('STICKER METADATA') + '\n' +
                '╰━━━━━━━━━━━━⬣\n\n' +
                '┃ 📦 Pack: ' + currentPack + '\n' +
                '┃ ✍️ Autor: ' + currentAuthor + '\n\n' +
                '┣━━━━━━━━━━━━⬣\n\n' +
                '┃ ➪ .setmeta Pack | Autor\n' +
                '┃ ✦ Configura tus metadatos\n\n' +
                '╰〔 ⚡ ' + bold('SYSTEM') + ' 〕⬣'
            );
        }

        // ---------- PARSEAR PACK Y AUTOR ----------
        const partes = raw.split('|').map(s => s.trim());
        const pack = partes[0] || '';
        const author = partes[1] || '';

        if (!pack || !author) {
            return await responder.texto(
                '╭〔 ❌ ' + bold('ERROR') + ' 〕⬣\n' +
                '┃\n' +
                '┃  Formato correcto:\n' +
                '┃ ➪ .setmeta Pack | Autor\n' +
                '┃\n' +
                '┃ 💡 Ejemplo:\n' +
                '┃ ➪ .setmeta MiPack | @RHLM\n' +
                '┃\n' +
                '╰〔 ⚡ ' + bold('SYSTEM') + ' 〕⬣'
            );
        }

        // ---------- VALIDACIONES ----------
        if (pack.length > 30) {
            return await responder.texto('❌ El nombre del pack es muy largo (máx 30 caracteres).');
        }
        if (author.length > 30) {
            return await responder.texto('❌ El nombre del autor es muy largo (máx 30 caracteres).');
        }

        // ---------- GUARDAR ----------
        if (!db[sender]) db[sender] = {};
        db[sender].stickerPackName = pack;
        db[sender].stickerPackAuthor = author;
        db[sender].actualizadoEn = Date.now();
        guardarDB(db);

        await responder.texto(
            '╭〔 ✅ ' + bold('AURA REED') + ' 〕⬣\n' +
            '┃ 🏷️ ' + bold('METADATOS ACTUALIZADOS') + '\n' +
            '╰━━━━━━━━━━━━⬣\n\n' +
            '┃ 📦 Pack: *' + pack + '*\n' +
            '┃ ✍️ Autor: *' + author + '*\n\n' +
            '┃ ️ Todos tus stickers nuevos\n' +
            '┃ tendrán estos datos.\n\n' +
            '╰〔 ⚡ ' + bold('SYSTEM') + ' 〕⬣'
        );
    }
};