

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
