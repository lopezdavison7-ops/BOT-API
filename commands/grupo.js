import { esGrupo, verificarPermisosAdmin } from '../lib/grupos.js';

export default {
    nombre: 'grupo',
    alias: ['group'],
    descripcion: 'Abre o cierra el grupo (cerrado = solo admins escriben). Uso: .grupo abrir | .grupo cerrar',
    ejecutar: async ({ sock, msg, responder, argumento }) => {
        const chatId = msg.key.remoteJid;
        if (!esGrupo(chatId)) return responder.texto('Este comando solo funciona dentro de un grupo.');

        const permiso = await verificarPermisosAdmin(sock, msg, chatId);
        if (!permiso.ok) return responder.texto(permiso.motivo);

        const opcion = argumento.trim().toLowerCase();
        if (opcion !== 'abrir' && opcion !== 'cerrar') {
            return responder.texto('Usa: *.grupo abrir* o *.grupo cerrar*');
        }

        try {
            await sock.groupSettingUpdate(chatId, opcion === 'cerrar' ? 'announcement' : 'not_announcement');
            await responder.texto(opcion === 'cerrar'
                ? '🔒 Grupo cerrado: solo los administradores pueden escribir.'
                : '🔓 Grupo abierto: todos pueden escribir.');
        } catch (e) {
            await responder.texto('⚠️ No se pudo cambiar la configuración del grupo.');
        }
    }
};
