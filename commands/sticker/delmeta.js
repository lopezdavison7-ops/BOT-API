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
    nombre: 'delmeta',
    categoria: 'Stickers',
    alias: ['borrarmeta', 'resetmeta', 'delstickermeta'],
    descripcion: 'Elimina tu marca de agua personalizada y vuelve a la predeterminada del bot.',

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        const reaccion = async (emoji) => {
            await sock.sendMessage(jid, { react: { text: emoji, key: msg.key } });
        };

        await reaccion('🗑️');

        const senderNum = msg.key.participant || msg.key.remoteJid;
        const db = leerMeta();

        // Verificar si tiene una marca establecida
        if (!db[senderNum] || (!db[senderNum].pack && !db[senderNum].author)) {
            await reaccion('⚠️');
            return await responder.texto(
                '⚠️ No tienes ninguna marca de agua personalizada establecida.\n' +
                'Usa *.setmeta* para crear una.'
            );
        }

        // Eliminar la configuración del usuario
        delete db[senderNum];
        guardarMeta(db);

        await responder.texto(
            '╭━━〔 ✅ 𝐌𝐀𝐑𝐂𝐀 𝐑𝐄𝐒𝐄𝐓𝐄𝐀𝐃𝐀 〕━━⬣\n' +
            '┃\n' +
            '┃ 🗑️ Tu marca personalizada ha sido eliminada.\n' +
            '┃\n' +
            '┃ Ahora tus stickers usarán la marca\n' +
            '┃ predeterminada del bot:\n' +
            '┃ 📦 *Pack:* ⚔️ BOT-API\n' +
            '┃ ✍️ *Autor:* @TuNombre\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━⬣'
        );

        await reaccion('✅');
    }
};