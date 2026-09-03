// commands/owner/delowner.js
// ============================================================
// BOT-API
// COMANDO: DELOWNER
// ============================================================
// Elimina un propietario del bot.
//
// Formas:
//
// .delowner @usuario
// .delowner 50512345678
//
// También permite responder al mensaje del usuario.
//
// Compatible con Baileys 7.
// Soporta LID y PN.
// ============================================================

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { jidNormalizedUser } from 'baileys';

// ============================================================
// RUTA CORRECTA
// ============================================================

const __filename =
    fileURLToPath(
        import.meta.url
    );

const __dirname =
    path.dirname(
        __filename
    );

const OWNER_FILE =
    path.resolve(
        __dirname,
        '../../database/owner.json'
    );

// ============================================================
// ASEGURAR ARCHIVO
// ============================================================

async function asegurarOwnerFile() {

    const databaseDir =
        path.dirname(
            OWNER_FILE
        );

    await fs.mkdir(
        databaseDir,
        {
            recursive: true
        }
    );

    try {

        await fs.access(
            OWNER_FILE
        );

    } catch {

        await fs.writeFile(
            OWNER_FILE,
            '[]',
            'utf8'
        );

        console.log(
            '[DELOWNER] ✅ Creado database/owner.json'
        );
    }
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
        String(
            valor
        ).trim();

    return texto || null;
}

// ============================================================
// NORMALIZAR PN
// ============================================================

