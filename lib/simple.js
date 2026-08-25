// lib/simple.js
// ============================================================
// UTILIDADES SIMPLES DE USUARIO
// ALEX BOT
// Compatible con JID normales y LID de WhatsApp
// ============================================================

// ============================================================
// LIMPIAR JID
// ============================================================

// ============================================================
// QUITAR SUFIJO DE DISPOSITIVO (ej: "123:45@s.whatsapp.net"
// -> "123@s.whatsapp.net"). A diferencia de una limpieza por
// regex, esto NO toca el dominio (@lid, @s.whatsapp.net, @g.us)
// para que el JID siga siendo válido para usarlo con sock.*
// ============================================================

function limpiarJid(jid) {

    if (!jid) {
        return '';
    }

    const texto = String(jid);
    const [local, dominio] = texto.split('@');

    if (!dominio) {
        return texto;
    }

    const localSinDispositivo =
        local.split(':')[0];

    return `${localSinDispositivo}@${dominio}`;

}

// ============================================================
// OBTENER NÚMERO
// (solo los dígitos de la parte local, para comparar)
// ============================================================

function obtenerNumero(jid) {

    if (!jid) {
        return '';
    }

    const local =
        String(jid).split('@')[0];

    return local
        .split(':')[0]
        .replace(/\D/g, '');

}

// ============================================================
// EXTRAER TODOS LOS IDENTIFICADORES POSIBLES DE UN PARTICIPANTE
// (algunos vienen como string, otros como objeto con
// variantes: id, jid, phoneNumber, lid, participant)
// ============================================================

function identificadoresDe(participante) {

    if (typeof participante === 'string') {
        return [participante];
    }

    return [
        participante?.id,
        participante?.jid,
        participante?.phoneNumber,
        participante?.lid,
        participante?.participant
    ].filter(Boolean);

}

// ============================================================
// OBTENER NOMBRE VISIBLE
// (prioriza name/notify/verifiedName reales sobre el número)
// ============================================================

function obtenerNombre(participante, sock, jidsCandidatos) {

    const nombresCandidatos = [
        typeof participante === 'object' ? participante?.name : null,
        typeof participante === 'object' ? participante?.notify : null,
        typeof participante === 'object' ? participante?.verifiedName : null
    ];

    for (const jid of jidsCandidatos) {

        const contacto =
            sock?.store?.contacts?.[jid];

        if (contacto) {

            nombresCandidatos.push(
                contacto.name,
                contacto.notify,
                contacto.verifiedName
            );

        }

    }

    for (const nombre of nombresCandidatos) {

        if (
            typeof nombre === 'string' &&
            nombre.trim() &&
            nombre.trim() !== '[object Object]' &&
            !/^\+?\d+$/.test(nombre.trim())
        ) {

            return nombre.trim();

        }

    }

    return null;

}

// ============================================================
// OBTENER INFORMACIÓN DE UN USUARIO DENTRO DE UN GRUPO
//
// Uso:
//   const meta = await sock.groupMetadata(chatId);
//   const info = await getUserInfo(lidOJid, meta.participants, sock);
//
// Devuelve:
//   {
//     encontrado: boolean,
//     jid: string,          // JID original tal como aparece en participants
//     numero: string,       // solo dígitos (si el JID lo expone)
//     nombre: string|null,  // mejor nombre disponible
//     esAdmin: boolean,
//     esSuperAdmin: boolean,
//     fotoPerfil: string|null
//   }
// ============================================================

// ============================================================
// RESOLVER MENCIONABLE
// ============================================================
// WhatsApp asigna a cada persona un LID (identificador nuevo,
// numérico, distinto de su número real) además de su JID
// tradicional (@s.whatsapp.net). Muchas versiones de Baileys
// no renderizan bien la mención clicable cuando se usa el LID
// directo. Esta función busca, dentro de los participantes de
// un grupo, si esa persona también tiene un identificador
// "normal" y lo devuelve — para usar ESE en el texto y en el
// arreglo de mentions, en vez del LID.
//
// Si no se encuentra nada mejor (o no es un LID), devuelve el
// mismo jid tal cual, sin romper nada.
// ============================================================

export function resolverMencionable(jid, participants) {

    if (
        !jid ||
        !String(jid).endsWith('@lid')
    ) {

        return jid;

    }

    const numeroBuscado =
        obtenerNumero(jid);

    const jidLimpioBuscado =
        limpiarJid(jid);

    const participante =
        (participants || []).find(p => {

            const ids =
                identificadoresDe(p);

            return ids.some(id => {

                const limpio =
                    limpiarJid(id);

                return (
                    limpio === jidLimpioBuscado ||
                    (
                        numeroBuscado &&
                        obtenerNumero(id) === numeroBuscado
                    )
                );

            });

        });

    if (!participante) {

        return jid;

    }

    const idsLimpios =
        identificadoresDe(participante)
            .map(limpiarJid)
            .filter(Boolean);

    const alterno =
        idsLimpios.find(
            id => !id.endsWith('@lid')
        );

    return alterno || jid;

}

export async function getUserInfo(lid, participants, sock) {

    const numeroBuscado =
        obtenerNumero(lid);

    const jidLimpioBuscado =
        limpiarJid(lid);

    const participante =
        (participants || []).find(p => {

            const ids =
                identificadoresDe(p);

            return ids.some(id => {

                const limpio =
                    limpiarJid(id);

                return (
                    limpio === jidLimpioBuscado ||
                    (
                        numeroBuscado &&
                        obtenerNumero(id) === numeroBuscado
                    )
                );

            });

        });

    if (!participante) {

        return {
            encontrado: false,
            jid: jidLimpioBuscado || String(lid),
            numero: numeroBuscado || null,
            nombre: null,
            esAdmin: false,
            esSuperAdmin: false,
            fotoPerfil: null
        };

    }

    const jidsCandidatos =
        identificadoresDe(participante)
            .map(limpiarJid)
            .filter(Boolean);

    const jidPrincipal =
        jidsCandidatos[0] || jidLimpioBuscado;

    const nombre =
        obtenerNombre(participante, sock, jidsCandidatos);

    let fotoPerfil = null;

    try {

        fotoPerfil = await sock.profilePictureUrl(
            jidPrincipal,
            'image'
        );

    } catch (_error) {

        fotoPerfil = null;

    }

    return {
        encontrado: true,
        jid: jidPrincipal,
        numero: obtenerNumero(jidPrincipal) || numeroBuscado || null,
        nombre: nombre || null,
        esAdmin:
            participante?.admin === 'admin' ||
            participante?.admin === 'superadmin',
        esSuperAdmin: participante?.admin === 'superadmin',
        fotoPerfil
    };

}

export default {
    getUserInfo,
    resolverMencionable
};
