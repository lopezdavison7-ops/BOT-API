export default {
    nombre: 'info',

    categoria: 'ultilidades',

    alias: [
        'botinfo'
    ],

    descripcion:
        'Muestra información del bot, usuario y chat.',

    ejecutar: async ({
        responder,
        msg
    }) => {

        try {

            // ------------------------------------------------
            // INFORMACIÓN DEL BOT
            // ------------------------------------------------

            const nombreBot =
                process.env.BOT_NAME || 'Alex';

            const versionBot =
                process.env.BOT_VERSION || '1.0.0';

            // ------------------------------------------------
            // INFORMACIÓN DEL USUARIO
            // ------------------------------------------------

            const jidUsuario =
                msg.key?.participant ||
                msg.key?.remoteJid ||
                '';

            const numeroUsuario =
                jidUsuario
                    .split('@')[0]
                    .split(':')[0];

            const nombreUsuario =
                msg.pushName ||
                'Usuario';

            // ------------------------------------------------
            // INFORMACIÓN DEL CHAT
            // ------------------------------------------------

            const jidChat =
                msg.key?.remoteJid || '';

            const esGrupo =
                jidChat.endsWith('@g.us');

            const tipoChat =
                esGrupo
                    ? 'Grupo'
                    : 'Privado';

            // ------------------------------------------------
            // UPTIME
            // ------------------------------------------------

            const segundos =
                Math.floor(process.uptime());

            const dias =
                Math.floor(segundos / 86400);

            const horas =
                Math.floor(
                    (segundos % 86400) / 3600
                );

            const minutos =
                Math.floor(
                    (segundos % 3600) / 60
                );

            const segundosRestantes =
                segundos % 60;

            const uptime =
                `${dias}d ${horas}h ${minutos}m ${segundosRestantes}s`;

            // ------------------------------------------------
            // MEMORIA
            // ------------------------------------------------

            const memoria =
                process.memoryUsage();

            const ramMB =
                (memoria.rss / 1024 / 1024)
                    .toFixed(1);

            // ------------------------------------------------
            // SISTEMA
            // ------------------------------------------------

            const nodeVersion =
                process.version;

            const plataforma =
                process.platform;

            // ------------------------------------------------
            // RESPUESTA
            // ------------------------------------------------

            const texto =
                '🤖 *INFORMACIÓN DEL BOT*\n\n' +

                '⚡ *Bot*\n' +
                `• Nombre: *${nombreBot}*\n` +
                `• Versión: *${versionBot}*\n` +
                '• Estado: 🟢 *Online*\n' +
                `• Uptime: *${uptime}*\n\n` +

                '👤 *USUARIO*\n' +
                `• Nombre: *${nombreUsuario}*\n` +
                `• Número: *${numeroUsuario || 'Desconocido'}*\n\n` +

                '💬 *CHAT*\n' +
                `• Tipo: *${tipoChat}*\n` +
                `• ID: *${jidChat || 'Desconocido'}*\n\n` +

                '💻 *SISTEMA*\n' +
                `• Node.js: *${nodeVersion}*\n` +
                `• Plataforma: *${plataforma}*\n` +
                `• RAM: *${ramMB} MB*\n\n` +

                '🌙 *Alex WhatsApp Bot*';

            await responder.texto(texto);

        } catch (error) {

            console.error(
                '[COMANDO info]',
                error
            );

            await responder.texto(
                '❌ No se pudo obtener la información del bot.'
            );
        }
    }
};
