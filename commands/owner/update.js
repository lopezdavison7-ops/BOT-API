// commands/owner/update.js
import {
    spawn
} from 'child_process';

export default {

    nombre: 'update',

    categoria: 'Owner',

    alias: [
        'actualizar',
        'upd'
    ],

    owner: true,

    descripcion:
        'Actualiza el bot desde GitHub y reinicia.',

    ejecutar: async ({
        responder
    }) => {

        try {

            await responder.texto(
                '╭━━〔 🔄 𝐀𝐂𝐓𝐔𝐀𝐋𝐈𝐙𝐀𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ 📥 Descargando actualizaciones...\n' +
                '┃ ⏳ Espera un momento.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            // ====================================================
            // EJECUTAR GIT PULL
            // ====================================================

            const git = spawn('git', ['pull'], {
                cwd: process.cwd(),
                env: process.env
            });

            let salida = '';
            let errorSalida = '';

            git.stdout.on('data', (data) => {
                salida += data.toString();
            });

            git.stderr.on('data', (data) => {
                errorSalida += data.toString();
            });

            git.on('close', async (codigo) => {

                if (codigo !== 0) {

                    await responder.texto(
                        '╭━━〔 ❌ 𝐀𝐂𝐓𝐔𝐀𝐋𝐈𝐙𝐀𝐑 〕━━⬣\n' +
                        '┃\n' +
                        '┃ ⚠️ Error al descargar actualizaciones.\n' +
                        '┃\n' +
                        `┃ 🔍 ${errorSalida || 'Error desconocido'}\n` +
                        '┃\n' +
                        '╰━━━━━━━━━━━━━━━━⬣'
                    );

                    return;
                }

                const actualizado =
                    salida.includes('Already up to date') ||
                    salida.includes('Ya está actualizado');

                if (actualizado) {

                    await responder.texto(
                        '╭━━〔 ✅ 𝐀𝐂𝐓𝐔𝐀𝐋𝐈𝐙𝐀𝐑 〕━━⬣\n' +
                        '┃\n' +
                        '┃ 🎉 El bot ya está actualizado.\n' +
                        '┃ 📦 No hay cambios nuevos.\n' +
                        '┃\n' +
                        '╰━━━━━━━━━━━━━━━━⬣'
                    );

                    return;

                }

                await responder.texto(
                    '╭━━〔 ✅ 𝐀𝐂𝐓𝐔𝐀𝐋𝐈𝐙𝐀𝐑 〕━━⬣\n' +
                    '┃\n' +
                    '┃ 📦 Actualización completada.\n' +
                    '┃ 🔄 Reiniciando bot...\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );

                // ====================================================
                // REINICIAR PROCESO
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

                setTimeout(() => {
                    process.exit(0);
                }, 1000);

            });

        } catch (error) {

            console.error(
                '[UPDATE] Error:',
                error
            );

            await responder.texto(
                '❌ *ACTUALIZAR*\n\n' +
                'No se pudo actualizar el bot.\n\n' +
                `⚠️ ${error.message}`
            );
        }
    }
};
