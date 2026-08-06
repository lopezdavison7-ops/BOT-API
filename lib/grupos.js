// Helpers para comandos de administración de grupo

export function esGrupo(chatId) {
    return chatId?.endsWith('@g.us');
}

export async function obtenerMetadata(sock, chatId) {
    try {
        return await sock.groupMetadata(chatId);
    } catch {
        return null;
    }
}

function limpiarJid(jid) {
    if (!jid) return '';
    return jid.split(':')[0].replace(/[^0-9@.]/g, '') || jid;
}

export function esParticipanteAdmin(metadata, jid) {
    if (!metadata || !jid) return false;
    const numero = jid.split('@')[0];
    const participante = metadata.participants?.find(p => p.id.split('@')[0] === numero);
    return participante?.admin === 'admin' || participante?.admin === 'superadmin';
}

// Verifica permisos de admin: quien manda el comando, y si el bot también es admin (lo necesita para actuar)
export async function verificarPermisosAdmin(sock, msg, chatId) {
    const metadata = await obtenerMetadata(sock, chatId);
    if (!metadata) return { ok: false, motivo: 'No se pudo leer la información del grupo.' };

    const botJid = limpiarJid(sock.user.id);
    const remitente = limpiarJid(msg.key.participant || msg.key.remoteJid);

    const esOwner = process.env.OWNER && remitente.split('@')[0] === process.env.OWNER.replace(/\D/g, '');
    const senderEsAdmin = esParticipanteAdmin(metadata, remitente) || esOwner;
    const botEsAdmin = esParticipanteAdmin(metadata, botJid);

    if (!senderEsAdmin) return { ok: false, motivo: '❌ Este comando es solo para *administradores del grupo*.' };
    if (!botEsAdmin) return { ok: false, motivo: '❌ Necesito ser *administrador del grupo* para poder hacer esto.' };

    return { ok: true, metadata };
}

// Busca a quién apunta el comando: alguien mencionado (@usuario) o el mensaje al que respondiste
export function obtenerObjetivo(msg, argumento) {
    const contexto = msg.message?.extendedTextMessage?.contextInfo;
    if (contexto?.mentionedJid?.length) return contexto.mentionedJid[0];
    if (contexto?.participant) return contexto.participant;
    const numero = (argumento || '').replace(/[^0-9]/g, '');
    if (numero) return `${numero}@s.whatsapp.net`;
    return null;
}