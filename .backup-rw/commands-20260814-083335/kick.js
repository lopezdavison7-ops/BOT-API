import { esGrupo, verificarPermisosAdmin, obtenerObjetivo } from '../lib/grupos.js';

export default {
    nombre: 'kick',
    categoria: 'grupos',
    alias: ['expulsar', 'ban'],
    descripcion: 'Expulsa a un usuario mencionado o cuyo mensaje hayas respondido. Uso: .kick @usuario',

    ejecutar: async ({ sock, msg, responder, argumento }) => {
        const chatId = msg.key.remoteJid;

        // ============================================================
        // VERIFICAR QUE SEA UN GRUPO
        // ============================================================

        if (!esGrupo(chatId)) {
            return responder.texto(
                '❌ Este comando solo funciona dentro de un grupo.'
            );
        }

        // ============================================================
        // VERIFICAR PERMISOS DEL USUARIO
        // ============================================================

        const permiso = await verificarPermisosAdmin(
            sock,
            msg,
            chatId
        );

        if (!permiso.ok) {
            return responder.texto(permiso.motivo);
        }

        // ============================================================
        // OBTENER OBJETIVO
        // SOLO:
        // 1. Usuario mencionado
        // 2. Usuario cuyo mensaje fue respondido
        //
        // NO se acepta número escrito manualmente.
        // ============================================================

        const objetivo = obtenerObjetivo(msg, '');

        if (!objetivo) {
            return responder.texto(
                '⚠️ Debes mencionar al usuario o responder a su mensaje.\n\n' +
                'Ejemplos:\n' +
                '• .kick @usuario\n' +
                '• Responde al mensaje del usuario y escribe .kick'
            );
        }

        // ============================================================
        // EVITAR EXPULSAR AL PROPIO BOT
        // ============================================================

        const miJid = sock.user?.id;

        if (
            miJid &&
            objetivo.split(':')[0] === miJid.split(':')[0]
        ) {
            return responder.texto(
                '🤖 No puedo expulsarme a mí mismo.'
            );
        }

        // ============================================================
        // EXPULSAR
        // ============================================================

        try {
            await sock.groupParticipantsUpdate(
                chatId,
                [objetivo],
                'remove'
            );

            await responder.texto(
                '✅ Usuario expulsado correctamente.'
            );

        } catch (error) {
            console.error(
                '[KICK]',
                error?.stack || error?.message || error
            );

            await responder.texto(
                '⚠️ No se pudo expulsar al usuario.\n\n' +
                'Puede que ya no esté en el grupo, ' +
                'sea administrador o que el bot no tenga permisos.'
            );
        }
    }
};
