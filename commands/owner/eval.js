// ============================================================
// BOT-API
// COMANDO: EVAL
// ============================================================
// Eval seguro para Owners.
//
// Ejemplos:
// .eval 1 + 1
// .eval Math.max(10, 25)
// .eval "hola".toUpperCase()
// .eval JSON.stringify({ ok: true })
// .eval msg.key
// .eval sock.user
//
// IMPORTANTE:
// No ejecuta código arbitrario del servidor.
// Se bloquean módulos, filesystem, procesos, variables de
// entorno y mecanismos de ejecución dinámica.
// ============================================================

import fs from 'fs/promises';
import path from 'path';

// ============================================================
// CONFIGURACIÓN
// ============================================================

const OWNER_FILE = path.join(
    process.cwd(),
    'database',
    'owner.json'
);

// ============================================================
// LEER OWNERS
// ============================================================

async function leerOwners() {
    try {
        const raw = await fs.readFile(
            OWNER_FILE,
            'utf8'
        );

        const data = JSON.parse(raw);

        if (Array.isArray(data)) {
            return data;
        }

        if (Array.isArray(data?.owners)) {
            return data.owners;
        }

        return [];

    } catch (error) {
        console.error(
            '[EVAL] Error leyendo owner.json:',
            error?.message || error
        );

        return [];
    }
}

// ============================================================
// OBTENER NÚMERO
// ============================================================

function obtenerNumero(jid) {
    if (!jid) return '';

    return String(jid)
        .split('@')[0]
        .split(':')[0]
        .replace(/\D/g, '');
}

// ============================================================
// COMPROBAR OWNER
// ============================================================

async function esOwner(msg) {
    const sender = obtenerNumero(
        msg?.key?.participant ||
        msg?.participant ||
        msg?.key?.remoteJid ||
        ''
    );

    if (!sender) {
        return false;
    }

    const owners = await leerOwners();

    return owners.some(owner => {
        let numero;

        if (typeof owner === 'object') {
            numero =
                owner.number ||
                owner.numero ||
                owner.phone ||
                owner.jid ||
                owner.id ||
                owner.lid ||
                '';
        } else {
            numero = owner;
        }

        numero = obtenerNumero(numero);

        return numero === sender;
    });
}

// ============================================================
// BLOQUEO DE OPERACIONES PELIGROSAS
// ============================================================

const BLOQUEADOS = [
    'process',
    'require',
    'module',
    'exports',
    'import',
    'global',
    'globalThis',
    'eval',
    'Function',
    'AsyncFunction',
    'GeneratorFunction',
    'WebAssembly',
    'child_process',
    'exec',
    'execSync',
    'spawn',
    'spawnSync',
    'fork',
    'fs',
    'fs/promises',
    'readFile',
    'writeFile',
    'unlink',
    'rm',
    'rmdir',
    'mkdir',
    'rename',
    'copyFile',
    'database',
    'owner.json',
    'dotenv',
    'env',
    'PATH',
    'HOME',
    '__dirname',
    '__filename'
];

// ============================================================
// VALIDAR CÓDIGO
// ============================================================

function validarCodigo(codigo) {
    const texto = String(codigo || '').trim();

    if (!texto) {
        return {
            valido: false,
            razon: 'No ingresaste ningún código.'
        };
    }

    const codigoNormalizado = texto.toLowerCase();

    for (const bloqueado of BLOQUEADOS) {
        const patron = bloqueado.toLowerCase();

        if (codigoNormalizado.includes(patron)) {
            return {
                valido: false,
                razon:
                    `La expresión contiene una operación bloqueada: ${bloqueado}`
            };
        }
    }

    return {
        valido: true
    };
}

// ============================================================
// EVALUADOR SEGURO
// ============================================================

function evaluarSeguro(codigo, contexto) {

    const resultadoValidacion =
        validarCodigo(codigo);

    if (!resultadoValidacion.valido) {
        throw new Error(
            resultadoValidacion.razon
        );
    }

    // --------------------------------------------------------
    // API limitada disponible dentro del evaluador
    // --------------------------------------------------------

    const sandbox = Object.freeze({

        // Datos básicos del mensaje.
        msg: Object.freeze({
            key: msgSeguro(contexto.msg)
        }),

        // Información pública básica del socket.
        sock: Object.freeze({
            user: contexto.sock?.user
                ? {
                    id: contexto.sock.user.id || null,
                    name: contexto.sock.user.name || null
                }
                : null
        }),

        // Math seguro.
        Math,

        // JSON.
        JSON,

        // String.
        String,

        // Number.
        Number,

        // Boolean.
        Boolean,

        // Array.
        Array,

        // Object.
        Object,

        // Date.
        Date
    });

    // --------------------------------------------------------
    // Evaluación mediante Function.
    //
    // No tiene acceso al scope del módulo.
    // Las palabras peligrosas se bloquearon previamente.
    // --------------------------------------------------------

    const nombres = Object.keys(sandbox);
    const valores = Object.values(sandbox);

    const fn = new Function(
        ...nombres,
        `"use strict"; return (${codigo});`
    );

    return fn(...valores);
}

// ============================================================
// LIMPIAR MSG PARA EVAL
// ============================================================

