// ============================================================
// BOT-API
// COMANDO: DELOWNER
// ============================================================
// Elimina un propietario del bot.
//
// Uso:
//
// .delowner @usuario
//
// O respondiendo al mensaje del usuario:
//
// .delowner
//
// Compatible con Baileys 7.
// Soporta owners almacenados como LID.
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
// LEER OWNER.JSON
// ============================================================

async function leerDatabase() {

    const raw =
        await fs.readFile(
            OWNER_FILE,
            'utf8'
        );

    const data =
        JSON.parse(raw);

    if (
        !data ||
        typeof data !== 'object'
    ) {
        throw new Error(
            'La base de datos de owners no es válida.'
        );
    }

    if (
        !Array.isArray(data.owners)
    ) {
        data.owners = [];
    }

    return data;
}

// ============================================================
// GUARDAR OWNER.JSON
// ============================================================

async function guardarDatabase(
    data
) {

    await fs.writeFile(
        OWNER_FILE,
        JSON.stringify(
            data,
            null,
            2
        ),
        'utf8'
    );
}

// ============================================================
// LIMPIAR JID
// ============================================================

function limpiarJid(valor) {

    if (!valor) {
        return null;
    }

    if (
        typeof valor === 'object'
    ) {

        valor =
            valor.lid ||
            valor.jid ||
            valor.id ||
            valor.number ||
            valor.numero ||
            valor.phone ||
            '';
    }

    const texto =
        String(valor).trim();

    if (!texto) {
        return null;
    }

    return texto;
}

// ============================================================
// OBTENER LID JID
// ============================================================

function obtenerLidJid(
    owner
) {

    const valor =
        limpiarJid(owner);

    if (!valor) {
        return null;
    }

    if (
        valor.endsWith('@lid')
    ) {

        return valor;
    }

    if (
        valor.endsWith(
            '@s.whatsapp.net'
        )
    ) {

        return valor;
    }

    const numero =
        valor.replace(
            /[^0-9]/g,
            ''
        );

    if (!numero) {
        return null;
    }

    return `${numero}@lid`;
}

// ============================================================
// NORMALIZAR PN
// ============================================================

