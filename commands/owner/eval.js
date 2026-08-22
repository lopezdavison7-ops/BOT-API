// ============================================================
// BOT-API
// COMANDO: EVAL
// ============================================================
// Ejecuta JavaScript únicamente para los Owners.
// Compatible con el handler actual de BOT-API.
// Lee los Owners desde database/owner.json.
// ============================================================

import fs from 'fs/promises';
import path from 'path';
import util from 'util';

// ============================================================
// CONFIGURACIÓN
// ============================================================

const OWNER_FILE = path.join(
    process.cwd(),
    'database',
    'owner.json'
);

// ============================================================
// OBTENER NÚMERO DESDE CUALQUIER FORMATO
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
            '';
    }

    return String(valor)
        .split('@')[0]
        .split(':')[0]
        .replace(/\D/g, '');
}

// ============================================================
// LEER OWNERS
// ============================================================

async function obtenerOwners() {
    try {
        const contenido = await fs.readFile(
            OWNER_FILE,
            'utf8'
        );

        const data = JSON.parse(contenido);

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
// COMPROBAR OWNER
// ============================================================

async function esOwner(msg) {
    const sender = normalizarNumero(
        msg?.key?.participant ||
        msg?.participant ||
        msg?.sender ||
        ''
    );

    if (!sender) {
        return false;
    }

    const owners = await obtenerOwners();

    const ownersNormalizados = owners
        .map(normalizarNumero)
        .filter(Boolean);

    const autorizado =
        ownersNormalizados.includes(sender);

    console.log(
        `[EVAL] Usuario: ${sender} | Owners: ${ownersNormalizados.join(', ')} | Autorizado: ${autorizado}`
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
        return util.inspect(resultado, {
            depth: 6,
            colors: false,
            compact: false
        });
    } catch {
        return String(resultado);
    }
}

// ============================================================
// COMANDO
// ============================================================

export default {

    nombre: 'eval',

    categoria: 'Owner',

    alias: [
        'ev',
        'evaluate'
    ],

    descripcion:
        'Ejecuta código JavaScript para verificar y probar el bot. Solo Owner.',

    ejecutar: async ({
        msg,
        sock,
        argumento,
        responder
    }) => {

        try {

            // ------------------------------------------------
            // SEGURIDAD: OWNER
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
            // SIN CÓDIGO
            // ------------------------------------------------

            if (!argumento || !argumento.trim()) {

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

            // ------------------------------------------------
            // PREPARAR CÓDIGO
            // ------------------------------------------------

            let codigo =
                argumento.trim();

            // Permite:
            // .eval => 1 + 1
            // .eval 1 + 1
            // .eval await sock.user
            codigo =
                codigo.replace(/^=>\s*/, '').trim();

            // ------------------------------------------------
            // CONTEXTO DISPONIBLE
            // ------------------------------------------------

            const resultado =
                await AsyncFunction(
                    'sock',
                    'msg',
                    'argumento',
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
                    argumento,
                    responder,
                    util
                );

            const salida =
                formatearResultado(
                    resultado
                );

            // ------------------------------------------------
            // RESULTADO
            // ------------------------------------------------

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

            // ------------------------------------------------
            // ERROR DE EVALUACIÓN
            // ------------------------------------------------

            const mensajeError =
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
                mensajeError +
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

// ============================================================
// ASYNC FUNCTION
// ============================================================

const AsyncFunction =
    Object.getPrototypeOf(
        async function () {}
    ).constructor;