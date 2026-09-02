// commands/system/desactivar.js
// ============================================================
// BOT-API
// COMANDO: DESACTIVAR
// ============================================================
//
// DESACTIVA UNA CATEGORÍA GLOBALMENTE.
//
// Ejemplos:
//
// .desactivar nsfw
// .desactivar economy
// .desactivar descargas
// .desactivar fun
//
// También:
// .desactivar nsfw off
//
// Solo administradores del grupo y Owners.
// ============================================================

import {
    esOwner
} from '../../lib/owner.js';

import {
    activarCategoria,
    desactivarCategoria,
    obtenerEstadoCategoria,
    obtenerCategoriasDesactivadas,
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
        // COMPARACIÓN EXACTA
        // ----------------------------------------------------

        const encontrado =
            participantes.find(
                participanteGrupo => {

                    if (!participanteGrupo) {
                        return false;
                    }

                    const ids = [
                        participanteGrupo.id,
                        participanteGrupo.jid,
                        participanteGrupo.phoneNumber,
                        participanteGrupo.lid
                    ].filter(Boolean);

                    return ids.some(
                        id =>
                            String(id) ===
                            String(participante)
                    );
                }
            );

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
        // COMPARACIÓN POR NÚMERO
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
            participantes.find(
                participanteGrupo => {

                    if (
                        participanteGrupo?.admin !== 'admin' &&
                        participanteGrupo?.admin !== 'superadmin'
                    ) {
                        return false;
                    }

                    const ids = [
                        participanteGrupo.id,
                        participanteGrupo.jid,
                        participanteGrupo.phoneNumber,
                        participanteGrupo.lid
                    ].filter(Boolean);

                    return ids.some(id => {

                        const numeroGrupo =
                            String(id)
                                .split('@')[0]
                                .split(':')[0]
                                .replace(/\D/g, '');

                        return (
                            numeroGrupo &&
                            numeroGrupo === numero
                        );
                    });
                }
            );

        return Boolean(admin);

    } catch (error) {

        console.error(
            '[CATEGORIAS] ❌ Error comprobando admin:',
            error.message
        );

        return false;
    }
}

// ============================================================
// AYUDA
// ============================================================

async function mostrarAyuda(
    responder
) {

    const desactivadas =
        obtenerCategoriasDesactivadas();

    let estado =
        '┃ 🟢 No hay categorías desactivadas.';

    if (desactivadas.length) {

        estado =
            '┃ 🔴 Desactivadas globalmente:\n' +
            desactivadas
                .map(
                    categoria =>
                        `┃ • ${categoria}`
                )
                .join('\n');
    }

    await responder.texto(
        '╭━━〔 ⚙️ 𝐂𝐀𝐓𝐄𝐆𝐎𝐑Í𝐀𝐒 〕━━⬣\n' +
        '┃\n' +
        '┃ 🔴 Desactivar globalmente:\n' +
        '┃ › .desactivar nsfw\n' +
        '┃ › .desactivar economy\n' +
        '┃ › .desactivar descargas\n' +
        '┃\n' +
        '┃ 🟢 Activar globalmente:\n' +
        '┃ › .activar nsfw\n' +
        '┃ › .activar economy\n' +
        '┃ › .activar descargas\n' +
        '┃\n' +
        '┃ Estado actual:\n' +
        estado +
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
        'Activa o desactiva categorías globalmente.',

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
                    '┃ modificar categorías.\n' +
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
        // SABER SI SE USÓ .ACTIVAR
        // ----------------------------------------------------

        const textoOriginal =
            msg?.message?.conversation ||
            msg?.message?.extendedTextMessage?.text ||
            msg?.message?.imageMessage?.caption ||
            msg?.message?.videoMessage?.caption ||
            '';

        const comandoUsado =
            String(textoOriginal)
                .trim()
                .split(/\s+/)[0]
                ?.toLowerCase()
                .replace(/^\./, '');

        let accion =
            comandoUsado === 'activar' ||
            comandoUsado === 'enable'
                ? 'activar'
                : 'desactivar';

        // ----------------------------------------------------
        // ON / OFF
        // ----------------------------------------------------

        if (opcion === 'on') {
            accion = 'activar';
        }

        if (opcion === 'off') {
            accion = 'desactivar';
        }

        // ----------------------------------------------------
        // RESOLVER CATEGORÍA
        // ----------------------------------------------------

        const categoria =
            resolverCategoria(
                categoriaOriginal
            );

        if (!categoria) {

            await responder.texto(
                '❌ Especifica una categoría.\n\n' +
                'Ejemplo:\n' +
                '› .desactivar nsfw\n' +
                '› .activar economy'
            );

            return;
        }

        // ====================================================
        // ACTIVAR GLOBALMENTE
        // ====================================================

        if (accion === 'activar') {

            activarCategoria(
                categoria
            );

            await responder.texto(
                '╭━━〔 🟢 𝐂𝐀𝐓𝐄𝐆𝐎𝐑Í𝐀 𝐀𝐂𝐓𝐈𝐕𝐀𝐃𝐀 〕━━⬣\n' +
                '┃\n' +
                `┃ 📂 Categoría: *${categoriaOriginal}*\n` +
                '┃\n' +
                '┃ 🌎 Alcance: GLOBAL\n' +
                '┃ 🟢 Estado: ACTIVADA\n' +
                '┃\n' +
                '┃ Esta categoría vuelve a estar\n' +
                '┃ disponible en todos los grupos.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;
        }

        // ====================================================
        // DESACTIVAR GLOBALMENTE
        // ====================================================

        desactivarCategoria(
            categoria
        );

        await responder.texto(
            '╭━━〔 🔴 𝐂𝐀𝐓𝐄𝐆𝐎𝐑ÍA 𝐃𝐄𝐒𝐀𝐂𝐓𝐈𝐕𝐀𝐃𝐀 〕━━⬣\n' +
            '┃\n' +
            `┃ 📂 Categoría: *${categoriaOriginal}*\n` +
            '┃\n' +
            '┃ 🌎 Alcance: GLOBAL\n' +
            '┃ 🔴 Estado: DESACTIVADA\n' +
            '┃\n' +
            '┃ Esta categoría queda bloqueada\n' +
            '┃ en todos los grupos del bot.\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━⬣'
        );
    }
};