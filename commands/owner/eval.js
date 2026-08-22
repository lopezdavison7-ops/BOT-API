// ============================================================
// BOT-API
// COMANDO: EVAL
// ============================================================
// Comando exclusivo de Owner.
//
// Owners:
// database/owner.json
//
// Compatible con:
// - Número normal
// - JID @s.whatsapp.net
// - LID @lid
// - LID -> PN mediante Baileys
//
// Ejemplos:
// .eval
// .eval 1 + 1
// .eval msg.key
// .eval sock.user
// ============================================================

import fs from 'fs/promises';
import path from 'path';
import { jidNormalizedUser } from 'baileys';

// ============================================================
// CONFIGURACIÓN
// ============================================================

const OWNER_FILE = path.join(
    process.cwd(),
    'database',
    'owner.json'
);

// ============================================================
// LIMPIAR JID / NÚMERO
// ============================================================

function limpiarValor(valor) {
    if (!valor) return null;

    if (typeof valor === 'object') {
        valor =
            valor.lid ||
            valor.jid ||
            valor.id ||
            valor.number ||
            valor.numero ||
            valor.phone ||
            '';
    }

    const texto = String(valor).trim();

    return texto || null;
}

// ============================================================
// OBTENER NÚMERO DE UN JID
// ============================================================

function obtenerNumero(valor) {
    if (!valor) return null;

    const texto = String(valor)
        .split('@')[0]
        .split(':')[0]
        .replace(/\D/g, '');

    return texto || null;
}

// ============================================================
// NORMALIZAR PN
// ============================================================

