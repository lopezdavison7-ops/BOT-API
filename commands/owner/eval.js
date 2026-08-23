// commands/owner/eval.js
// ============================================================
// EVAL - SOLO OWNER
// Ejecuta código JavaScript directamente en el proceso del bot.
// Uso: .eval 1 + 1
// Uso: .eval await sock.sendMessage(msg.key.remoteJid, { text: 'hola' })
// Uso: .eval const x = 5; await foo(); x * 2
// ============================================================

import util from 'util';
import { esOwner } from '../../lib/owner.js';

const TIMEOUT_MS = 15000;

function conTimeout(promesa, ms) {

    return Promise.race([
        promesa,
        new Promise((_, reject) =>
            setTimeout(
                () => reject(new Error(`Tiempo límite excedido (${ms}ms)`)),
                ms
            )
        )
    ]);
}

function inspeccionar(valor) {

    if (typeof valor === 'string') {

        return valor;

    }

    try {

        return util.inspect(valor, {
            depth: 1,
            maxArrayLength: 50,
            maxStringLength: 2000,
            breakLength: 100
        });

    } catch (_error) {

        try {

            return String(valor);

        } catch (_error2) {

            return '[No se pudo convertir el resultado a texto]';

        }
    }
}

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
                '╭━━〔 ⛔ 𝐄𝐕𝐀𝐋 〕━━⬣\n' +
                '┃\n' +
                '┃ 🚫 Este comando es solo para el Owner.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;

        }

        if (!argumento) {

            await responder.texto(
                '╭━━〔 ⚠️ 𝐄𝐕𝐀𝐋 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Escribe código para ejecutar.\n' +
                '┃\n' +
                '┃ 📌 Uso: .eval 1 + 1\n' +
                '┃ 📌 Uso: .eval msg.key.remoteJid\n' +
                '┃ 📌 Uso: .eval const x = 5; await foo(); x * 2\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;

        }

        let salida = '';
        let esError = false;

        try {

            // ====================================================
            // EJECUCIÓN
            // Se envuelve en una función async para poder usar
            // await dentro del propio código evaluado, y con un
            // timeout para no colgar el proceso del bot.
            //
            // 1) Se intenta primero como EXPRESIÓN simple
            //    (ej: 1 + 1, msg.key.remoteJid)
            // 2) Si eso da SyntaxError (porque es código con
            //    varias líneas/statements: const, await, for, etc.)
            //    se ejecuta directo como bloque de código.
            // ====================================================

            let resultado;

            try {

                resultado = await conTimeout(
                    eval(
                        `(async () => { return (\n${argumento}\n) })()`
                    ),
                    TIMEOUT_MS
                );

            } catch (error) {

                if (!(error instanceof SyntaxError)) {

                    throw error;

                }

                resultado = await conTimeout(
                    eval(
                        `(async () => {\n${argumento}\n})()`
                    ),
                    TIMEOUT_MS
                );

            }

            salida = inspeccionar(resultado);

        } catch (error) {

            esError = true;

            const nombre =
                (error && error.name) || 'Error';

            const mensaje =
                (error && error.message) || String(error);

            salida = `${nombre}: ${mensaje}`;

        }

        if (!salida) {

            salida = '(sin salida)';

        }

        if (salida.length > 3000) {

            salida = salida.slice(0, 3000) + '\n... truncado';

        }

        await responder.texto(
            `╭〔 ${esError ? '❌' : '🧪'} 𝐄𝐕𝐀𝐋 〕⬣\n` +
            '┃\n' +
            '┃ 📥 *Código:*\n' +
            '┃ ```' + argumento + '```\n' +
            '┃\n' +
            `┃ ${esError ? '🚨 *Error:*' : '📤 *Resultado:*'}\n` +
            '┃ ```' + salida + '```\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━⬣'
        );
    }
};
