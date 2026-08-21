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
            // OBTENER COMMITS ANTES DE ACTUALIZAR
            // ====================================================

            let commitsAntes = '';

            try {

                const {
                    stdout
                } = await execAsync(
                    'git log --oneline -10',
                    { cwd: process.cwd() }
                );

                commitsAntes = stdout.trim();

            } catch (e) {

                commitsAntes = 'No se pudieron obtener commits.';

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
                // OBTENER COMMITS DESPUÉS DE ACTUALIZAR
                // ====================================================

                let commitsDespues = '';

                let cambios = '';

                try {

                    const {
                        stdout
                    } = await execAsync(
                        'git log --oneline -10',
                        { cwd: process.cwd() }
                    );

                    commitsDespues = stdout.trim();

                    const lineasAntes =
                        commitsAntes.split('\n').filter(Boolean);

                    const lineasDespues =
                        commitsDespues.split('\n').filter(Boolean);

                    const nuevosCommits =
                        lineasDespues.filter(
                            (c) => !lineasAntes.includes(c)
                        );

                    if (nuevosCommits.length > 0) {

                        cambios =
                            '📝 *Cambios detectados:*\n' +
                            nuevosCommits.map(
                                (c) => '┃ • ' + c
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