function normalizarPN(valor) {

    if (!valor) {
        return null;
    }

    const texto =
        String(
            valor
        ).trim();

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
            // Continuar.
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
// OBTENER LID JID
// ============================================================

function obtenerLidJid(valor) {

    const texto =
        limpiarJid(
            valor
        );

    if (!texto) {
        return null;
    }

    if (
        texto.endsWith('@lid')
    ) {

        return texto;
    }

    const numero =
        texto.replace(
            /[^0-9]/g,
            ''
        );

    if (!numero) {
        return null;
    }

    return `${numero}@lid`;
}

// ============================================================
// OBTENER NÚMERO DE UN JID
// ============================================================

function obtenerNumero(valor) {

    if (!valor) {
        return null;
    }

    const numero =
        String(
            valor
        )
            .split('@')[0]
            .replace(
                /[^0-9]/g,
                ''
            );

    return numero || null;
}

// ============================================================
// RESOLVER LID -> PN
// ============================================================

async function resolverPN(
    sock,
    owner
) {

    const valor =
        limpiarJid(
            owner
        );

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
            valor
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

        if (!resultado) {
            return null;
        }

        return normalizarPN(
            resultado
        );

    } catch (error) {

        console.error(
            `[DELOWNER] Error resolviendo ${lid}:`,
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

    await asegurarOwnerFile();

    const raw =
        await fs.readFile(
            OWNER_FILE,
            'utf8'
        );

    if (!raw.trim()) {
        return [];
    }

    const data =
        JSON.parse(
            raw
        );

    // Array directo.
    if (
        Array.isArray(data)
    ) {

        return {
            owners: data,
            formato: 'array'
        };
    }

    // { owners: [] }
    if (
        Array.isArray(
            data?.owners
        )
    ) {

        return {
            owners: data.owners,
            formato: 'owners'
        };
    }

    // { owner: [] }
    if (
        Array.isArray(
            data?.owner
        )
    ) {

        return {
            owners: data.owner,
            formato: 'owner'
        };
    }

    // Objeto.
    if (
        data &&
        typeof data === 'object'
    ) {

        const owners =
            Object.values(
                data
            ).filter(
                value =>
                    typeof value === 'string' ||
                    typeof value === 'object'
            );

        return {
            owners,
            formato: 'objeto'
        };
    }

    return {
        owners: [],
        formato: 'array'
    };
}

// ============================================================
// GUARDAR OWNERS
// ============================================================

async function guardarOwners(
    owners,
    formato
) {

    let data;

    if (
        formato === 'owners'
    ) {

        data = {
            owners
        };

    } else if (
        formato === 'owner'
    ) {

        data = {
            owner: owners
        };

    } else {

        // Usamos array para evitar
        // estructuras innecesarias.
        data = owners;
    }

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
// OBTENER TARGET
// ============================================================

function obtenerTarget(
    msg,
    argumento
) {

    const contextInfo =
        msg.message?.extendedTextMessage
            ?.contextInfo;

    // --------------------------------------------------------
    // 1. RESPUESTA A UN MENSAJE
    // --------------------------------------------------------

    const quotedParticipant =
        contextInfo?.participant ||
        contextInfo?.remoteJid;

    if (
        quotedParticipant
    ) {

        return {
            jid: quotedParticipant,
            tipo: 'respuesta'
        };
    }

    // --------------------------------------------------------
    // 2. MENCIÓN
    // --------------------------------------------------------

    const mentioned =
        contextInfo?.mentionedJid ||
        [];

    if (
        mentioned.length > 0
    ) {

        return {
            jid: mentioned[0],
            tipo: 'mencion'
        };
    }

    // --------------------------------------------------------
    // 3. NÚMERO ESCRITO
    // --------------------------------------------------------

    if (
        argumento
    ) {

        const numero =
            String(
                argumento
            ).replace(
                /[^0-9]/g,
                ''
            );

        if (numero) {

            return {
                jid:
                    `${numero}@s.whatsapp.net`,
                numero,
                tipo: 'numero'
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
        'deleteowner',
        'removerowner'
    ],

    descripcion:
        'Elimina un propietario del bot mediante mención, respuesta o número.',

    ejecutar: async ({
        msg,
        sock,
        responder,
        argumento
    }) => {

        try {

            // =================================================
            // OBTENER OBJETIVO
            // =================================================

            const target =
                obtenerTarget(
                    msg,
                    argumento
                );

            if (!target) {

                await responder.texto(
                    `❌ *DELOWNER*\n\n` +
                    `Usa una de estas formas:\n` +
                    `1️⃣ Responde a un mensaje del usuario\n` +
                    `2️⃣ Menciona al usuario: *.delowner @usuario*\n` +
                    `3️⃣ Escribe el número: *.delowner 50512345678*\n\n` +
                    `📌 Ejemplos:\n` +
                    `*.delowner @pedro*\n` +
                    `*.delowner 50512345678*`
                );

                return;
            }

            // =================================================
            // DATOS DEL OBJETIVO
            // =================================================

            const targetJid =
                limpiarJid(
                    target.jid
                );

            const targetNumero =
                target.numero ||
                obtenerNumero(
                    targetJid
                );

            const targetLid =
                targetJid?.endsWith('@lid')
                    ? targetJid
                    : obtenerLidJid(
                        targetJid
                    );

            // =================================================
            // LEER OWNERS
            // =================================================

            let resultado;

            try {

                resultado =
                    await leerOwners();

            } catch (error) {

                console.error(
                    '[DELOWNER] Error leyendo owner.json:',
                    error?.stack ||
                    error?.message ||
                    error
                );

                await responder.texto(
                    '❌ No se pudo leer la base de datos de propietarios.'
                );

                return;
            }

            const owners =
                resultado.owners;

            if (
                !Array.isArray(owners) ||
                owners.length === 0
            ) {

                await responder.texto(
                    '❌ No hay propietarios registrados.'
                );

                return;
            }

            // =================================================
            // BUSCAR OWNER
            // =================================================

            let foundIndex = -1;

            for (
                let i = 0;
                i < owners.length;
                i++
            ) {

                const owner =
                    owners[i];

                const ownerTexto =
                    limpiarJid(
                        owner
                    );

                if (!ownerTexto) {
                    continue;
                }

                // ---------------------------------------------
                // COMPARAR JID EXACTO
                // ---------------------------------------------

                if (
                    targetJid &&
                    ownerTexto === targetJid
                ) {

                    foundIndex = i;
                    break;
                }

                // ---------------------------------------------
                // COMPARAR LID
                // ---------------------------------------------

                const ownerLid =
                    obtenerLidJid(
                        ownerTexto
                    );

                if (
                    targetLid &&
                    ownerLid &&
                    ownerLid === targetLid
                ) {

                    foundIndex = i;
                    break;
                }

                // ---------------------------------------------
                // COMPARAR NÚMERO DIRECTAMENTE
                // ---------------------------------------------

                const ownerNumero =
                    obtenerNumero(
                        ownerTexto
                    );

                if (
                    targetNumero &&
                    ownerNumero &&
                    ownerNumero === targetNumero
                ) {

                    foundIndex = i;
                    break;
                }

                // ---------------------------------------------
                // SI OWNER ES LID, RESOLVER A PN
                // ---------------------------------------------

                if (
                    targetNumero
                ) {

                    const ownerPN =
                        await resolverPN(
                            sock,
                            ownerTexto
                        );

                    const ownerPNNumero =
                        obtenerNumero(
                            ownerPN
                        );

                    if (
                        ownerPNNumero &&
                        ownerPNNumero ===
                            targetNumero
                    ) {

                        foundIndex = i;
                        break;
                    }
                }
            }

            // =================================================
            // OWNER NO ENCONTRADO
            // =================================================

            if (
                foundIndex === -1
            ) {

                await responder.texto(
                    '❌ Ese usuario no es un propietario registrado.'
                );

                return;
            }

            // =================================================
            // GUARDAR OWNER ORIGINAL
            // =================================================

            const ownerEliminado =
                owners[
                    foundIndex
                ];

            // =================================================
            // ELIMINAR
            // =================================================

            owners.splice(
                foundIndex,
                1
            );

            // =================================================
            // GUARDAR
            // =================================================

            await guardarOwners(
                owners,
                resultado.formato
            );

            // =================================================
            // RESOLVER NÚMERO PARA MOSTRAR
            // =================================================

            let numeroMostrar =
                targetNumero;

            const numeroOwner =
                obtenerNumero(
                    ownerEliminado
                );

            if (
                numeroOwner &&
                !String(
                    ownerEliminado
                ).endsWith('@lid')
            ) {

                numeroMostrar =
                    numeroOwner;
            }

            // Si era LID, intentar obtener PN.
            if (
                String(
                    ownerEliminado
                ).endsWith('@lid')
            ) {

                const pn =
                    await resolverPN(
                        sock,
                        ownerEliminado
                    );

                const pnNumero =
                    obtenerNumero(
                        pn
                    );

                if (pnNumero) {

                    numeroMostrar =
                        pnNumero;
                }
            }

            // =================================================
            // JID PARA MENCIÓN
            // =================================================

            let mentionJid =
                targetJid;

            if (
                String(
                    ownerEliminado
                ).endsWith('@lid')
            ) {

                const pn =
                    await resolverPN(
                        sock,
                        ownerEliminado
                    );

                if (pn) {
                    mentionJid = pn;
                }
            }

            if (
                !mentionJid?.includes('@')
            ) {

                mentionJid =
                    `${numeroMostrar}@s.whatsapp.net`;
            }

            // =================================================
            // RESPUESTA
            // =================================================

            const respuesta = `
╭〔 ✅ 𝐎𝐖𝐍𝐄𝐑 𝐄𝐋𝐈𝐌𝐈𝐍𝐀𝐃𝐎 〕⬣
┃
┃ 🗑️ Usuario eliminado:
┃ @${numeroMostrar}
┃
┃ 👥 Total Owners: ${owners.length}
┃
┃ 💾 Base de datos actualizada.
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣
`;

            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    text: respuesta,
                    mentions: [
                        mentionJid
                    ]
                },
                {
                    quoted: msg
                }
            );

            // =================================================
            // LOG
            // =================================================

            console.log(
                '================================================'
            );

            console.log(
                `[DELOWNER] Eliminado: ${ownerEliminado}`
            );

            console.log(
                `[DELOWNER] Número: ${numeroMostrar}`
            );

            console.log(
                `[DELOWNER] Owners restantes: ${owners.length}`
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
                '❌ Error al eliminar el propietario.'
            );
        }
    }
};