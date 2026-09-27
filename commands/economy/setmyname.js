import { setNombre } from '../../database/perfiles.js';

export default {
    nombre: 'setmyname',
    categoria: 'economia',
    alias: ['mynombre', 'setname', 'ponmename', 'cambiarnombre'],
    descripcion: 'Pon el nombre que quieras en tu perfil del bot.',
    uso: '.setmyname Tu Nombre',

    ejecutar: async ({ msg, argumento, responder }) => {
        const nombre = String(argumento || '').trim();
        const id = msg.key.participant || msg.key.participantAlt || msg.key.remoteJid;

        if (!nombre) {
            return await responder.texto(
                '╭━━〔 👤 𝐒𝐄𝐓 𝐌𝐘 𝐍𝐀𝐌𝐄 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Escribe tu nuevo nombre\n' +
                '┃\n' +
                '┃ 💡 Ejemplo:\n' +
                '┃ ➪ .setmyname Alex\n' +
                '┃\n' +
                '┃ 📝 Máximo 25 caracteres\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        if (nombre.length > 25) {
            return await responder.texto('❌ Máximo 25 caracteres.');
        }

        try {
            setNombre(id, nombre);

            await responder.texto(
                '╭━━〔 ✅ 𝐍𝐎𝐌𝐁𝐑𝐄 𝐆𝐔𝐀𝐑𝐃𝐀𝐃𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ 👤 Tu nombre ahora es:\n' +
                '┃    *' + nombre + '*\n' +
                '┃\n' +
                '┃ 💡 Vélo con: *.profile*\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        } catch (error) {
            await responder.texto('❌ Error: ' + (error?.message || error));
        }
    }
};