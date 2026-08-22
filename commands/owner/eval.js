// ============================================================
// BOT-API
// COMANDO: EVAL
// ============================================================
// Owner-only.
// Ejecuta y verifica JavaScript.
// Compatible con el handler actual de BOT-API.
// ============================================================

import fs from 'fs/promises';
import path from 'path';
import util from 'util';

// ============================================================
// BASE DE DATOS DE OWNERS
// ============================================================

const OWNER_FILE = path.join(
    process.cwd(),
    'database',
    'owner.json'
);

// ============================================================
// NORMALIZAR NÚMERO
// ============================================================

function normalizarNumero(valor) {
    if (!valor) return '';

    if (typeof valor === 'object') {
        valor =
            valor.number ||
            valor.numero ||
            valor.phone ||
            valor.jid ||
            valor.id ||
            valor.participant ||
            '';
    }

    return String(valor)
        .trim()
        .split('@')[0]
        .split(':')[0]
        .replace(/\D/g, '');
}

// ============================================================
// OBTENER REMITENTE REAL
// ============================================================

function obtenerRemitente(msg) {

    // En grupos, el usuario viene aquí.
    if (
        msg?.key?.participant &&
        msg.key.participant !== 'status@broadcast'
    ) {
        return msg.key.participant;
    }

    // En chat privado, remoteJid normalmente es el usuario.
    if (
        msg?.key?.remoteJid &&
        msg.key.remoteJid !== 'status@broadcast'
    ) {
        return msg.key.remoteJid;
    }

    // Compatibilidad adicional.
    return (
        msg?.sender ||
        msg?.participant ||
        ''
    );
}

// ============================================================
// LEER OWNERS
// ============================================================

async function leerOwners() {

    try {

        const contenido =
            await fs.readFile(
                OWNER_FILE,
                'utf8'
            );

        const data =
            JSON.parse(contenido);

        if (Array.isArray(data)) {
            return data;
        }

        if (Array.isArray(data?.owners)) {
            return data.owners;
        }

        return [];

    } catch (error) {

        console.error(
            '[EVAL] No se pudo leer owner.json:',
            error?.message || error
        );

        return [];
    }
}

// ============================================================
// COMPROBAR OWNER
// ============================================================

async function verificarOwner(msg) {

    const remitente =
        obtenerRemitente(msg);

    const numeroRemitente =
        normalizarNumero(
            remitente
        );

    const owners =
        await leerOwners();

    const ownersNormalizados =
        owners
            .map(normalizarNumero)
            .filter(Boolean);

    const autorizado =
        ownersNormalizados.includes(
            numeroRemitente
        );

    console.log(
        '\n========== EVAL OWNER =========='
    );

    console.log(
        '[EVAL] Remitente:',
        remitente
    );

    console.log(
        '[EVAL] Número:',
        numeroRemitente
    );

    console.log(
        '[EVAL] Owners:',
        ownersNormalizados
    );

    console.log(
        '[EVAL] Autorizado:',
        autorizado
    );

    console.log(
        '================================\n'
    );

    return autorizado;
}

// ============================================================
// FORMATEAR RESULTADO
// ============================================================

function formatearResultado(resultado) {

    if (resultado === undefined) {
        return 'undefined';
    }

    if (resultado === null) {
        return 'null';
    }

    if (typeof resultado === 'string') {
        return resultado;
    }

    try {

        return util.inspect(
            resultado,
            {
                depth: 8,
                colors: false,
                compact: false
            }
        );

    } catch {

        return String(resultado);
    }
}

// ============================================================
// FUNCIÓN ASÍNCRONA
// ============================================================

const AsyncFunction =
    Object.getPrototypeOf(
        async function () {}
    ).constructor;

// ============================================================
// COMANDO EVAL
// ============================================================

export default {

    nombre: 'eval',

    categoria: 'Owner',

    alias: [
        'ev',
        'evaluate'
    ],

    descripcion:
        'Ejecuta JavaScript para verificar y probar el bot. Solo Owner.',

    ejecutar: async ({
        msg,
        sock,
        argumento,
        responder
    }) => {

        try {

            // ==================================================
            // VERIFICAR OWNER
            // ==================================================

            const esOwner =
                await verificarOwner(msg);

            if (!esOwner) {

                await responder.texto(
                    '🔐 *ᴇᴠᴀʟ*\n\n' +
                    '❌ Este comando es exclusivo del Owner.'
                );

                return;
            }

            // ==================================================
            // SIN CÓDIGO
            // ==================================================

            if (
                !argumento ||
                !argumento.trim()
            ) {

                await responder.texto(
                    '⚙️ *ᴇᴠᴀʟ*\n\n' +
                    '> Ingresa código JavaScript!\n\n' +
                    'Ejemplo:\n' +
                    '> => 1 + 1\n' +
                    '> => msg.key\n' +
                    '> => sock.user'
                );

                return;
            }

            // ==================================================
            // LIMPIAR CÓDIGO
            // ==================================================

            let codigo =
                argumento.trim();

            if (
                codigo.startsWith('=>')
            ) {
                codigo =
                    codigo
                        .slice(2)
                        .trim();
            }

            // ==================================================
            // EJECUTAR
            // ==================================================

            const resultado =
                await AsyncFunction(
                    'sock',
                    'msg',
                    'responder',
                    'util',
                    `
                    "use strict";

                    return await (
                        ${codigo}
                    );
                    `
                )(
                    sock,
                    msg,
                    responder,
                    util
                );

            // ==================================================
            // RESULTADO
            // ==================================================

            const salida =
                formatearResultado(
                    resultado
                );

            const respuesta =
                '⚙️ *ᴇᴠᴀʟ ʀᴇsᴜʟᴛ*\n\n' +

                '╭┈┈⬡「 📋 *ɪɴғᴏ* 」\n' +
                '┃ ✅ Success\n' +
                `┃ Type: ${typeof resultado}\n` +
                '╰┈┈┈┈┈┈┈┈⬡\n\n' +

                '```' +
                salida +
                '```';

            await responder.texto(
                respuesta
            );

        } catch (error) {

            // ==================================================
            // ERROR
            // ==================================================

            const salidaError =
                error?.stack ||
                error?.message ||
                String(error);

            const respuesta =
                '⚙️ *ᴇᴠᴀʟ ʀᴇsᴜʟᴛ*\n\n' +

                '╭┈┈⬡「 📋 *ɪɴғᴏ* 」\n' +
                '┃ ❌ Error\n' +
                `┃ Type: ${error?.name || 'Error'}\n` +
                '╰┈┈┈┈┈┈┈┈⬡\n\n' +

                '```' +
                salidaError +
                '```';

            await responder.texto(
                respuesta
            );

            console.error(
                '[EVAL] Error:',
                error?.stack ||
                error
            );
        }
    }
};