// ============================================================
// COMANDO: REINICIAR
// ALEX BOT
// Reinicia el proceso actual del bot
// ============================================================

import {
    spawn
} from 'child_process';

export default {

    nombre: 'reiniciar',

    categoria: 'Owner',

    alias: [
        'restart',
        'reboot'
    ],

    owner: true,

    descripcion:
        'Reinicia el proceso de ALEX BOT.',

    ejecutar: async ({
        responder
    }) => {

        try {

            await responder.texto(
                '╭━━〔 🔄 𝐑𝐄𝐈𝐍𝐈𝐂𝐈𝐀𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ ♻️ Reiniciando ALEX BOT...\n' +
                '┃ ⏳ Espera unos segundos.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            // ====================================================
            // INICIAR NUEVO PROCESO
            // ====================================================

            const hijo =
                spawn(
                    process.execPath,
                    process.argv.slice(1),
                    {
                        cwd: process.cwd(),
                        detached: true,
                        stdio: 'inherit',
                        env: process.env
                    }
                );

            hijo.unref();

            // ====================================================
            // CERRAR PROCESO ACTUAL
            // ====================================================

            setTimeout(() => {

                process.exit(0);

            }, 1000);

        } catch (error) {

            console.error(
                '[REINICIAR] Error:',
                error
            );

            await responder.texto(
                '❌ *REINICIAR*\n\n' +
                'No se pudo reiniciar el bot.\n\n' +
                `⚠️ ${error.message}`
            );
        }
    }
};
