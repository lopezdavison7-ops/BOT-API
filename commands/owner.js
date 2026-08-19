// ============================================================
// BOT-API
// COMANDO: OWNER
// ============================================================
// Muestra todos los propietarios del bot mediante menciones
// reales de WhatsApp.
//
// Autor: BOT-API
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
// OBTENER JID DEL OWNER
// ============================================================

function obtenerJid(owner) {
    if (!owner) return null;

    // Si ya viene como objeto
    if (typeof owner === 'object') {
        owner =
            owner.jid ||
            owner.id ||
            owner.number ||
            owner.numero ||
            owner.phone ||
            owner.telefono ||
            '';
    }

    const numero =
        String(owner)
            .replace(/[^0-9]/g, '');

    if (!numero) {
        return null;
    }

    return `${numero}@s.whatsapp.net`;
}

// ============================================================
// FORMATEAR TEXTO DE MENCIÓN
// ============================================================

function obtenerTextoMencion(jid) {
    if (!jid) return null;

    const numero =
        jid
            .split('@')[0]
            .replace(/[^0-9]/g, '');

    if (!numero) {
        return null;
    }

    return `@${numero}`;
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
        'Muestra la lista de propietarios mediante menciones reales.',

    ejecutar: async ({
        msg,
        sock,
        responder
    }) => {

        try {

            // ------------------------------------------------
            // LEER DATABASE
            // ------------------------------------------------

            let data;

            try {

                const raw =
                    await fs.readFile(
                        OWNER_FILE,
                        'utf8'
                    );

                data =
                    JSON.parse(raw);

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

            // ------------------------------------------------
            // OBTENER OWNERS
            // ------------------------------------------------

            let owners = [];

            if (Array.isArray(data)) {

                owners = data;

            } else if (
                Array.isArray(data?.owners)
            ) {

                owners = data.owners;

            } else if (
                Array.isArray(data?.owner)
            ) {

                owners = data.owner;

            } else if (
                data &&
                typeof data === 'object'
            ) {

                owners =
                    Object.values(data);
            }

            // ------------------------------------------------
            // CONVERTIR A JIDS
            // ------------------------------------------------

            const jids = [];

            for (
                const owner of owners
            ) {

                const jid =
                    obtenerJid(owner);

                if (
                    jid &&
                    !jids.includes(jid)
                ) {

                    jids.push(jid);
                }
            }

            // ------------------------------------------------
            // VALIDAR
            // ------------------------------------------------

            if (jids.length === 0) {

                await responder.texto(
                    '❌ No hay propietarios registrados.'
                );

                return;
            }

            // ------------------------------------------------
            // CREAR MENSAJE
            // ------------------------------------------------

            let textoRespuesta =
                '╭〔 👑 𝐏𝐑𝐎𝐏𝐈𝐄𝐓𝐀𝐑𝐈𝐎𝐒 𝐃𝐄𝐋 𝐁𝐎𝐓 〕⬣\n' +
                '┃\n' +
                `┃ 📌 Total: ${jids.length} owner(s)\n` +
                '┃\n';

            const mentions = [];

            jids.forEach(
                (jid, index) => {

                    const mencion =
                        obtenerTextoMencion(
                            jid
                        );

                    if (!mencion) {
                        return;
                    }

                    textoRespuesta +=
                        `┃ ${index + 1}. ${mencion}\n`;

                    mentions.push(jid);
                }
            );

            textoRespuesta +=
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣\n\n' +
                '╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣';

            // ------------------------------------------------
            // ENVIAR MENCIÓN REAL
            // ------------------------------------------------

            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    text: textoRespuesta,
                    mentions
                },
                {
                    quoted: msg
                }
            );

            console.log(
                `[OWNER] Owners mostrados: ${mentions.length}`
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