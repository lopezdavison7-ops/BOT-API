// commands/system/desactivar.js
// ============================================================
// BOT-API
// COMANDO: DESACTIVAR / ACTIVAR
// ============================================================
//
// Ejemplos:
//
// .desactivar nsfw
// .activar nsfw
//
// .desactivar economy
// .activar economy
//
// .desactivar descargas off
// .activar descargas on
//
// .desactivar fun
// .activar fun
//
// La configuración es independiente para cada grupo.
// Solo administradores y Owners pueden utilizarlo.
// ============================================================

import {
    esOwner
} from '../../lib/owner.js';

import {
    activarCategoria,
    desactivarCategoria,
    obtenerEstadoCategoria,
    resolverCategoria
} from '../../lib/categoriaConfig.js';

// ============================================================
// OBTENER PARTICIPANTE
// ============================================================

function obtenerParticipante(msg) {

    const key =
        msg?.key || {};

    const candidatos = [
        key.participant,
        key.senderPn,
        key.participantAlt,
        key.remoteJidAlt
    ];

    for (const candidato of candidatos) {

        if (
            typeof candidato !== 'string' ||
            !candidato
        ) {
            continue;
        }

        return candidato;
    }

    return null;
}

// ============================================================
// COMPROBAR ADMIN
// ============================================================

async function esAdministrador(
    sock,
    jid,
    msg
) {

    if (
        !jid ||
        !jid.endsWith('@g.us')
    ) {
        return false;
    }

    const participante =
        obtenerParticipante(msg);

    if (!participante) {
        return false;
    }

    try {

        const metadata =
            await sock.groupMetadata(jid);

        const participantes =
            metadata?.participants || [];

        // ----------------------------------------------------
        // COMPROBAR JID EXACTO
        // ----------------------------------------------------

        const encontrado =
            participantes.find(p => {

                if (!p) {
                    return false;
                }

                const ids = [
                    p.id,
                    p.jid,
                    p.phoneNumber,
                    p.lid
                ].filter(Boolean);

                return ids.some(
                    id =>
                        String(id) ===
                        String(participante)
                );
            });

        if (
            encontrado &&
            (
                encontrado.admin === 'admin' ||
                encontrado.admin === 'superadmin'
            )
        ) {
            return true;
        }

        // ----------------------------------------------------
        // COMPROBAR POR NÚMERO
        // ----------------------------------------------------

        const numero =
            String(participante)
                .split('@')[0]
                .split(':')[0]
                .replace(/\D/g, '');

        if (!numero) {
            return false;
        }

        const admin =
            participantes.find(p => {

                if (
                    p?.admin !== 'admin' &&
                    p?.admin !== 'superadmin'
                ) {
                    return false;
                }

                const ids = [
                    p.id,
                    p.jid,
                    p.phoneNumber,
                    p.lid
                ].filter(Boolean);

                return ids.some(id => {

                    const n =
                        String(id)
                            .split('@')[0]
                            .split(':')[0]
                            .replace(/\D/g, '');

                    return (
                        n &&
                        n === numero
                    );
                });
            });

        return Boolean(admin);

    } catch (error) {

        console.error(
            '[CATEGORIAS] Error comprobando admin:',
            error?.message || error
        );

        return false;
    }
}

// ============================================================
// MOSTRAR AYUDA
// ============================================================

async function mostrarAyuda(
    responder
) {

    await responder.texto(
        '╭━━〔 ⚙️ 𝐂𝐀𝐓𝐄𝐆𝐎𝐑Í𝐀𝐒 〕━━⬣\n' +
        '┃\n' +
        '┃ Activa o desactiva categorías\n' +
        '┃ completas del bot en este grupo.\n' +
        '┃\n' +
        '┃ 🔴 Desactivar:\n' +
        '┃ › .desactivar nsfw\n' +
        '┃ › .desactivar economy\n' +
        '┃ › .desactivar descargas\n' +
        '┃\n' +
        '┃ 🟢 Activar:\n' +
        '┃ › .activar nsfw\n' +
        '┃ › .activar economy\n' +
        '┃ › .activar descargas\n' +
        '┃\n' +
        '┃ También acepta:\n' +
        '┃ › .desactivar nsfw off\n' +
        '┃ › .activar nsfw on\n' +
        '┃\n' +
        '╰━━━━━━━━━━━━━━━━⬣'
    );
}

// ============================================================
// COMANDO
// ============================================================

