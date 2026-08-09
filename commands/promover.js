import { esGrupo, verificarPermisosAdmin, obtenerObjetivo } from '../lib/grupos.js';

export default {
    nombre: 'promover',
    categoria: 'grupos',
    alias: ['promote', 'admin'],
    descripcion: 'Hace administrador a alguien del grupo. Uso: .promover @usuario',

    ejecutar: async ({ sock, msg, responder, argumento }) => {
        const chatId = msg.key.remoteJid;

        // ============================================================
        // VERIFICAR GRUPO
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
        // SOLO MENCIONADO O MENSAJE RESPONDIDO
        // ============================================================

        const objetivo = obtenerObjetivo(msg, '');

        if (!objetivo) {
            return responder.texto(
                '⚠️ Debes mencionar al usuario o responder a su mensaje.\n\n' +
                'Ejemplos:\n' +
                '• .promover @usuario\n' +
                '• Responde al mensaje del usuario y escribe .promover'
            );
        }

        // ============================================================
        // PROMOVER
        // ============================================================

        try {
            await sock.groupParticipantsUpdate(
                chatId,
                [objetivo],
                'promote'
            );

            await responder.texto(
                '✅ Usuario promovido a administrador.'
            );

        } catch (error) {
            console.error(
                '[PROMOVER]',
                error?.stack || error?.message || error
            );

            await responder.texto(
                '⚠️ No se pudo promover al usuario.\n\n' +
                'Puede que ya sea administrador, ' +
                'no esté en el grupo o el bot no tenga permisos.'
            );
        }
    }
};
