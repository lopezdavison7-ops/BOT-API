
export default {
    nombre: 'avatar',

    categoria: 'Sistema',

    alias: [
        'foto',
        'pfp'
    ],

    descripcion:
        'Obtiene la foto de perfil de un usuario mencionado.',

    ejecutar: async ({
        sock,
        msg,
        responder
    }) => {

        const contexto =
            msg.message?.extendedTextMessage?.contextInfo;

        const menciones =
            contexto?.mentionedJid || [];

        if (!menciones.length) {

            await responder.texto(
                `╭━━〔 ❌ 𝐀𝐕𝐀𝐓𝐀𝐑 〕━━⬣\n` +
                `┃\n` +
                `┃ Debes mencionar al usuario.\n` +
                `┃\n` +
                `┃ 📌 Ejemplo:\n` +
                `┃ *.avatar @usuario*\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━⬣`
            );

            return;
        }

        const usuario =
            menciones[0];

        try {

            const url =
                await sock.profilePictureUrl(
                    usuario,
                    'image'
                );

            const numero =
                usuario.split('@')[0];

            const caption =
                `╭━━〔 🖼️ 𝐀𝐕𝐀𝐓𝐀𝐑 〕━━⬣\n` +
                `┃\n` +
                `┃ 👤 Usuario: @${numero}\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━⬣`;

            const respuesta =
                await fetch(url);

            if (!respuesta.ok) {

                throw new Error(
                    `No se pudo descargar la foto. HTTP ${respuesta.status}`
                );
            }

            const arrayBuffer =
                await respuesta.arrayBuffer();

            const buffer =
                Buffer.from(arrayBuffer);

            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    image: buffer,
                    caption,
                    mentions: [
                        usuario
                    ]
                },
                {
                    quoted: msg
                }
            );

            console.log(
                `[COMANDO avatar] ✓ Avatar enviado de ${usuario}`
            );

        } catch (error) {

            console.error(
                '[COMANDO avatar] Error:',
                error?.message || error
            );

            await responder.texto(
                `╭━━〔 ❌ 𝐀𝐕𝐀𝐓𝐀𝐑 〕━━⬣\n` +
                `┃\n` +
                `┃ No se pudo obtener la foto de perfil.\n` +
                `┃\n` +
                `┃ ⚠️ Puede que el usuario tenga su foto privada\n` +
                `┃ o no tenga una foto de perfil.\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━⬣`
            );
        }
    }
};