export default {

    nombre: 'desactivar',

    categoria: 'Sistema',

    alias: [
        'disable',
        'activar',
        'enable'
    ],

    descripcion:
        'Activa o desactiva categorías completas del bot.',

    ejecutar: async ({
        sock,
        msg,
        responder,
        argumento
    }) => {

        const jid =
            msg?.key?.remoteJid;

        // ----------------------------------------------------
        // SOLO GRUPOS
        // ----------------------------------------------------

        if (
            !jid ||
            !jid.endsWith('@g.us')
        ) {

            await responder.texto(
                '❌ Este comando solo puede utilizarse en grupos.'
            );

            return;
        }

        // ----------------------------------------------------
        // PERMISOS
        // ----------------------------------------------------

        const owner =
            esOwner(msg);

        if (!owner) {

            const admin =
                await esAdministrador(
                    sock,
                    jid,
                    msg
                );

            if (!admin) {

                await responder.texto(
                    '╭━━〔 🔐 𝐏𝐄𝐑𝐌𝐈𝐒𝐎𝐒 〕━━⬣\n' +
                    '┃\n' +
                    '┃ ❌ Solo los administradores\n' +
                    '┃ del grupo o un Owner pueden\n' +
                    '┃ modificar las categorías.\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );

                return;
            }
        }

        // ----------------------------------------------------
        // ARGUMENTOS
        // ----------------------------------------------------

        const partes =
            String(argumento || '')
                .trim()
                .split(/\s+/)
                .filter(Boolean);

        if (!partes.length) {

            await mostrarAyuda(
                responder
            );

            return;
        }

        const categoriaOriginal =
            partes[0];

        const opcion =
            partes[1]
                ?.toLowerCase();

        // ----------------------------------------------------
        // DETERMINAR ACCIÓN
        // ----------------------------------------------------

        const nombre =
            String(
                msg?.message
                    ?.conversation ||
                msg?.message
                    ?.extendedTextMessage
                    ?.text ||
                ''
            )
                .trim()
                .split(/\s+/)[0]
                ?.toLowerCase()
                .replace(/^\./, '');

        let accion;

        if (
            nombre === 'activar' ||
            nombre === 'enable'
        ) {
            accion = 'activar';
        } else {

            accion = 'desactivar';
        }

        // ----------------------------------------------------
        // SI USÓ on / off
        // ----------------------------------------------------

        if (
            opcion === 'on'
        ) {
            accion = 'activar';
        }

        if (
            opcion === 'off'
        ) {
            accion = 'desactivar';
        }

        // ----------------------------------------------------
        // CATEGORÍA
        // ----------------------------------------------------

        const categoria =
            resolverCategoria(
                categoriaOriginal
            );

        if (!categoria) {

            await responder.texto(
                '❌ Debes especificar una categoría.\n\n' +
                'Ejemplo:\n' +
                '› .desactivar nsfw\n' +
                '› .activar economy'
            );

            return;
        }

        // ----------------------------------------------------
        // ACTIVAR
        // ----------------------------------------------------

        if (
            accion === 'activar'
        ) {

            activarCategoria(
                jid,
                categoria
            );

            await responder.texto(
                '╭━━〔 🟢 𝐂𝐀𝐓𝐄𝐆𝐎𝐑Í𝐀 𝐀𝐂𝐓𝐈𝐕𝐀𝐃𝐀 〕━━⬣\n' +
                '┃\n' +
                `┃ 📂 Categoría: *${categoriaOriginal}*\n` +
                '┃\n' +
                '┃ 🟢 Estado: ACTIVADA\n' +
                '┃\n' +
                '┃ Los comandos de esta categoría\n' +
                '┃ vuelven a estar disponibles.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            console.log(
                `[CATEGORIAS] ${jid} → ACTIVADA: ${categoria}`
            );

            return;
        }

        // ----------------------------------------------------
        // DESACTIVAR
        // ----------------------------------------------------

        desactivarCategoria(
            jid,
            categoria
        );

        await responder.texto(
            '╭━━〔 🔴 𝐂𝐀𝐓𝐄𝐆𝐎𝐑ÍA 𝐃𝐄𝐒𝐀𝐂𝐓𝐈𝐕𝐀𝐃𝐀 〕━━⬣\n' +
            '┃\n' +
            `┃ 📂 Categoría: *${categoriaOriginal}*\n` +
            '┃\n' +
            '┃ 🔴 Estado: DESACTIVADA\n' +
            '┃\n' +
            '┃ Los comandos de esta categoría\n' +
            '┃ quedan bloqueados en este grupo.\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━⬣'
        );

        console.log(
            `[CATEGORIAS] ${jid} → DESACTIVADA: ${categoria}`
        );
    }
};