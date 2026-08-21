// ============================================================
// BOT-API
// COMANDO: SETCANAL
// ============================================================
// Guarda el enlace del canal de WhatsApp que aparecerá en
// el menú del bot.
//
// Uso:
// .setcanal https://whatsapp.com/channel/XXXXXXXX
//
// Solo Owner.
// ============================================================

import fs from 'fs/promises';
import path from 'path';

const CANAL_FILE = path.join(
    process.cwd(),
    'database',
    'canal.json'
);

// ============================================================
// EXTRAER NÚMERO/JID DEL USUARIO
// ============================================================

function obtenerAutor(msg) {
    const key = msg?.key || {};

    const candidatos = [
        key.participant,
        key.senderPn,
        key.participantAlt,
        key.remoteJid
    ];

    for (const jid of candidatos) {
        if (!jid) continue;

        const texto = String(jid);

        if (texto.endsWith('@g.us')) continue;

        return texto;
    }

    return null;
}

// ============================================================
// NORMALIZAR NÚMERO
// ============================================================

function obtenerNumero(jid) {
    if (!jid) return null;

    return String(jid)
        .split('@')[0]
        .split(':')[0]
        .replace(/\D/g, '');
}

// ============================================================
// LEER OWNERS
// ============================================================

async function leerOwners() {
    try {
        const archivo = path.join(
            process.cwd(),
            'database',
            'owner.json'
        );

        const contenido =
            await fs.readFile(
                archivo,
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

    } catch {
        return [];
    }
}

// ============================================================
// COMPROBAR OWNER
// ============================================================

async function esOwner(msg) {
    const autor =
        obtenerNumero(
            obtenerAutor(msg)
        );

    if (!autor) return false;

    // Owner principal del bot.
    // Puedes cambiarlo si algún día quieres moverlo.
    const OWNER_PRINCIPAL =
        '50578391933';

    if (autor === OWNER_PRINCIPAL) {
        return true;
    }

    const owners =
        await leerOwners();

    for (const owner of owners) {

        let valor = owner;

        if (
            typeof owner === 'object' &&
            owner !== null
        ) {
            valor =
                owner.jid ||
                owner.number ||
                owner.numero ||
                owner.phone ||
                owner.id ||
                owner.lid;
        }

        const numeroOwner =
            obtenerNumero(valor);

        if (
            numeroOwner &&
            numeroOwner === autor
        ) {
            return true;
        }
    }

    return false;
}

// ============================================================
// VALIDAR URL
// ============================================================

function validarCanal(url) {
    try {
        const parsed =
            new URL(url);

        return (
            parsed.protocol === 'https:' &&
            (
                parsed.hostname.includes('whatsapp.com') ||
                parsed.hostname.includes('wa.me')
            )
        );

    } catch {
        return false;
    }
}

// ============================================================
// COMANDO
// ============================================================

export default {

    nombre: 'setcanal',

    categoria: 'Owner',

    alias: [
        'canal',
        'setchannel'
    ],

    descripcion:
        'Configura el enlace del canal que aparecerá en el menú.',

    ejecutar: async ({
        msg,
        responder,
        argumento
    }) => {

        try {

            // ------------------------------------------------
            // SEGURIDAD
            // ------------------------------------------------

            if (!await esOwner(msg)) {

                await responder.texto(
                    '╭━━〔 🔐 𝐒𝐄𝐓𝐂𝐀𝐍𝐀𝐋 〕━━⬣\n' +
                    '┃\n' +
                    '┃ ❌ Solo los propietarios\n' +
                    '┃ pueden usar este comando.\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );

                return;
            }

            // ------------------------------------------------
            // OBTENER ENLACE
            // ------------------------------------------------

            const enlace =
                argumento?.trim();

            if (!enlace) {

                await responder.texto(
                    '╭━━〔 📢 𝐒𝐄𝐓𝐂𝐀𝐍𝐀𝐋 〕━━⬣\n' +
                    '┃\n' +
                    '┃ ❌ Falta el enlace del canal.\n' +
                    '┃\n' +
                    '┃ 📌 Uso:\n' +
                    '┃ .setcanal https://whatsapp.com/channel/...\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );

                return;
            }

            // ------------------------------------------------
            // VALIDAR
            // ------------------------------------------------

            if (!validarCanal(enlace)) {

                await responder.texto(
                    '❌ El enlace no parece ser un enlace válido de WhatsApp.'
                );

                return;
            }

            // ------------------------------------------------
            // CREAR CARPETA
            // ------------------------------------------------

            await fs.mkdir(
                path.dirname(CANAL_FILE),
                {
                    recursive: true
                }
            );

            // ------------------------------------------------
            // GUARDAR
            // ------------------------------------------------

            const datos = {
                activo: true,
                enlace: enlace,
                actualizado: new Date().toISOString()
            };

            await fs.writeFile(
                CANAL_FILE,
                JSON.stringify(
                    datos,
                    null,
                    2
                ),
                'utf8'
            );

            // ------------------------------------------------
            // RESPUESTA
            // ------------------------------------------------

            await responder.texto(
                '╭━━〔 📢 𝐂𝐀𝐍𝐀𝐋 〕━━⬣\n' +
                '┃\n' +
                '┃ ✅ Canal configurado correctamente.\n' +
                '┃\n' +
                `┃ 🔗 ${enlace}\n` +
                '┃\n' +
                '┃ 💡 Ahora aparecerá en el menú\n' +
                '┃ automáticamente.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            console.log(
                `[SETCANAL] Canal actualizado: ${enlace}`
            );

        } catch (error) {

            console.error(
                '[SETCANAL] Error:',
                error?.stack ||
                error?.message ||
                error
            );

            await responder.texto(
                '❌ No pude guardar el canal.'
            );
        }
    }
};