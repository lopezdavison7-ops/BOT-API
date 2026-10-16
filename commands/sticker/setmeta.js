import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RUTA_META = path.join(__dirname, '..', '..', 'database', 'stickerMeta.json');

function leerMeta() {
    try {
        const data = fs.readFileSync(RUTA_META, 'utf8');
        return JSON.parse(data);
    } catch {
        return {};
    }
}

function guardarMeta(db) {
    fs.mkdirSync(path.dirname(RUTA_META), { recursive: true });
    fs.writeFileSync(RUTA_META, JSON.stringify(db, null, 2), 'utf8');
}

export default {
    nombre: 'setmeta',
    categoria: 'Stickers',
    alias: ['marcasticker', 'meta', 'setpack'],
    descripcion: 'Cambia tu marca de agua personalizada para stickers.',

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        const reaccion = async (emoji) => {
            await sock.sendMessage(jid, { react: { text: emoji, key: msg.key } });
        };

        await reaccion('⚙️');

        const text = String(argumento || '').trim();
        if (!text) {
            await reaccion('❌');
            return await responder.texto(
                '╭━━〔 ⚙️ 𝐒𝐄𝐓𝐌𝐄𝐓𝐀 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Uso:\n' +
                '┃ › .setmeta Autor\n' +
                '┃ › .setmeta Pack | Autor\n' +
                '┃\n' +
                '┃ 💡 Ejemplos:\n' +
                '┃ › .setmeta BOT-API\n' +
                '┃ › .setmeta Yuta MD | @TuNombre\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }

        const senderNum = msg.key.participant || msg.key.remoteJid;
        const db = leerMeta();

        // Verificar si ya tiene una marca establecida
        if (db[senderNum] && (db[senderNum].pack || db[senderNum].author)) {
            await reaccion('⚠️');
            return await responder.texto(
                '⚠️ Ya tienes una marca establecida.\n' +
                'Usa *.delmeta* para eliminarla primero.'
            );
        }

        let packName = '';
        let authorName = '';

        if (text.includes('|')) {
            const [pack, author] = text.split('|').map(v => v.trim());
            packName = pack || text;
            authorName = author || text;
        } else {
            packName = text;
            authorName = text;
        }

        // Guardar en JSON
        db[senderNum] = { pack: packName, author: authorName };
        guardarMeta(db);

        await responder.texto(
            '╭━━〔 ✅ 𝐌𝐀𝐑𝐂𝐀 𝐀𝐂𝐓𝐔𝐀𝐋𝐈𝐙𝐀𝐃𝐀 〕━━⬣\n' +
            '┃\n' +
            `┃ 📦 *Pack:* ${packName}\n` +
            `┃ ✍️ *Autor:* ${authorName}\n` +
            '┃\n' +
            '┃ Ahora tus stickers llevarán\n' +
            '┃ esta marca de agua personalizada.\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━⬣'
        );
        
        await reaccion('✅');
    }
};