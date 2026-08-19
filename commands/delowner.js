// ============================================================
// BOT-API
// COMANDO: DELOWNER
// ============================================================
// Elimina un propietario del bot.
//
// Compatible con Baileys 7.
// Soporta:
//   .delowner @mencion
//   responder a un mensaje + .delowner
//
// owner.json almacena los propietarios como LID.
// Este comando compara correctamente LID <-> PN.
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
// LIMPIAR IDENTIFICADOR
// ============================================================

function limpiarId(valor) {

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

    const texto =
        String(valor).trim();

    if (!texto) {
        return null;
    }

    return texto;
}

// ============================================================
// NORMALIZAR LID
// ============================================================

function normalizarLid(valor) {

    const texto =
        limpiarId(valor);

    if (!texto) {
        return null;
    }

    if (
        texto.endsWith('@lid')
    ) {
        return texto;
    }

    const numero =
        texto
            .split('@')[0]
            .replace(
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

function normalizarPN(valor) {

    const texto =
        limpiarId(valor);

    if (!texto) {
        return null;
    }

    if (
        texto.endsWith(
            '@s.whatsapp.net'
        )
    ) {
        return texto;
    }

    const numero =
        texto
            .split('@')[0]
            .replace(
                /[^0-9]/g,
                ''
            );

    if (!numero) {
        return null;
    }

    return `${numero}@s.whatsapp.net`;
}

// ============================================================
// OBTENER LID DESDE PN
// ============================================================

async function obtenerLidDesdePN(
    sock,
    pn
) {

    if (!sock || !pn) {
        return null;
    }

    const mapping =
        sock?.signalRepository?.lidMapping;

    if (
        !mapping ||
        typeof mapping.getLIDForPN !==
            'function'
    ) {
        return null;
    }

    try {

        const resultado =
            await mapping.getLIDForPN(
                pn
            );

        if (!resultado) {
            return null;
        }

        return normalizarLid(
            resultado
        );

    } catch (error) {

        console.error(
            '[DELOWNER] Error PN -> LID:',
            error?.message ||
            error
        );

        return null;
    }
}

// ============================================================
// OBTENER PN DESDE LID
// ============================================================

async function obtenerPNDesdeLid(
    sock,
    lid
) {

    if (!sock || !lid) {
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

        if (!resultado) {
            return null;
        }

        return normalizarPN(
            resultado
        );

    } catch (error) {

        console.error(
            '[DELOWNER] Error LID -> PN:',
            error?.message ||
            error
        );

        return null;
    }
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

    if (
        Array.isArray(data)
    ) {
        return data;
    }

    if (
        Array.isArray(
            data?.owners
        )
    ) {
        return data.owners;
    }

    return [];
}

// ============================================================
// GUARDAR OWNERS
// ============================================================

async function guardarOwners(
    owners
) {

    await fs.writeFile(
        OWNER_FILE,
        JSON.stringify(
            {
                owners
            },
            null,
            2
        ) + '\n',
        'utf8'
    );
}

// ============================================================
// COMPROBAR SI ES OWNER
// ============================================================

async function esOwner(
    sock,
    msg
) {

    const owners =
        await leerOwners();

    if (
        !Array.isArray(owners) ||
        owners.length === 0
    ) {
        return false;
    }

    const posibles = [];

    // --------------------------------------------------------
    // Participant del mensaje
    // --------------------------------------------------------

    const participant =
        msg?.key?.participant;

    if (participant) {
        posibles.push(
            participant
        );
    }

    // --------------------------------------------------------
    // RemoteJid en privado
    // --------------------------------------------------------

    const remoteJid =
        msg?.key?.remoteJid;

    if (
        remoteJid &&
        remoteJid.endsWith(
            '@s.whatsapp.net'
        )
    ) {
        posibles.push(
            remoteJid
        );
    }

    // --------------------------------------------------------
    // Comparación
    // --------------------------------------------------------

    for (
        const posible of posibles
    ) {

        const texto =
            limpiarId(posible);

        if (!texto) {
            continue;
        }

        // Si el mensaje ya trae LID.
        if (
            texto.endsWith('@lid')
        ) {

            const lid =
                normalizarLid(
                    texto
                );

            if (
                owners.some(
                    owner =>
                        normalizarLid(
                            owner
                        ) === lid
                )
            ) {
                return true;
            }

            continue;
        }

        // Si trae PN.
        const pn =
            normalizarPN(
                texto
            );

        if (!pn) {
            continue;
        }

        const lid =
            await obtenerLidDesdePN(
                sock,
                pn
            );

        if (
            lid &&
            owners.some(
                owner =>
                    normalizarLid(
                        owner
                    ) === lid
            )
        ) {
            return true;
        }

        // También comprobamos PN por
        // si owner.json ya contiene PN.
        if (
            owners.some(
                owner =>
                    normalizarPN(
                        owner
                    ) === pn
            )
        ) {
            return true;
        }
    }

    return false;
}

// ============================================================
// OBTENER TARGET POR MENCIÓN
// ============================================================

function obtenerTargetPorMencion(
    msg
) {

    const context =
        msg?.message?.extendedTextMessage
            ?.contextInfo;

    const mentions =
        context?.mentionedJid;

    if (
        Array.isArray(mentions) &&
        mentions.length > 0
    ) {

        return mentions[0];
    }

    return null;
}

// ============================================================
// OBTENER TARGET POR RESPUESTA
// ============================================================

function obtenerTargetPorRespuesta(
    msg
) {

    const context =
        msg?.message?.extendedTextMessage
            ?.contextInfo;

    if (!context) {
        return null;
    }

    const participant =
        context?.participant;

    if (participant) {
        return participant;
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
        responder
    }) => {

        try {

            // ------------------------------------------------
            // 1. COMPROBAR OWNER
            // ------------------------------------------------

            const autorizado =
                await esOwner(
                    sock,
                    msg
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
            // 2. OBTENER TARGET
            // ------------------------------------------------

            let target =
                obtenerTargetPorMencion(
                    msg
                );

            // Si no hay mención,
            // intenta obtenerlo desde respuesta.
            if (!target) {

                target =
                    obtenerTargetPorRespuesta(
                        msg
                    );
            }

            if (!target) {

                await responder.texto(
                    '╭〔 🔐 𝐃𝐄𝐋𝐎𝐖𝐍𝐄𝐑 〕⬣\n' +
                    '┃\n' +
                    '┃ ❌ Debes mencionar al owner\n' +
                    '┃ que quieres eliminar o\n' +
                    '┃ responder a uno de sus mensajes.\n' +
                    '┃\n' +
                    '┃ 📌 Ejemplos:\n' +
                    '┃ › .delowner @usuario\n' +
                    '┃ › Responde su mensaje + .delowner\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );

                return;
            }

            // ------------------------------------------------
            // 3. NORMALIZAR TARGET
            // ------------------------------------------------

            const targetTexto =
                limpiarId(
                    target
                );

            let targetLid = null;
            let targetPN = null;

            if (
                targetTexto?.endsWith(
                    '@lid'
                )
            ) {

                targetLid =
                    normalizarLid(
                        targetTexto
                    );

                targetPN =
                    await obtenerPNDesdeLid(
                        sock,
                        targetLid
                    );

            } else {

                targetPN =
                    normalizarPN(
                        targetTexto
                    );

                targetLid =
                    await obtenerLidDesdePN(
                        sock,
                        targetPN
                    );
            }

            // ------------------------------------------------
            // 4. LEER OWNERS
            // ------------------------------------------------

            const owners =
                await leerOwners();

            if (
                owners.length === 0
            ) {

                await responder.texto(
                    '❌ No hay propietarios registrados.'
                );

                return;
            }

            // ------------------------------------------------
            // 5. BUSCAR OWNER
            // ------------------------------------------------

            const indice =
                owners.findIndex(
                    owner => {

                        const ownerLid =
                            normalizarLid(
                                owner
                            );

                        const ownerPN =
                            normalizarPN(
                                owner
                            );

                        // Comparar LID.
                        if (
                            targetLid &&
                            ownerLid ===
                                targetLid
                        ) {
                            return true;
                        }

                        // Comparar PN.
                        if (
                            targetPN &&
                            ownerPN ===
                                targetPN
                        ) {
                            return true;
                        }

                        // Si el target es PN,
                        // intentar convertir owner LID.
                        if (
                            targetPN &&
                            ownerLid &&
                            targetLid ===
                                ownerLid
                        ) {
                            return true;
                        }

                        return false;
                    }
                );

            // ------------------------------------------------
            // 6. OWNER NO ENCONTRADO
            // ------------------------------------------------

            if (
                indice === -1
            ) {

                await responder.texto(
                    '╭〔 🔐 𝐃𝐄𝐋𝐎𝐖𝐍𝐄𝐑 〕⬣\n' +
                    '┃\n' +
                    '┃ ❌ Ese usuario no está\n' +
                    '┃ registrado como owner.\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );

                return;
            }

            // ------------------------------------------------
            // 7. NO PERMITIR QUITAR AL ÚLTIMO OWNER
            // ------------------------------------------------

            if (
                owners.length <= 1
            ) {

                await responder.texto(
                    '╭〔 🔐 𝐃𝐄𝐋𝐎𝐖𝐍𝐄𝐑 〕⬣\n' +
                    '┃\n' +
                    '┃ ❌ No puedes eliminar al\n' +
                    '┃ último propietario del bot.\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );

                return;
            }

            // ------------------------------------------------
            // 8. ELIMINAR
            // ------------------------------------------------

            const eliminado =
                owners[indice];

            owners.splice(
                indice,
                1
            );

            await guardarOwners(
                owners
            );

            // ------------------------------------------------
            // 9. PREPARAR MENCIÓN
            // ------------------------------------------------

            let mentionJid =
                targetPN;

            if (
                !mentionJid &&
                targetLid
            ) {

                mentionJid =
                    await obtenerPNDesdeLid(
                        sock,
                        targetLid
                    );
            }

            // ------------------------------------------------
            // 10. RESPUESTA
            // ------------------------------------------------

            if (mentionJid) {

                const numero =
                    mentionJid
                        .split('@')[0];

                await sock.sendMessage(
                    msg.key.remoteJid,
                    {
                        text:
                            '╭〔 🔐 𝐃𝐄𝐋𝐎𝐖𝐍𝐄𝐑 〕⬣\n' +
                            '┃\n' +
                            `┃ ✅ Owner eliminado: @${numero}\n` +
                            '┃\n' +
                            `┃ 👑 Owners restantes: ${owners.length}\n` +
                            '┃\n' +
                            '╰━━━━━━━━━━━━━━━━⬣\n\n' +
                            '╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣',
                        mentions: [
                            mentionJid
                        ]
                    },
                    {
                        quoted: msg
                    }
                );

            } else {

                await responder.texto(
                    '╭〔 🔐 𝐃𝐄𝐋𝐎𝐖𝐍𝐄𝐑 〕⬣\n' +
                    '┃\n' +
                    '┃ ✅ Owner eliminado correctamente.\n' +
                    '┃\n' +
                    `┃ 👑 Owners restantes: ${owners.length}\n` +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣\n\n' +
                    '╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣'
                );
            }

            // ------------------------------------------------
            // LOG
            // ------------------------------------------------

            console.log(
                '================================================'
            );

            console.log(
                '[DELOWNER] Owner eliminado:',
                eliminado
            );

            console.log(
                '[DELOWNER] Owners restantes:',
                owners.length
            );

            console.log(
                '================================================'
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