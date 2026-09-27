import { setDesc } from '../../database/perfiles.js';

export default {
    nombre: 'setdesc',
    categoria: 'economia',
    alias: ['mydesc', 'setbio', 'biografia', 'mibio', 'setbiografia'],
    descripcion: 'Pon tu descripción o biografía en tu perfil.',
    uso: '.setdesc Tu biografía',

    ejecutar: async ({ msg, argumento, responder }) => {
        const desc = String(argumento || '').trim();
        const id = msg.key.participant || msg.key.participantAlt || msg.key.remoteJid;

        if (!desc) {
            return await responder.texto(
                '╭━━〔 📝 𝐒𝐄𝐓 𝐃𝐄𝐒𝐂 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Escribe tu biografía\n' +
                '┃\n' +
                '┃ 💡 Ejemplo:\n' +
                '┃ ➪ .setdesc Amante del anime\n' +
                '┃    y la música 🎵\n' +
                '┃\n' +
                '┃ 📝 Máximo 120 caracteres\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        if (desc.length > 120) {
            return await responder.texto('❌ Máximo 120 caracteres.');
        }

        try {
            setDesc(id, desc);

            await responder.texto(
                '╭━━〔 ✅ 𝐁𝐈𝐎 𝐆𝐔𝐀𝐑𝐃𝐀𝐃𝐀 〕━━⬣\n' +
                '┃\n' +
                '┃ 📝 Tu biografía:\n' +
                '┃\n' +
                '┃ ' + desc + '\n' +
                '┃\n' +
                '┃ 💡 Véla con: *.profile*\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        } catch (error) {
            await responder.texto('❌ Error: ' + (error?.message || error));
        }
    }
};