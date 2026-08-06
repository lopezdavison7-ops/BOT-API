import { esGrupo, verificarPermisosAdmin, obtenerMetadata } from '../lib/grupos.js';

export default {
    nombre: 'todos',
    categoria: 'grupos',
    alias: ['everyone', 'tagall'],
    descripcion: 'Menciona a todos los miembros del grupo (sin que suene su celular a cada uno). Uso: .todos [mensaje opcional]',
    ejecutar: async ({ sock, msg, responder, argumento }) => {
        const chatId = msg.key.remoteJid;
        if (!esGrupo(chatId)) return responder.texto('Este comando solo funciona dentro de un grupo.');

        const permiso = await verificarPermisosAdmin(sock, msg, chatId);
        if (!permiso.ok) return responder.texto(permiso.motivo);

        const metadata = permiso.metadata || await obtenerMetadata(sock, chatId);
        if (!metadata) return responder.texto('No se pudo leer la lista de miembros.');

        const menciones = metadata.participants.map(p => p.id);
        const listaTexto = menciones.map(jid => `@${jid.split('@')[0]}`).join(' ');
        const encabezado = argumento.trim() ? `📢 ${argumento.trim()}\n\n` : '📢 *Atención a todos:*\n\n';

        await sock.sendMessage(chatId, { text: encabezado + listaTexto, mentions: menciones }, { quoted: msg });
    }
};
