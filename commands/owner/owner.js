// commands/owner/owner.js
// ============================================================
// BOT-API
// COMANDO: OWNER
// ============================================================
// Muestra los propietarios del bot mediante menciones reales
// de WhatsApp.
//
// Compatible con Baileys 7.
// Soporta owners almacenados como LID.
// Convierte LID -> PN y utiliza el JID PN real para mentions.
// ============================================================

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { jidNormalizedUser } from 'baileys';

// ============================================================
// RUTA REAL DEL PROYECTO
// ============================================================

const __filename =
    fileURLToPath(
        import.meta.url
    );

const __dirname =
    path.dirname(
        __filename
    );

// commands/owner/owner.js
//       ↑
// ../../database/owner.json
//
// Resultado:
// proyecto/database/owner.json

const OWNER_FILE =
    path.resolve(
        __dirname,
        '../../database/owner.json'
    );

// ============================================================
// ASEGURAR DATABASE Y OWNER.JSON
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

        // Si no existe, crear una base vacía.
        await fs.writeFile(
            OWNER_FILE,
            '[]',
            'utf8'
        );

        console.log(
            '[OWNER] ✅ Creado database/owner.json'
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

    if (!texto) {
        return null;
    }

    // Ya es un JID.
    if (
        texto.includes('@')
    ) {

        return texto;
    }

    return texto;
}

// ============================================================
// OBTENER LID
// ============================================================

function obtenerLidJid(
    owner
) {

    const valor =
        limpiarJid(
            owner
        );

    if (!valor) {
        return null;
    }

    // Ya es LID.
    if (
        valor.endsWith('@lid')
    ) {

        return valor;
    }

    // Ya es PN.
    if (
        valor.endsWith(
            '@s.whatsapp.net'
        )
    ) {

        return valor;
    }

    // owner.json guarda LIDs
    // como números sin @lid.
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
        String(
            valor
        ).trim();

    if (!texto) {
        return null;
    }

    // Si ya es JID.
    if (
        texto.includes('@')
    ) {

        try {

            return jidNormalizedUser(
                texto
            );

        } catch {
            // Continuar con limpieza manual.
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
        limpiarJid(
            owner
        );

    if (!valor) {
        return null;
    }

    // Si owner.json ya tiene PN.
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

        console.error(
            '[OWNER] getPNForLID no está disponible.'
        );

        return null;
    }

    try {

        const resultado =
            await mapping.getPNForLID(
                lid
            );

        if (!resultado) {

            console.warn(
                `[OWNER] No existe mapping PN para ${lid}`
            );

            return null;
        }

        const pn =
            normalizarPN(
                resultado
            );

        if (!pn) {

            console.warn(
                `[OWNER] PN inválido para ${lid}`
            );

            return null;
        }

        console.log(
            `[OWNER] LID ${lid} -> PN ${pn}`
        );

        return pn;

    } catch (error) {

        console.error(
            `[OWNER] Error resolviendo ${lid}:`,
            error?.message ||
            error
        );

        return null;
    }
}

// ============================================================
// NÚMERO PARA MOSTRAR
// ============================================================

function obtenerNumero(
    jid
) {

    if (!jid) {
        return null;
    }

    const numero =
        String(
            jid
        )
            .split('@')[0]
            .replace(
                /[^0-9]/g,
                ''
            );

    return numero || null;
}

// ============================================================
// LEER OWNER.JSON
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

    // --------------------------------------------------------
    // Formato:
    //
    // [
    //   "123456789@lid"
    // ]
    // --------------------------------------------------------

    if (
        Array.isArray(data)
    ) {

        return data;
    }

    // --------------------------------------------------------
    // Formato:
    //
    // {
    //   "owners": [...]
    // }
    // --------------------------------------------------------

    if (
        Array.isArray(
            data?.owners
        )
    ) {

        return data.owners;
    }

    // --------------------------------------------------------
    // Formato:
    //
    // {
    //   "owner": [...]
    // }
    // --------------------------------------------------------

    if (
        Array.isArray(
            data?.owner
        )
    ) {

        return data.owner;
    }

    // --------------------------------------------------------
    // Formato objeto.
    // --------------------------------------------------------

    if (
        data &&
        typeof data === 'object'
    ) {

        return Object.values(
            data
        ).filter(
            value =>
                typeof value === 'string' ||
                typeof value === 'object'
        );
    }

    return [];
}

