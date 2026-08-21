// commands/owner/update.js
import {
    spawn
} from 'child_process';
import {
    promisify
} from 'util';
import {
    exec as execCallback
} from 'child_process';

const execAsync = promisify(execCallback);

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
        sock,
        msg,
        responder
    }) => {

        const jid = msg.key?.remoteJid;

        const enviar = async (texto) => {

            return sock.sendMessage(
                jid,
                { text: texto },
                { quoted: msg }
            );

        };

        const editar = async (key, texto) => {

            return sock.sendMessage(
                jid,
                { text: texto, edit: key },
                { quoted: msg }
            );

        };

        try {

            const msgInicial = await enviar(
                '╭━━〔 🔄 𝐀𝐂𝐓𝐔𝐀𝐋𝐈𝐙𝐀𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ 📥 Descargando actualizaciones...\n' +
                '┃ ⏳ Espera un momento.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            const keyMensaje = msgInicial.key;

            // ====================================================
            // OBTENER ARCHIVOS ANTES DE ACTUALIZAR
            // ====================================================

            let archivosAntes = '';

            try {

                const {
                    stdout
                } = await execAsync(
                    'git diff --name-only HEAD',
                    { cwd: process.cwd() }
                );

                archivosAntes = stdout.trim();

            } catch (e) {

                archivosAntes = '';

            }

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

                    await editar(
                        keyMensaje,
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

                    await editar(
                        keyMensaje,
                        '╭━━〔 ✅ 𝐀𝐂𝐓𝐔𝐀𝐋𝐈𝐙𝐀𝐑 〕━━⬣\n' +
                        '┃\n' +
                        '┃ 🎉 El bot ya está actualizado.\n' +
                        '┃ 📦 No hay cambios nuevos.\n' +
                        '┃\n' +
                        '╰━━━━━━━━━━━━━━━━⬣'
                    );

                    return;

                }

                // ====================================================
                // OBTENER ARCHIVOS DESPUÉS DE ACTUALIZAR
                // ====================================================

                let cambios = '';

                try {

                    const {
                        stdout
                    } = await execAsync(
                        'git diff --name-only HEAD@{1}',
                        { cwd: process.cwd() }
                    );

                    const archivos = stdout.trim().split('\n').filter(Boolean);

                    if (archivos.length > 0) {

                        cambios =
                            '📝 *Archivos modificados:*\n' +
                            archivos.map(
                                (a) => '┃ • ' + a
                            ).join('\n');

                    } else {

                        cambios =
                            '┃ 📦 Se actualizaron archivos.';

                    }

                } catch (e) {

                    cambios =
                        '┃ 📦 No se pudieron detectar cambios.';

                }

                // ====================================================
                // MOSTRAR RESULTADO Y REINICIAR
                // ====================================================

                await editar(
                    keyMensaje,
                    '╭━━〔 ✅ 𝐀𝐂𝐓𝐔𝐀𝐋𝐈𝐙𝐀𝐑 〕━━⬣\n' +
                    '┃\n' +
                    '┃ 📦 Actualización completada.\n' +
                    '┃\n' +
                    `${cambios}\n` +
                    '┃\n' +
                    '┃ 🔄 Reiniciando bot en 3 segundos...\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );

                // ====================================================
                // REINICIAR PROCESO
                // ====================================================

                setTimeout(() => {

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

                    process.exit(0);

                }, 3000);

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
