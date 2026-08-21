// commands/owner/shell.js
import {
    exec
} from 'child_process';
import {
    promisify
} from 'util';

const execAsync = promisify(exec);

export default {

    nombre: '$',

    categoria: 'Owner',

    alias: [
        'shell',
        'exec',
        'terminal'
    ],

    owner: true,

    descripcion:
        'Ejecuta comandos de terminal.',

    ejecutar: async ({
        responder,
        argumento
    }) => {

        if (!argumento) {

            await responder.texto(
                '╭━━〔 ⚠️ 𝐒𝐇𝐄𝐋𝐋 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Escribe un comando.\n' +
                '┃\n' +
                '┃ 📌 Uso: .ls\n' +
                '┃ 📌 Uso: .pwd\n' +
                '┃ 📌 Uso: .node -v\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;

        }

        try {

            const {
                stdout,
                stderr
            } = await execAsync(argumento, {
                cwd: process.cwd(),
                timeout: 30000,
                maxBuffer: 1024 * 1024
            });

            let output = '';

            if (stdout) {

                output += stdout.trim();

            }

            if (stderr) {

                output += (output ? '\n' : '') + stderr.trim();

            }

            if (!output) {

                output = '(sin salida)';

            }

            if (output.length > 3000) {

                output = output.slice(0, 3000) + '\n... truncado';

            }

            await responder.texto(
                '╭〔 ✅ 𝐒𝐇𝐄𝐋𝐋 〕⬣\n' +
                '┃\n' +
                '┃ 📥 *Comando:*\n' +
                '┃ ```' + argumento + '```\n' +
                '┃\n' +
                '┃ 📤 *Salida:*\n' +
                '┃ ```' + output + '```\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

        } catch (error) {

            let output = '';

            if (error.stdout) {

                output += error.stdout.trim();

            }

            if (error.stderr) {

                output += (output ? '\n' : '') + error.stderr.trim();

            }

            if (!output) {

                output = error.message || 'Error desconocido';

            }

            if (output.length > 3000) {

                output = output.slice(0, 3000) + '\n... truncado';

            }

            await responder.texto(
                '╭〔 ❌ 𝐒𝐇𝐄𝐋𝐋 〕⬣\n' +
                '┃\n' +
                '┃ 📥 *Comando:*\n' +
                '┃ ```' + argumento + '```\n' +
                '┃\n' +
                '┃ 🚨 *Error:*\n' +
                '┃ ```' + output + '```\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

        }
    }
};
