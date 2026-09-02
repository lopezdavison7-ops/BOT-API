// commands/system/desactivar.js
// ============================================================
// BOT-API
// COMANDO: DESACTIVAR / ACTIVAR
// ============================================================
//
// CONTROL GLOBAL DE CATEGORÍAS.
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
// Funciona desde grupos.
// Funciona desde chats privados.
//
// Para cambiar el estado:
// - Owner
// - Administrador de grupo
//
// ============================================================

import {
    esOwner
} from '../../lib/owner.js';

import {
    activarCategoria,
    desactivarCategoria,
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
        // COMPARACIÓN DIRECTA
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
            '[CATEGORIAS] ❌ Error comprobando administrador:',
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
        '┃ 🌎 Configuración GLOBAL\n' +
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
        '┃ También:\n' +
        '┃ › .desactivar nsfw off\n' +
        '┃ › .activar nsfw on\n' +
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

        // ====================================================
        // PERMISOS
        // ====================================================
        //
        // OWNER:
        // Puede hacerlo desde grupo o privado.
        //
        // ADMIN:
        // Puede hacerlo desde un grupo.
        //
        // ====================================================

        const owner =
            esOwner(msg);

        if (!owner) {

            // ------------------------------------------------
            // Un usuario normal solo puede hacerlo
            // si está en un grupo y es administrador.
            // ------------------------------------------------

            if (
                !jid ||
                !jid.endsWith('@g.us')
            ) {

                await responder.texto(
                    '╭━━〔 🔐 𝐏𝐄𝐑𝐌𝐈𝐒𝐎𝐒 〕━━⬣\n' +
                    '┃\n' +
                    '┃ ❌ En chat privado solo el\n' +
                    '┃ Owner puede modificar categorías.\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );

                return;
            }

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
                    '┃ del grupo o el Owner pueden\n' +
                    '┃ modificar categorías.\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );

                return;
            }
        }

        // ====================================================
        // ARGUMENTOS
        // ====================================================

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
            partes[1]?.toLowerCase();

        // ====================================================
        // DETECTAR COMANDO UTILIZADO
        // ====================================================

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
            (
                comandoUsado === 'activar' ||
                comandoUsado === 'enable'
            )
                ? 'activar'
                : 'desactivar';

        // ====================================================
        // ON / OFF
        // ====================================================

        if (opcion === 'on') {
            accion = 'activar';
        }

        if (opcion === 'off') {
            accion = 'desactivar';
        }

        // ====================================================
        // RESOLVER CATEGORÍA
        // ====================================================

        const categoria =
            resolverCategoria(
                categoriaOriginal
            );

        if (!categoria) {

            await mostrarAyuda(
                responder
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
                '╭━━〔 🟢 𝐂𝐀𝐓𝐄𝐆𝐎𝐑ÍA 𝐀𝐂𝐓𝐈𝐕𝐀𝐃𝐀 〕━━⬣\n' +
                '┃\n' +
                `┃ 📂 Categoría: *${categoriaOriginal}*\n` +
                '┃\n' +
                '┃ 🌎 Alcance: GLOBAL\n' +
                '┃ 🟢 Estado: ACTIVADA\n' +
                '┃\n' +
                '┃ Disponible nuevamente en\n' +
                '┃ grupos y chats privados.\n' +
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
            '┃ Bloqueada en grupos y\n' +
            '┃ chats privados.\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━⬣'
        );
    }
};