function normalizarPN(valor) {
    if (!valor) return null;

    const texto = String(valor).trim();

    if (!texto) return null;

    if (texto.includes('@')) {
        try {
            return jidNormalizedUser(texto);
        } catch {
            // Continuamos con limpieza manual.
        }
    }

    const numero = obtenerNumero(texto);

    if (!numero) return null;

    return `${numero}@s.whatsapp.net`;
}

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

        if (Array.isArray(data?.owner)) {
            return data.owner;
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
// OBTENER OWNER NUMBERS
// ============================================================

async function obtenerNumerosOwners() {
    const owners = await leerOwners();

    const numeros = [];

    for (const owner of owners) {
        const valor = limpiarValor(owner);

        if (!valor) continue;

        const numero = obtenerNumero(valor);

        if (numero && !numeros.includes(numero)) {
            numeros.push(numero);
        }
    }

    return numeros;
}

// ============================================================
// RESOLVER LID -> PN
// ============================================================

async function resolverLidAPN(sock, jid) {
    if (!jid) return null;

    const texto = String(jid).trim();

    if (!texto.endsWith('@lid')) {
        return normalizarPN(texto);
    }

    const mapping =
        sock?.signalRepository?.lidMapping;

    if (
        !mapping ||
        typeof mapping.getPNForLID !== 'function'
    ) {
        console.warn(
            `[EVAL] No está disponible getPNForLID para ${texto}`
        );

        return null;
    }

    try {
        const resultado =
            await mapping.getPNForLID(texto);

        if (!resultado) {
            console.warn(
                `[EVAL] No existe mapping PN para ${texto}`
            );

            return null;
        }

        const pn = normalizarPN(resultado);

        if (pn) {
            console.log(
                `[EVAL] LID ${texto} -> PN ${pn}`
            );
        }

        return pn;

    } catch (error) {
        console.error(
            `[EVAL] Error resolviendo LID ${texto}:`,
            error?.message || error
        );

        return null;
    }
}

// ============================================================
// OBTENER JID DEL REMITENTE
// ============================================================

function obtenerJidRemitente(msg) {
    if (!msg) return null;

    // En grupos normalmente está aquí.
    if (msg.key?.participant) {
        return msg.key.participant;
    }

    // Algunas versiones/estructuras pueden utilizar este campo.
    if (msg.participant) {
        return msg.participant;
    }

    // En chat privado el remoteJid normalmente es el usuario.
    if (msg.key?.remoteJid) {
        return msg.key.remoteJid;
    }

    return null;
}

// ============================================================
// COMPROBAR OWNER
// ============================================================

async function esOwner(msg, sock) {
    const owners = await obtenerNumerosOwners();

    if (!owners.length) {
        console.warn(
            '[EVAL] owner.json no contiene Owners.'
        );

        return false;
    }

    const jidRemitente =
        obtenerJidRemitente(msg);

    if (!jidRemitente) {
        console.warn(
            '[EVAL] No se pudo obtener el JID del remitente.'
        );

        return false;
    }

    console.log(
        `[EVAL] JID remitente: ${jidRemitente}`
    );

    // --------------------------------------------------------
    // CASO 1: JID normal
    // --------------------------------------------------------

    if (
        jidRemitente.endsWith(
            '@s.whatsapp.net'
        )
    ) {
        const numero =
            obtenerNumero(
                jidRemitente
            );

        console.log(
            `[EVAL] Número remitente: ${numero}`
        );

        return owners.includes(numero);
    }

    // --------------------------------------------------------
    // CASO 2: LID
    // --------------------------------------------------------

    if (
        jidRemitente.endsWith('@lid')
    ) {
        const pn =
            await resolverLidAPN(
                sock,
                jidRemitente
            );

        if (!pn) {
            console.warn(
                '[EVAL] No se pudo convertir LID a PN.'
            );

            return false;
        }

        const numero =
            obtenerNumero(pn);

        console.log(
            `[EVAL] Número resuelto: ${numero}`
        );

        return owners.includes(numero);
    }

    // --------------------------------------------------------
    // CASO 3: Número sin dominio
    // --------------------------------------------------------

    const numero =
        obtenerNumero(
            jidRemitente
        );

    return owners.includes(numero);
}

// ============================================================
// BLOQUEOS
// ============================================================

const BLOQUEADOS = [
    'process',
    'require',
    'module',
    'exports',
    'import',
    'global',
    'globalthis',
    'eval',
    'function',
    'asyncfunction',
    'generatorfunction',
    'webassembly',
    'child_process',
    'child_process',
    'exec',
    'execsync',
    'spawn',
    'spawnsync',
    'fork',
    'fs',
    'fs/promises',
    'readfile',
    'writefile',
    'unlink',
    'rmdir',
    'mkdir',
    'rename',
    'copyfile',
    'dotenv',
    'owner.json',
    '__dirname',
    '__filename',
    'env.'
];

// ============================================================
// VALIDAR CÓDIGO
// ============================================================

function validarCodigo(codigo) {
    const texto =
        String(codigo || '').trim();

    if (!texto) {
        return {
            valido: false,
            razon:
                'No ingresaste ningún código.'
        };
    }

    const normalizado =
        texto.toLowerCase();

    for (const bloqueado of BLOQUEADOS) {
        if (
            normalizado.includes(
                bloqueado
            )
        ) {
            return {
                valido: false,
                razon:
                    `Operación bloqueada: ${bloqueado}`
            };
        }
    }

    return {
        valido: true
    };
}

// ============================================================
// CREAR CONTEXTO SEGURO
// ============================================================

function crearContexto(msg, sock) {
    return {
        msg: {
            key: {
                remoteJid:
                    msg?.key?.remoteJid ||
                    null,

                participant:
                    msg?.key?.participant ||
                    null,

                id:
                    msg?.key?.id ||
                    null,

                fromMe:
                    Boolean(
                        msg?.key?.fromMe
                    )
            }
        },

        sock: {
            user: sock?.user
                ? {
                    id:
                        sock.user.id ||
                        null,

                    name:
                        sock.user.name ||
                        null
                }
                : null
        },

        Math,
        JSON,
        String,
        Number,
        Boolean,
        Array,
        Object,
        Date
    };
}

// ============================================================
// EVALUAR
// ============================================================

function evaluarSeguro(
    codigo,
    msg,
    sock
) {
    const validacion =
        validarCodigo(codigo);

    if (!validacion.valido) {
        throw new Error(
            validacion.razon
        );
    }

    const contexto =
        crearContexto(
            msg,
            sock
        );

    const nombres =
        Object.keys(contexto);

    const valores =
        Object.values(contexto);

    const ejecutar =
        new Function(
            ...nombres,
            `"use strict"; return (${codigo});`
        );

    return ejecutar(...valores);
}

// ============================================================
// OBTENER TIPO
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
// CONVERTIR RESULTADO
// ============================================================

function convertirResultado(valor) {
    if (valor === undefined) {
        return 'undefined';
    }

    if (valor === null) {
        return 'null';
    }

    if (
        typeof valor === 'string' ||
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
// RESULTADO EXITOSO
// ============================================================

function resultadoExito(valor) {
    const tipo =
        obtenerTipo(valor);

    const contenido =
        convertirResultado(valor);

    return (
        '⚙️ *ᴇᴠᴀʟ ʀᴇsᴜʟᴛ*\n\n' +

        '╭┈┈⬡「 📋 *ɪɴғᴏ* 」\n' +
        '┃\n' +
        '┃ ✅ *Success*\n' +
        `┃ Type: ${tipo}\n` +
        '╰┈┈┈┈┈┈┈┈⬡\n\n' +

        '```text\n' +
        contenido +
        '\n```'
    );
}

// ============================================================
// RESULTADO ERROR
// ============================================================

function resultadoError(error) {
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

        '```text\n' +
        mensaje +
        '\n```'
    );
}

// ============================================================
// COMANDO EVAL
// ============================================================

export default {

    nombre: 'eval',

    categoria: 'Owner',

    alias: [
        'e',
        'ev'
    ],

    descripcion:
        'Evalúa expresiones JavaScript seguras. Exclusivo del Owner.',

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
                await esOwner(
                    msg,
                    sock
                );

            if (!autorizado) {

                await responder.texto(
                    '🔐 *ᴇᴠᴀʟ*\n\n' +
                    '❌ Este comando es exclusivo del Owner.'
                );

                return;
            }

            // ------------------------------------------------
            // CÓDIGO
            // ------------------------------------------------

            const codigo =
                String(
                    argumento || ''
                ).trim();

            if (!codigo) {

                await responder.texto(
                    '⚙️ *ᴇᴠᴀʟ*\n\n' +

                    '> Ingresa código JavaScript!\n\n' +

                    '*Ejemplo:*\n' +
                    '> => 1 + 1\n' +
                    '> => msg.key\n' +
                    '> => sock.user\n' +
                    '> => Math.max(10, 25)'
                );

                return;
            }

            console.log(
                '=========================================='
            );

            console.log(
                `[EVAL] Código: ${codigo}`
            );

            // ------------------------------------------------
            // EJECUTAR
            // ------------------------------------------------

            try {

                const resultado =
                    evaluarSeguro(
                        codigo,
                        msg,
                        sock
                    );

                console.log(
                    `[EVAL] Resultado: ${String(resultado)}`
                );

                await responder.texto(
                    resultadoExito(
                        resultado
                    )
                );

            } catch (error) {

                console.error(
                    '[EVAL] Error:',
                    error?.message ||
                    error
                );

                await responder.texto(
                    resultadoError(
                        error
                    )
                );
            }

            console.log(
                '=========================================='
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
                    resultadoError(
                        error
                    )
                );

            } catch (sendError) {

                console.error(
                    '[EVAL] Error enviando respuesta:',
                    sendError?.message ||
                    sendError
                );
            }
        }
    }
};