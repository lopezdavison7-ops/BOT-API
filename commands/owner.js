// ============================================================
// BOT-API
// COMANDO: OWNER
// ============================================================
// Muestra los propietarios del bot mediante menciones reales
// de WhatsApp.
//
// Compatible con Baileys 7 y propietarios almacenados como LID.
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
// LIMPIAR VALOR
// ============================================================

function limpiarNumero(valor) {
    if (!valor) {
        return '';
    }

    return String(valor)
        .replace(/[^0-9]/g, '');
}

// ============================================================
// CONVERTIR OWNER A LID JID
// ============================================================

function obtenerLidJid(owner) {
    if (!owner) {
        return null;
    }

    // Soporta también owners guardados como objetos.
    if (typeof owner === 'object') {
        owner =
            owner.lid ||
            owner.jid ||
            owner.id ||
            owner.number ||
            owner.numero ||
            '';
    }

    const valor =
        String(owner).trim();

    if (!valor) {
        return null;
    }

    // Si ya viene como LID.
    if (valor.endsWith('@lid')) {
        return valor;
    }

    // Si viene como PN.
    if (
        valor.endsWith('@s.whatsapp.net')
    ) {
        return valor;
    }

    const numero =
        limpiarNumero(valor);

    if (!numero) {
        return null;
    }

    // En owner.json los valores actuales
    // son LIDs numéricos.
    return `${numero}@lid`;
}

// ============================================================
// OBTENER PN REAL DESDE LID
// ============================================================

async function resolverPN(
    sock,
    owner
) {
    const jid =
        obtenerLidJid(owner);

    if (!jid) {
        return null;
    }

    // Si ya es un PN, no hace falta resolverlo.
    if (
        jid.endsWith('@s.whatsapp.net')
    ) {
        return jid;
    }

    // Baileys 7
    const mapping =
        sock?.signalRepository?.lidMapping;

    if (
        !mapping ||
        typeof mapping.getPNForLID !== 'function'
    ) {
        console.error(
            '[OWNER] Baileys no tiene disponible getPNForLID().'
        );

        return null;
    }

    try {

        const pn =
            await mapping.getPNForLID(
                jid
            );

        if (!pn) {

            console.warn(
                `[OWNER] No se encontró PN para ${jid}`
            );

            return null;
        }

        return pn;

    } catch (error) {

        console.error(
            `[OWNER] Error resolviendo ${jid}:`,
            error?.message || error
        );

        return null;
    }
}

// ============================================================
// OBTENER NÚMERO PARA MOSTRAR
// ============================================================

function obtenerNumeroPN(jid) {
    if (!jid) {
        return null;
    }

    const numero =
        String(jid)
            .split('@')[0]
            .replace(/[^0-9]/g, '');

    if (!numero) {
        return null;
    }

    return numero;
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

    if (
        Array.isArray(data?.owners)
    ) {
        return data.owners;
    }

    if (
        Array.isArray(data?.owner)
    ) {
        return data.owner;
    }

    if (
        data &&
        typeof data === 'object'
    ) {
        return Object.values(data)
            .filter(
                valor =>
                    typeof valor === 'string' ||
                    typeof valor === 'object'
            );
    }

    return [];
}

// ============================================================
// COMANDO
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
        'Muestra los propietarios del bot mediante menciones reales.',

    ejecutar: async ({
        msg,
        sock,
        responder
    }) => {

        try {

            // ------------------------------------------------
            // LEER DATABASE
            // ------------------------------------------------

            let owners;

            try {

                owners =
                    await leerOwners();

            } catch (error) {

                console.error(
                    '[OWNER] Error leyendo owner.json:',
                    error
                );

                await responder.texto(
                    '❌ No se pudo leer la base de datos de propietarios.'
                );

                return;
            }

            if (
                !owners ||
                owners.length === 0
            ) {

                await responder.texto(
                    '❌ No hay propietarios registrados.'
                );

                return;
            }

            // ------------------------------------------------
            // RESOLVER LID → PN
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
                    obtenerNumeroPN(
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
            // SI NO SE PUDO RESOLVER NINGUNO
            // ------------------------------------------------

            if (
                propietarios.length === 0
            ) {

                await responder.texto(
                    '❌ No pude resolver los propietarios a sus números de WhatsApp.\n\n' +
                    '⚠️ El mapeo LID → PN todavía no está disponible en la sesión de Baileys.'
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

            propietarios.forEach(
                (owner, index) => {

                    texto +=
                        `┃ ${index + 1}. @${owner.numero}\n`;

                    mentions.push(
                        owner.jid
                    );
                }
            );

            texto +=
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣\n\n' +
                '╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣';

            // ------------------------------------------------
            // ENVIAR MENSAJE CON MENCIONES REALES
            // ------------------------------------------------

            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    text: texto,
                    mentions
                },
                {
                    quoted: msg
                }
            );

            console.log(
                `[OWNER] Menciones enviadas: ${mentions.length}`
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