// commands/owner/eval.js
// ============================================================
// EVAL - SOLO OWNER
// Ejecuta código JavaScript directamente en el proceso del bot.
// Uso: .eval 1 + 1
// Uso: .eval await sock.sendMessage(msg.key.remoteJid, { text: 'hola' })
// ============================================================

import util from 'util';
import { esOwner } from '../../lib/owner.js';

export default {

    nombre: 'eval',

    categoria: 'Owner',

    alias: [
        '>',
        'ev'
    ],

    owner: true,

    descripcion:
        'Ejecuta código JavaScript en el proceso del bot (solo Owner).',

    ejecutar: async ({
        sock,
        msg,
        responder,
        argumento
    }) => {

        // ====================================================
        // VERIFICACIÓN DE OWNER
        // (el handler no filtra por la propiedad `owner`,
        // así que cada comando sensible debe verificarlo aquí)
        // ====================================================

        if (!esOwner(msg)) {

            await responder.texto(
                '╭━━〔 ⛔ 𝐄𝐕𝐀𝐋 〕━━⬣\\n' +
                '┃\\n' +
                '┃ 🚫 Este comando es solo para el Owner.\\n' +
                '┃\\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;

        }

        if (!argumento) {

            await responder.texto(
                '╭━━〔 ⚠️ 𝐄𝐕𝐀𝐋 〕━━⬣\\n' +
                '┃\\n' +
                '┃ ❌ Escribe código para ejecutar.\\n' +
                '┃\\n' +
                '┃ 📌 Uso: .eval 1 + 1\\n' +
                '┃ 📌 Uso: .eval msg.key.remoteJid\\n' +
                '┃\\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;

        }

        let salida = '';

        try {

            // ====================================================
            // EJECUCIÓN
            // Se envuelve en una función async para poder usar
            // await dentro del propio código evaluado.
            // ====================================================

            let resultado = await eval(
                `(async () => { ${
                    argumento.includes('return') ||
                    argumento.trim().startsWith('{')
                        ? argumento
                        : `return (${argumento})`
                } })()`
            );

            if (typeof resultado !== 'string') {

                resultado = util.inspect(resultado, {
                    depth: 1
                });

            }

            salida = resultado;

        } catch (error) {

            salida = `${error.name || 'Error'}: ${error.message || error}`;

        }

        if (!salida) {

            salida = '(sin salida)';

        }

        if (salida.length > 3000) {

            salida = salida.slice(0, 3000) + '\\n... truncado';

        }

        await responder.texto(
            '╭〔 🧪 𝐄𝐕𝐀𝐋 〕⬣\\n' +
            '┃\\n' +
            '┃ 📥 *Código:*\\n' +
            '┃ ```' + argumento + '```\\n' +
            '┃\\n' +
            '┃ 📤 *Resultado:*\\n' +
            '┃ ```' + salida + '```\\n' +
            '┃\\n' +
            '╰━━━━━━━━━━━━━━━━⬣'
        );
    }
};