function msgSeguro(msg) {
    if (!msg) {
        return null;
    }

    return {
        key: {
            remoteJid:
                msg.key?.remoteJid || null,

            fromMe:
                Boolean(msg.key?.fromMe),

            id:
                msg.key?.id || null,

            participant:
                msg.key?.participant || null
        }
    };
}

// ============================================================
// FORMATEAR RESULTADO
// ============================================================

function obtenerTipo(valor) {

    if (valor === null) {
        return 'null';
    }

    if (Array.isArray(valor)) {
        return 'array';
    }

    return typeof valor;
}

// ============================================================
// CONVERTIR RESULTADO A TEXTO
// ============================================================

function resultadoTexto(valor) {

    if (valor === undefined) {
        return 'undefined';
    }

    if (valor === null) {
        return 'null';
    }

    if (typeof valor === 'string') {
        return valor;
    }

    if (
        typeof valor === 'number' ||
        typeof valor === 'boolean' ||
        typeof valor === 'bigint'
    ) {
        return String(valor);
    }

    try {
        return JSON.stringify(
            valor,
            null,
            2
        );
    } catch {
        return String(valor);
    }
}

// ============================================================
// FORMATO DE ÉXITO
// ============================================================

function crearResultadoExito(valor) {

    const tipo =
        obtenerTipo(valor);

    const contenido =
        resultadoTexto(valor);

    return (
        '⚙️ *ᴇᴠᴀʟ ʀᴇsᴜʟᴛ*\n\n' +

        '╭┈┈⬡「 📋 *ɪɴғᴏ* 」\n' +
        '┃\n' +
        '┃ ✅ *Success*\n' +
        `┃ Type: ${tipo}\n` +
        '╰┈┈┈┈┈┈┈┈⬡\n\n' +

        '```' +
        '\n' +
        contenido +
        '\n' +
        '```'
    );
}

// ============================================================
// FORMATO DE ERROR
// ============================================================

function crearResultadoError(error) {

    const mensaje =
        error?.message ||
        String(error);

    return (
        '⚙️ *ᴇᴠᴀʟ ʀᴇsᴜʟᴛ*\n\n' +

        '╭┈┈⬡「 📋 *ɪɴғᴏ* 」\n' +
        '┃\n' +
        '┃ ❌ *Error*\n' +
        '┃ Type: Error\n' +
        '╰┈┈┈┈┈┈┈┈⬡\n\n' +

        '```' +
        '\n' +
        mensaje +
        '\n' +
        '```'
    );
}

// ============================================================
// COMANDO
// ============================================================

export default {

    nombre: 'eval',

    categoria: 'Owner',

    alias: [
        'e',
        'ev'
    ],

    descripcion:
        'Evalúa expresiones JavaScript seguras. Comando exclusivo del Owner.',

    ejecutar: async ({
        msg,
        sock,
        argumento,
        responder
    }) => {

        try {

            // ------------------------------------------------
            // COMPROBAR OWNER
            // ------------------------------------------------

            const autorizado =
                await esOwner(msg);

            if (!autorizado) {

                await responder.texto(
                    '🔐 *ᴇᴠᴀʟ*\n\n' +
                    '❌ Este comando es exclusivo del Owner.'
                );

                return;
            }

            // ------------------------------------------------
            // OBTENER CÓDIGO
            // ------------------------------------------------

            const codigo =
                String(argumento || '').trim();

            // ------------------------------------------------
            // SIN CÓDIGO
            // ------------------------------------------------

            if (!codigo) {

                await responder.texto(
                    '⚙️ *ᴇᴠᴀʟ*\n\n' +

                    '> Ingresa código JavaScript!\n\n' +

                    '*Ejemplo:*\n' +
                    '> => 1 + 1\n' +
                    '> => msg.key\n' +
                    '> => sock.user\n' +
                    '> => Math.max(10, 25)\n' +
                    '> => "hola".toUpperCase()'
                );

                return;
            }

            // ------------------------------------------------
            // MOSTRAR EN CONSOLA
            // ------------------------------------------------

            console.log(
                `[EVAL] Owner ejecutó: ${codigo}`
            );

            // ------------------------------------------------
            // EVALUAR
            // ------------------------------------------------

            let resultado;

            try {

                resultado =
                    evaluarSeguro(
                        codigo,
                        {
                            msg,
                            sock
                        }
                    );

            } catch (error) {

                console.error(
                    '[EVAL] Error:',
                    error?.stack ||
                    error?.message ||
                    error
                );

                await responder.texto(
                    crearResultadoError(
                        error
                    )
                );

                return;
            }

            // ------------------------------------------------
            // ENVIAR RESULTADO
            // ------------------------------------------------

            await responder.texto(
                crearResultadoExito(
                    resultado
                )
            );

        } catch (error) {

            console.error(
                '[EVAL] Error general:',
                error?.stack ||
                error?.message ||
                error
            );

            try {

                await responder.texto(
                    crearResultadoError(
                        error
                    )
                );

            } catch (sendError) {

                console.error(
                    '[EVAL] No se pudo enviar el resultado:',
                    sendError?.message ||
                    sendError
                );
            }
        }
    }
};