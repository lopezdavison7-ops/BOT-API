// ============================================================
// BOT-API
// COMANDO: DELOWNER
// ============================================================
// Elimina un propietario del bot.
//
// Compatible con Baileys 7.
// Soporta:
//   • Mención directa
//   • Respuesta a un mensaje
//   • Owners almacenados como LID
//   • Conversión LID -> PN mediante lidMapping
//
// Ejemplos:
//   .delowner @usuario
//   .delowner 505XXXXXXXX
//
// O respondiendo a un mensaje:
//   .delowner
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
// LIMPIAR JID
// ============================================================

function limpiarJid(valor) {
    if (!valor) {
        return null;
    }

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
// OBTENER LID
// ============================================================

function obtenerLidJid(owner) {
    const valor = limpiarJid(owner);

    if (!valor) {
        return null;
    }

    if (valor.endsWith('@lid')) {
        return valor;
    }

    if (valor.endsWith('@s.whatsapp.net')) {
        return null;
    }

    const numero = valor.replace(/[^0-9]/g, '');

    if (!numero) {
        return null;
    }

    return `${numero}@lid`;
}

// ============================================================
// NORMALIZAR PN
// ============================================================

function normalizarPN(valor) {
    if (!valor) {
        return null;
    }

    const texto = String(valor).trim();

    if (!texto) {
        return null;
    }

    if (texto.includes('@')) {
        try {
            return jidNormalizedUser(texto);
        } catch {
            // Continuamos con limpieza manual.
        }
    }

    const numero = texto.replace(/[^0-9]/g, '');

    if (!numero) {
        return null;
    }

    return `${numero}@s.whatsapp.net`;
}

// ============================================================
// RESOLVER LID -> PN
// ============================================================

async function resolverPN(sock, owner) {
    const valor = limpiarJid(owner);

    if (!valor) {
        return null;
    }

    // Si ya es PN.
    if (valor.endsWith('@s.whatsapp.net')) {
        return normalizarPN(valor);
    }

    const lid = obtenerLidJid(owner);

    if (!lid) {
        return null;
    }

    const mapping =
        sock?.signalRepository?.lidMapping;

    if (
        !mapping ||
        typeof mapping.getPNForLID !== 'function'
    ) {
        console.error(
            '[DELOWNER] getPNForLID no está disponible.'
        );

        return null;
    }

    try {
        const resultado =
            await mapping.getPNForLID(lid);

        if (!resultado) {
            console.warn(
                `[DELOWNER] No existe mapping para ${lid}`
            );

            return null;
        }

        const pn = normalizarPN(resultado);

        if (!pn) {
            return null;
        }

        console.log(
            `[DELOWNER] LID ${lid} -> PN ${pn}`
        );

        return pn;

    } catch (error) {
        console.error(
            `[DELOWNER] Error resolviendo ${lid}:`,
            error?.message || error
        );

        return null;
    }
}

// ============================================================
// OBTENER LID DE UN PN
// ============================================================

async function resolverLIDDesdePN(sock, pn) {
    if (!pn) {
        return null;
    }

    const mapping =
        sock?.signalRepository?.lidMapping;

    if (!mapping) {
        return null;
    }

    // Algunas versiones pueden disponer de getLIDForPN.
    if (
        typeof mapping.getLIDForPN === 'function'
    ) {
        try {
            const resultado =
                await mapping.getLIDForPN(pn);

            if (resultado) {
                if (
                    String(resultado).includes('@')
                ) {
                    return String(resultado);
                }

                return `${resultado}@lid`;
            }
        } catch (error) {
            console.warn(
                '[DELOWNER] No se pudo obtener LID desde PN:',
                error?.message || error
            );
        }
    }

    return null;
}

// ============================================================
// OBTENER NÚMERO
// ============================================================

function obtenerNumero(jid) {
    if (!jid) {
        return null;
    }

    const numero =
        String(jid)
            .split('@')[0]
            .replace(/[^0-9]/g, '');

    return numero || null;
}

// ============================================================
// LEER OWNERS
// ============================================================

async function leerOwners() {
    const raw =
        await fs.readFile(
            OWNER_FILE,
            'utf8'
        );

    const data =
        JSON.parse(raw);

    if (Array.isArray(data)) {
        return data;
    }

    if (Array.isArray(data?.owners)) {
        return data.owners;
    }

    if (Array.isArray(data?.owner)) {
        return data.owner;
    }

    if (
        data &&
        typeof data === 'object'
    ) {
        return Object.values(data).filter(
            value =>
                typeof value === 'string' ||
                typeof value === 'object'
        );
    }

    return [];
}

// ============================================================
// GUARDAR OWNERS
// ============================================================

async function guardarOwners(owners) {
    const contenido =
        JSON.stringify(
            {
                owners
            },
            null,
            2
        ) + '\n';

    await fs.writeFile(
        OWNER_FILE,
        contenido,
        'utf8'
    );
}

// ============================================================
// OBTENER JID DEL OBJETIVO
// ============================================================

function obtenerObjetivoDesdeMensaje(msg) {
    // --------------------------------------------------------
    // 1. Mención
    // --------------------------------------------------------

    const mencionados =
        msg?.message?.extendedTextMessage
            ?.contextInfo
            ?.mentionedJid;

    if (
        Array.isArray(mencionados) &&
        mencionados.length > 0
    ) {
        return mencionados[0];
    }

    // --------------------------------------------------------
    // 2. Mensaje citado
    // --------------------------------------------------------

    const citado =
        msg?.message?.extendedTextMessage
            ?.contextInfo
            ?.participant;

    if (citado) {
        return citado;
    }

    return null;
}

// ============================================================
// OBTENER ARGUMENTO COMO JID
// ============================================================

function obtenerJidDesdeArgumento(argumento) {
    if (!argumento) {
        return null;
    }

    const texto =
        String(argumento).trim();

    if (!texto) {
        return null;
    }

    // Busca un JID PN.
    const jidPN =
        texto.match(
            /\d+@s\.whatsapp\.net/
        );

    if (jidPN) {
        return jidPN[0];
    }

    // Busca un JID LID.
    const jidLID =
        texto.match(
            /\d+@lid/
        );

    if (jidLID) {
        return jidLID[0];
    }

    // Busca un número.
    const numero =
        texto.replace(
            /[^0-9]/g,
            ''
        );

    if (!numero) {
        return null;
    }

    return `${numero}@s.whatsapp.net`;
}

// ============================================================
// COMPARAR OWNERS
// ============================================================

async function encontrarOwner(
    sock,
    owners,
    objetivo
) {
    const objetivoPN =
        normalizarPN(
            objetivo
        );

    if (!objetivoPN) {
        return null;
    }

    for (
        let i = 0;
        i < owners.length;
        i++
    ) {
        const owner =
            owners[i];

        const ownerPN =
            await resolverPN(
                sock,
                owner
            );

        if (!ownerPN) {
            continue;
        }

        if (
            ownerPN === objetivoPN
        ) {
            return {
                index: i,
                owner,
                pn: ownerPN
            };
        }
    }

    return null;
}

// ============================================================
// COMANDO
// ============================================================

export default {
    nombre: 'delowner',

    categoria: 'Owner',

    alias: [
        'removeowner',
        'quitarowner',
        'deleteowner'
    ],

    descripcion:
        'Elimina un propietario mediante mención o respuesta.',

    ejecutar: async ({
        msg,
        sock,
        responder,
        argumento
    }) => {

        try {

            // ------------------------------------------------
            // LEER OWNERS
            // ------------------------------------------------

            const owners =
                await leerOwners();

            if (
                !Array.isArray(owners) ||
                owners.length === 0
            ) {
                await responder.texto(
                    '❌ No hay propietarios registrados.'
                );

                return;
            }

            // ------------------------------------------------
            // COMPROBAR QUIÉN EJECUTA
            // ------------------------------------------------

            const ejecutor =
                msg?.key?.participant ||
                msg?.key?.remoteJid;

            if (!ejecutor) {
                await responder.texto(
                    '❌ No pude identificar al usuario.'
                );

                return;
            }

            const ejecutorPN =
                normalizarPN(
                    ejecutor
                );

            let esOwner = false;

            for (
                const owner of owners
            ) {

                const ownerPN =
                    await resolverPN(
                        sock,
                        owner
                    );

                if (
                    ownerPN &&
                    ejecutorPN &&
                    ownerPN === ejecutorPN
                ) {
                    esOwner = true;
                    break;
                }
            }

            // ------------------------------------------------
            // SOLO OWNERS
            // ------------------------------------------------

            if (!esOwner) {

                await responder.texto(
                    '╭〔 🔐 𝐃𝐄𝐋𝐎𝐖𝐍𝐄𝐑 〕⬣\n' +
                    '┃\n' +
                    '┃ ❌ Solo los propietarios\n' +
                    '┃ pueden usar este comando.\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );

                return;
            }

            // ------------------------------------------------
            // OBTENER OBJETIVO
            // ------------------------------------------------

            let objetivo =
                obtenerObjetivoDesdeMensaje(
                    msg
                );

            // Si no hay mención/respuesta,
            // intentamos usar el argumento.
            if (!objetivo) {

                objetivo =
                    obtenerJidDesdeArgumento(
                        argumento
                    );
            }

            if (!objetivo) {

                await responder.texto(
                    '╭〔 👑 𝐃𝐄𝐋𝐎𝐖𝐍𝐄𝐑 〕⬣\n' +
                    '┃\n' +
                    '┃ ❌ Debes mencionar al owner\n' +
                    '┃ que deseas eliminar o\n' +
                    '┃ responder a su mensaje.\n' +
                    '┃\n' +
                    '┃ 📌 Ejemplo:\n' +
                    '┃ › .delowner @usuario\n' +
                    '┃\n' +
                    '┃ ↩️ O responde a su mensaje\n' +
                    '┃ con *.delowner*\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );

                return;
            }

            // ------------------------------------------------
            // NORMALIZAR OBJETIVO
            // ------------------------------------------------

            const objetivoPN =
                normalizarPN(
                    objetivo
                );

            if (!objetivoPN) {

                await responder.texto(
                    '❌ No pude identificar correctamente al usuario objetivo.'
                );

                return;
            }

            console.log(
                `[DELOWNER] Objetivo PN: ${objetivoPN}`
            );

            // ------------------------------------------------
            // BUSCAR OWNER
            // ------------------------------------------------

            const encontrado =
                await encontrarOwner(
                    sock,
                    owners,
                    objetivoPN
                );

            if (!encontrado) {

                await responder.texto(
                    '╭〔 👑 𝐃𝐄𝐋𝐎𝐖𝐍𝐄𝐑 〕⬣\n' +
                    '┃\n' +
                    '┃ ❌ Ese usuario no es owner.\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );

                return;
            }

            // ------------------------------------------------
            // EVITAR ELIMINAR AL ÚLTIMO OWNER
            // ------------------------------------------------

            if (owners.length <= 1) {

                await responder.texto(
                    '╭〔 👑 𝐃𝐄𝐋𝐎𝐖𝐍𝐄𝐑 〕⬣\n' +
                    '┃\n' +
                    '┃ ⚠️ No puedes eliminar al\n' +
                    '┃ único propietario del bot.\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );

                return;
            }

            // ------------------------------------------------
            // ELIMINAR
            // ------------------------------------------------

            const nuevosOwners =
                owners.filter(
                    (_, index) =>
                        index !==
                        encontrado.index
                );

            await guardarOwners(
                nuevosOwners
            );

            // ------------------------------------------------
            // MENCIÓN DEL ELIMINADO
            // ------------------------------------------------

            const numero =
                obtenerNumero(
                    encontrado.pn
                );

            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    text:
                        '╭〔 👑 𝐃𝐄𝐋𝐎𝐖𝐍𝐄𝐑 〕⬣\n' +
                        '┃\n' +
                        `┃ ✅ Owner eliminado: @${numero}\n` +
                        '┃\n' +
                        `┃ 👑 Owners restantes: ${nuevosOwners.length}\n` +
                        '┃\n' +
                        '╰━━━━━━━━━━━━━━━━⬣\n\n' +
                        '╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣',

                    mentions: [
                        encontrado.pn
                    ]
                },
                {
                    quoted: msg
                }
            );

            console.log(
                `[DELOWNER] Owner eliminado: ${encontrado.pn}`
            );

        } catch (error) {

            console.error(
                '[DELOWNER] Error:',
                error?.stack ||
                error?.message ||
                error
            );

            await responder.texto(
                '❌ Error al eliminar el propietario.'
            );
        }
    }
};