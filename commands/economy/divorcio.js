import {
    divorciar
} from '../../database/perfiles.js';

export default {
    nombre: 'divorcio',
    categoria: 'economia',
    alias: ['divorciarme', 'divorce'],
    descripcion: 'Termina tu matrimonio actual. Uso:.divorcio',

    ejecutar: async ({ msg, responder, sock }) => { // <- agregué sock
        const s = sock || global.conns?.[0] || Object.values(global.conns)[0];
        const chatJid = msg.key.remoteJid;
        const id = msg.key.participant || msg.key.remoteJid;

        const exPareja = divorciar(id);

        if (!exPareja) {
            let text = '╭〔 ⚠️ 𝐃𝐈𝐕𝐎𝐑𝐂𝐈𝐎 〕⬣\n';
            text += '┃\n';
            text += '┃ No estás casado con nadie.\n';
            text += '┃\n';
            text += '╰━━━━━━━━⬣';
            return responder.texto(text);
        }

        let text = '╭〔 💔 𝐃𝐈𝐕𝐎𝐑𝐂𝐈𝐎 〕⬣\n';
        text += '┃\n';
        text += `┃ Te divorciaste de\n`;
        text += `┃ @${exPareja.split('@')[0]}\n`;
        text += '┃\n';
        text += '┃ Ambos vuelven a estar solteros.\n';
        text += '┃\n';
        text += '╰━━━━━━━━⬣';

        // FIX: usar sendMessage para que mencione
        await s.sendMessage(chatJid, { text, mentions: [exPareja, id] }, { quoted: msg });
    }
};