function normalizarPN(
    valor
) {

    if (!valor) {
        return null;
    }

    let texto =
        String(valor).trim();

    if (!texto) {
        return null;
    }

    if (
        texto.includes('@')
    ) {

        try {

            return jidNormalizedUser(
                texto
            );

        } catch {
            // Continuar con limpieza.
        }
    }

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
// RESOLVER LID -> PN
// ============================================================

async function resolverPN(
    sock,
    owner
) {

    const valor =
        limpiarJid(owner);

    if (!valor) {
        return null;
    }

    // Ya es PN.
    if (
        valor.endsWith(
            '@s.whatsapp.net'
        )
    ) {

        return normalizarPN(
            valor
        );
    }

    const lid =
        obtenerLidJid(
            owner
        );

    if (!lid) {
        return null;
    }

    const mapping =
        sock?.signalRepository?.lidMapping;

    if (
        !mapping ||
        typeof mapping.getPNForLID !==
            'function'
    ) {

        return null;
    }

    try {

        const resultado =
            await mapping.getPNForLID(
                lid
            );

        return normalizarPN(
            resultado
        );

    } catch {
        return null;
    }
}

// ============================================================
// OBTENER NÚMERO
// ============================================================

function obtenerNumero(
    jid
) {

    if (!jid) {
        return null;
    }

    const numero =
        String(jid)
            .split('@')[0]
            .replace(
                /[^0-9]/g,
                ''
            );

    return numero || null;
}

// ============================================================
// OBTENER JID DEL USUARIO QUE EJECUTA
// ============================================================

function obtenerAutor(
    msg
) {

    if (
        msg?.key?.participant
    ) {

        return msg.key.participant;
    }

    if (
        msg?.participant
    ) {

        return msg.participant;
    }

    if (
        msg?.key?.remoteJid &&
        !msg.key.remoteJid.endsWith(
            '@g.us'
        )
    ) {

        return msg.key.remoteJid;
    }

    return null;
}

// ============================================================
// OBTENER USUARIO OBJETIVO
// ============================================================

function obtenerObjetivo(
    msg
) {

    // --------------------------------------------------------
    // 1. MENCIÓN
    // --------------------------------------------------------

    const mencionados =
        msg?.message?.extendedTextMessage
            ?.contextInfo
            ?.mentionedJid ||
        msg?.message?.contextInfo
            ?.mentionedJid ||
        [];

    if (
        Array.isArray(mencionados) &&
        mencionados.length > 0
    ) {

        return mencionados[0];
    }

    // --------------------------------------------------------
    // 2. RESPUESTA A UN MENSAJE
    // --------------------------------------------------------

    const contexto =
        msg?.message
            ?.extendedTextMessage
            ?.contextInfo;

    const participante =
        contexto?.participant;

    if (participante) {

        return participante;
    }

    return null;
}

// ============================================================
// COMPROBAR SI UN USUARIO ES OWNER
// ============================================================

async function esOwner(
    sock,
    owners,
    jid
) {

    if (!jid) {
        return false;
    }

    const objetivoPN =
        normalizarPN(
            jid
        );

    if (!objetivoPN) {
        return false;
    }

    for (
        const owner of owners
    ) {

        const ownerPN =
            await resolverPN(
                sock,
                owner
            );

        if (
            ownerPN === objetivoPN
        ) {

            return true;
        }
    }

    return false;
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
        responder
    }) => {

        try {

            // ------------------------------------------------
            // LEER DATABASE
            // ------------------------------------------------

            const data =
                await leerDatabase();

            const owners =
                data.owners;

            if (
                owners.length === 0
            ) {

                await responder.texto(
                    '❌ No hay owners registrados.'
                );

                return;
            }

            // ------------------------------------------------
            // COMPROBAR QUIÉN EJECUTA
            // ------------------------------------------------

            const autor =
                obtenerAutor(
                    msg
                );

            const autorizado =
                await esOwner(
                    sock,
                    owners,
                    autor
                );

            if (!autorizado) {

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

            const objetivo =
                obtenerObjetivo(
                    msg
                );

            if (!objetivo) {

                await responder.texto(
                    '╭〔 👑 𝐃𝐄𝐋𝐎𝐖𝐍𝐄𝐑 〕⬣\n' +
                    '┃\n' +
                    '┃ ❌ Debes mencionar a un owner\n' +
                    '┃ o responder a su mensaje.\n' +
                    '┃\n' +
                    '┃ 📌 Ejemplos:\n' +
                    '┃ › .delowner @usuario\n' +
                    '┃ › Responder → .delowner\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );

                return;
            }

            // ------------------------------------------------
            // RESOLVER OBJETIVO A PN
            // ------------------------------------------------

            const objetivoPN =
                await resolverPN(
                    sock,
                    objetivo
                );

            if (!objetivoPN) {

                await responder.texto(
                    '❌ No pude resolver el usuario seleccionado.'
                );

                return;
            }

            const objetivoNumero =
                obtenerNumero(
                    objetivoPN
                );

            // ------------------------------------------------
            // BUSCAR OWNER
            // ------------------------------------------------

            let indiceOwner = -1;

            for (
                let i = 0;
                i < owners.length;
                i++
            ) {

                const ownerPN =
                    await resolverPN(
                        sock,
                        owners[i]
                    );

                if (
                    ownerPN === objetivoPN
                ) {

                    indiceOwner = i;
                    break;
                }
            }

            // ------------------------------------------------
            // NO ES OWNER
            // ------------------------------------------------

            if (
                indiceOwner === -1
            ) {

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

            if (
                owners.length === 1
            ) {

                await responder.texto(
                    '❌ No puedes eliminar al último owner del bot.'
                );

                return;
            }

            // ------------------------------------------------
            // GUARDAR LID ORIGINAL
            // ------------------------------------------------

            const eliminado =
                owners[indiceOwner];

            // ------------------------------------------------
            // ELIMINAR
            // ------------------------------------------------

            owners.splice(
                indiceOwner,
                1
            );

            await guardarDatabase(
                data
            );

            // ------------------------------------------------
            // CONFIRMACIÓN
            // ------------------------------------------------

            const numero =
                objetivoNumero;

            const jidMention =
                objetivoPN;

            const texto =
                '╭〔 👑 𝐃𝐄𝐋𝐎𝐖𝐍𝐄𝐑 〕⬣\n' +
                '┃\n' +
                `┃ ✅ Owner eliminado correctamente.\n` +
                '┃\n' +
                `┃ 👤 Usuario: @${numero}\n` +
                `┃ 📌 Owners restantes: ${owners.length}\n` +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣\n\n' +
                '╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣';

            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    text: texto,
                    mentions: [
                        jidMention
                    ]
                },
                {
                    quoted: msg
                }
            );

            console.log(
                `[DELOWNER] Owner eliminado: ${eliminado}`
            );

            console.log(
                `[DELOWNER] PN: ${objetivoPN}`
            );

            console.log(
                `[DELOWNER] Owners restantes: ${owners.length}`
            );

        } catch (error) {

            console.error(
                '[DELOWNER] Error:',
                error?.stack ||
                error?.message ||
                error
            );

            await responder.texto(
                '❌ Ocurrió un error al eliminar el owner.'
            );
        }
    }
};