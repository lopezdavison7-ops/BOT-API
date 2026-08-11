export default {
    nombre: 'avatar',

    categoria: 'Multimedia',

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

        // ====================================================
        // OBTENER MENCIÓN
        // ====================================================

        const contexto =
            msg.message?.extendedTextMessage?.contextInfo;

        const menciones =
            contexto?.mentionedJid || [];

        if (!menciones.length) {

            await responder.texto(
                `❌ *AVATAR*\n\n` +
                `Debes mencionar al usuario.\n\n` +
                `📌 Ejemplo:\n` +
                `*.avatar @usuario*`
            );

            return;
        }

        // ====================================================
        // PRIMER USUARIO MENCIONADO
        // ====================================================

        const usuario =
            menciones[0];

        try {

            // =================================================
            // OBTENER FOTO
            // =================================================

            const url =
                await sock.profilePictureUrl(
                    usuario,
                    'image'
                );

            // =================================================
            // TEXTO CON MENCIÓN REAL
            // =================================================

            const numero =
                usuario.split('@')[0];

            const caption =
                `🖼️ *AVATAR*\n\n` +
                `👤 Usuario: @${numero}`;

            // =================================================
            // DESCARGAR FOTO
            // =================================================

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

            // =================================================
            // ENVIAR CON MENCIÓN REAL
            // =================================================

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
                `❌ *AVATAR*\n\n` +
                `No se pudo obtener la foto de perfil.\n\n` +
                `Puede que el usuario tenga su foto privada ` +
                `o no tenga una foto de perfil.`
            );
        }
    }
};
