// commands/system/info.js
export default {
    nombre: 'info',

    categoria: 'sistema',

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
                process.env.BOT_NAME || 'BOT-API';

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
                '╭〔 🤖 𝐈𝐍𝐅𝐎𝐑𝐌𝐀𝐂𝐈𝐎𝐍 𝐃𝐄𝐋 𝐁𝐎𝐓 〕⬣\n' +
                '┃\n' +
                '┃ ⚡ *BOT*\n' +
                `┃ • Nombre: *${nombreBot}*\n` +
                `┃ • Versión: *${versionBot}*\n` +
                '┃ • Estado: 🟢 *Online*\n' +
                `┃ • Uptime: *${uptime}*\n` +
                '┃\n' +
                '┃ 👤 *USUARIO*\n' +
                `┃ • Nombre: *${nombreUsuario}*\n` +
                `┃ • Número: *${numeroUsuario || 'Desconocido'}*\n` +
                '┃\n' +
                '┃ 💬 *CHAT*\n' +
                `┃ • Tipo: *${tipoChat}*\n` +
                `┃ • ID: *${jidChat || 'Desconocido'}*\n` +
                '┃\n' +
                '┃ 💻 *SISTEMA*\n' +
                `┃ • Node.js: *${nodeVersion}*\n` +
                `┃ • Plataforma: *${plataforma}*\n` +
                `┃ • RAM: *${ramMB} MB*\n` +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣\n\n' +
                '╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣';

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