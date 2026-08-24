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

// ============================================================
// AUTO-RETURN DE LA ÚLTIMA EXPRESIÓN
// ============================================================
// Cuando el código tiene varios statements (const x = ...;
// foo(); JSON.stringify(x)) y el último es una expresión SIN
// 'return' explícito, por defecto no se captura ningún valor
// (igual que en JS normal). Esto imita lo que hace la consola
// de Node: si la última línea es una expresión "suelta", se le
// agrega 'return' automáticamente para poder ver su resultado.
// ============================================================

const PALABRA_RESERVADA_INICIO =
    /^(const|let|var|function|async\s+function|class|if|for|while|do|switch|try|catch|finally|return|throw|import|export|break|continue|yield)\b/;

function dividirEnStatementsSuperior(codigo) {

    const partes = [];
    let actual = '';
    let profundidad = 0;
    let comilla = null;
    let escapando = false;

    for (let i = 0; i < codigo.length; i++) {

        const c = codigo[i];
        actual += c;

        if (escapando) {

            escapando = false;
            continue;

        }

        if (comilla) {

            if (c === '\\') {

                escapando = true;

            } else if (c === comilla) {

                comilla = null;

            }

            continue;

        }

        if (c === '\'' || c === '"' || c === '`') {

            comilla = c;
            continue;

        }

        if (c === '(' || c === '{' || c === '[') {

            profundidad++;
            continue;

        }

        if (c === ')' || c === '}' || c === ']') {

            profundidad--;
            continue;

        }

        if (
            profundidad === 0 &&
            (c === ';' || c === '\n')
        ) {

            partes.push(actual.slice(0, -1));
            actual = '';

        }

    }

    if (actual.trim()) {

        partes.push(actual);

    }

    return partes.filter(
        p => p.trim() !== ''
    );

}

function autoReturnUltimaExpresion(codigo) {

    if (/\breturn\b/.test(codigo)) {

        // Ya tiene un return explícito en algún lado,
        // no tocamos nada para no interferir.
        return codigo;

    }

    const partes =
        dividirEnStatementsSuperior(codigo);

    if (partes.length === 0) {

        return codigo;

    }

    const ultimaIdx =
        partes.length - 1;

    const ultima =
        partes[ultimaIdx].trim();

    if (
        !ultima ||
        PALABRA_RESERVADA_INICIO.test(ultima)
    ) {

        // La última línea no es una expresión "suelta"
        // (es una declaración/control de flujo) -> no se
        // puede inferir un valor de retorno con seguridad.
        return codigo;

    }

    partes[ultimaIdx] =
        'return ' + ultima;

    return partes.join(';\n');

}

// ============================================================
// RED DE SEGURIDAD
// Si el código llegó "aplastado" en una sola línea (por ejemplo
// porque el handler colapsó los saltos de línea originales),
// intenta insertar los ';' que falten antes de palabras clave
// de statement para permitir que el parser lo entienda igual.
// ============================================================
function repararStatements(codigo) {

    return codigo.replace(
        /([^\s;{(,:])\s+(const|let|var|await|for|if|return|function|class|switch|try)\b/g,
        '$1;\n$2'
    );

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

                try {

                    const conAutoReturn =
                        autoReturnUltimaExpresion(argumento);

                    resultado = await conTimeout(
                        eval(
                            `(async () => {\n${conAutoReturn}\n})()`
                        ),
                        TIMEOUT_MS
                    );

                } catch (error2) {

                    if (!(error2 instanceof SyntaxError)) {

                        throw error2;

                    }

                    // Último recurso: reparar statements pegados
                    // en una sola línea (sin saltos ni ';'),
                    // y además intentar capturar el valor de
                    // la última expresión suelta.
                    const reparado =
                        autoReturnUltimaExpresion(
                            repararStatements(argumento)
                        );

                    resultado = await conTimeout(
                        eval(
                            `(async () => {\n${reparado}\n})()`
                        ),
                        TIMEOUT_MS
                    );

                }

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
