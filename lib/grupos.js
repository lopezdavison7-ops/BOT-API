// ============================================================
// HELPERS PARA COMANDOS DE ADMINISTRACIÓN DE GRUPOS
// ALEX BOT
// Compatible con JID normales y LID de WhatsApp
// ============================================================

export function esGrupo(chatId) {
    return Boolean(chatId?.endsWith('@g.us'));
}

// ============================================================
// OBTENER METADATA
// ============================================================

export async function obtenerMetadata(sock, chatId) {
    try {
        return await sock.groupMetadata(chatId);
    } catch (error) {
        console.error(
            '[GRUPOS] Error obteniendo metadata:',
            error?.message || error
        );

        return null;
    }
}

// ============================================================
// NORMALIZAR JID
// ============================================================

function limpiarJid(jid) {
    if (!jid) return '';

    return String(jid)
        .split(':')[0]
        .replace(/[^0-9@.]/g, '');
}

// ============================================================
// OBTENER NÚMERO
// ============================================================

function obtenerNumero(jid) {
    return limpiarJid(jid)
        .split('@')[0]
        .replace(/\D/g, '');
}

// ============================================================
// COMPROBAR ADMIN
// ============================================================

export function esParticipanteAdmin(metadata, jid) {
    if (!metadata || !jid) return false;

    const numeroBuscado = obtenerNumero(jid);

    if (!numeroBuscado) return false;

    const participante = metadata.participants?.find(
        p => obtenerNumero(p.id) === numeroBuscado
    );

    if (!participante) {
        return false;
    }

    return (
        participante.admin === 'admin' ||
        participante.admin === 'superadmin'
    );
}

// ============================================================
// OBTENER IDENTIFICADORES DEL BOT
// ============================================================

function obtenerJidsBot(sock) {
    const jids = new Set();

    // JID principal
    if (sock.user?.id) {
        jids.add(limpiarJid(sock.user.id));
    }

    // Número del bot
    if (sock.user?.id) {
        const numero = obtenerNumero(sock.user.id);

        if (numero) {
            jids.add(`${numero}@s.whatsapp.net`);
        }
    }

    // LID del usuario si Baileys lo proporciona
    if (sock.user?.lid) {
        jids.add(limpiarJid(sock.user.lid));
    }

    return [...jids].filter(Boolean);
}

// ============================================================
// COMPROBAR SI EL BOT ES ADMIN
// ============================================================

function botEsAdministrador(sock, metadata) {
    if (!metadata?.participants?.length) {
        return false;
    }

    const botJids = obtenerJidsBot(sock);

    // Primero intenta coincidencia exacta de JID
    for (const botJid of botJids) {
        const participante = metadata.participants.find(
            p => limpiarJid(p.id) === botJid
        );

        if (
            participante &&
            (
                participante.admin === 'admin' ||
                participante.admin === 'superadmin'
            )
        ) {
            return true;
        }
    }

    // Después intenta coincidencia por número
    for (const botJid of botJids) {
        if (esParticipanteAdmin(metadata, botJid)) {
            return true;
        }
    }

    return false;
}

// ============================================================
// VERIFICAR PERMISOS DE ADMIN
// ============================================================

export async function verificarPermisosAdmin(
    sock,
    msg,
    chatId
) {
    const metadata = await obtenerMetadata(
        sock,
        chatId
    );

    if (!metadata) {
        return {
            ok: false,
            motivo:
                '❌ No se pudo leer la información del grupo.'
        };
    }

    // ========================================================
    // REMITENTE
    // ========================================================

    const remitente = limpiarJid(
        msg.key.participant ||
        msg.key.remoteJid
    );

    // ========================================================
    // OWNER
    // ========================================================

    const ownerNumero =
        process.env.OWNER?.replace(/\D/g, '');

    const remitenteNumero =
        obtenerNumero(remitente);

    const esOwner =
        Boolean(
            ownerNumero &&
            remitenteNumero === ownerNumero
        );

    // ========================================================
    // ADMIN DEL USUARIO
    // ========================================================

    const senderEsAdmin =
        esParticipanteAdmin(
            metadata,
            remitente
        ) || esOwner;

    // ========================================================
    // ADMIN DEL BOT
    // ========================================================

    const botJids = obtenerJidsBot(sock);

    const botAdmin =
        botEsAdministrador(
            sock,
            metadata
        );

    // ========================================================
    // LOG DE DEPURACIÓN
    // ========================================================

    console.log(
        '[GRUPOS] Bot JIDs:',
        botJids
    );

    console.log(
        '[GRUPOS] Remitente:',
        remitenteNumero
    );

    console.log(
        '[GRUPOS] Usuario admin:',
        senderEsAdmin
    );

    console.log(
        '[GRUPOS] Bot admin:',
        botAdmin
    );

    // ========================================================
    // COMPROBAR USUARIO
    // ========================================================

    if (!senderEsAdmin) {
        return {
            ok: false,
            motivo:
                '❌ Este comando es solo para *administradores del grupo*.'
        };
    }

    // ========================================================
    // COMPROBAR BOT
    // ========================================================

    if (!botAdmin) {
        return {
            ok: false,
            motivo:
                '❌ Necesito ser *administrador del grupo* para poder hacer esto.'
        };
    }

    return {
        ok: true,
        metadata
    };
}

// ============================================================
// OBTENER OBJETIVO
//
// Prioridad:
// 1. Mención
// 2. Respuesta a mensaje
// 3. Número escrito
// ============================================================

export function obtenerObjetivo(
    msg,
    argumento
) {
    const contexto =
        msg.message?.extendedTextMessage?.contextInfo;

    // ========================================================
    // MENCIÓN
    // ========================================================

    if (
        contexto?.mentionedJid &&
        contexto.mentionedJid.length > 0
    ) {
        return contexto.mentionedJid[0];
    }

    // ========================================================
    // RESPUESTA
    // ========================================================

    if (contexto?.participant) {
        return contexto.participant;
    }

    // ========================================================
    // NÚMERO
    // ========================================================

    const numero =
        (argumento || '')
            .replace(/\D/g, '');

    if (numero) {
        return `${numero}@s.whatsapp.net`;
    }

    return null;
}