// ============================================================
// COMANDO OWNER
// ============================================================

export default {

    nombre: 'owner',

    categoria: 'Owner',

    alias: [
        'owners',
        'dueños',
        'duenos'
    ],

    descripcion:
        'Muestra los propietarios mediante menciones reales de WhatsApp.',

    ejecutar: async ({
        msg,
        sock,
        responder
    }) => {

        try {

            // ------------------------------------------------
            // LEER OWNERS
            // ------------------------------------------------

            let owners;

            try {

                owners =
                    await leerOwners();

            } catch (error) {

                console.error(
                    '[OWNER] Error leyendo owner.json:',
                    error?.stack ||
                    error?.message ||
                    error
                );

                await responder.texto(
                    '❌ No se pudo leer la base de datos de propietarios.'
                );

                return;
            }

            // ------------------------------------------------
            // NO HAY OWNERS
            // ------------------------------------------------

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
            // RESOLVER OWNERS
            // ------------------------------------------------

            const propietarios = [];

            for (
                const owner of owners
            ) {

                const pn =
                    await resolverPN(
                        sock,
                        owner
                    );

                if (!pn) {
                    continue;
                }

                const numero =
                    obtenerNumero(
                        pn
                    );

                if (!numero) {
                    continue;
                }

                // Evitar duplicados.
                if (
                    propietarios.some(
                        item =>
                            item.jid === pn
                    )
                ) {

                    continue;
                }

                propietarios.push({
                    jid: pn,
                    numero
                });
            }

            // ------------------------------------------------
            // NINGÚN OWNER RESUELTO
            // ------------------------------------------------

            if (
                propietarios.length === 0
            ) {

                await responder.texto(
                    '❌ No pude resolver los propietarios.\n\n' +
                    '⚠️ Baileys todavía no tiene disponible el mapeo LID → número para estos usuarios.'
                );

                return;
            }

            // ------------------------------------------------
            // CONSTRUIR MENSAJE
            // ------------------------------------------------

            let texto =
                '╭〔 👑 𝐏𝐑𝐎𝐏𝐈𝐄𝐓𝐀𝐑𝐈𝐎𝐒 𝐃𝐄𝐋 𝐁𝐎𝐓 〕⬣\n' +
                '┃\n' +
                `┃ 📌 Total: ${propietarios.length} owner(s)\n` +
                '┃\n';

            const mentions = [];

            for (
                let i = 0;
                i < propietarios.length;
                i++
            ) {

                const owner =
                    propietarios[i];

                texto +=
                    `┃ ${i + 1}. @${owner.numero}\n`;

                mentions.push(
                    owner.jid
                );
            }

            texto +=
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣\n\n' +
                '╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣';

            // ------------------------------------------------
            // ENVIAR MENCIONES
            // ------------------------------------------------

            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    text,
                    mentions
                },
                {
                    quoted: msg
                }
            );

            // ------------------------------------------------
            // LOG
            // ------------------------------------------------

            console.log(
                '================================================'
            );

            console.log(
                `[OWNER] Archivo: ${OWNER_FILE}`
            );

            console.log(
                `[OWNER] Owners encontrados: ${owners.length}`
            );

            console.log(
                `[OWNER] Menciones enviadas: ${mentions.length}`
            );

            for (
                const jid of mentions
            ) {

                console.log(
                    `[OWNER] Mention JID: ${jid}`
                );
            }

            console.log(
                '================================================'
            );

        } catch (error) {

            console.error(
                '[OWNER] Error:',
                error?.stack ||
                error?.message ||
                error
            );

            await responder.texto(
                '❌ Error al mostrar los propietarios.'
            );
        }
    }
};