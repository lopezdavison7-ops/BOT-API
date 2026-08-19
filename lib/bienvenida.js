// ============================================================
// BIENVENIDA - BOT-API
// ============================================================

const FIRMA = 'BOT-API';

function textoSeguro(valor, fallback = '') {
    if (typeof valor === 'string') {
        const texto = valor.trim();

        if (texto && texto !== '[object Object]') {
            return texto;
        }
    }

    if (typeof valor === 'number') {
        return String(valor);
    }

    return fallback;
}

function obtenerJid(participante) {
    if (typeof participante === 'string') {
        return participante;
    }

    if (!participante || typeof participante !== 'object') {
        return null;
    }

    const posibles = [
        participante.id,
        participante.jid,
        participante.phoneNumber,
        participante.lid
    ];

    for (const valor of posibles) {
        if (typeof valor === 'string' && valor.includes('@')) {
            return valor;
        }
    }

    return null;
}

function obtenerNombre(participante, metadata) {
    const jid = obtenerJid(participante);

    // Buscar primero por JID
    if (jid && Array.isArray(metadata?.participants)) {

        const encontrado = metadata.participants.find(item => {
            return obtenerJid(item) === jid;
        });

        if (encontrado && typeof encontrado === 'object') {

            const campos = [
                encontrado.notify,
                encontrado.name,
                encontrado.vname,
                encontrado.displayName
            ];

            for (const campo of campos) {
                const nombre = textoSeguro(campo);

                if (nombre) {
                    return nombre;
                }
            }
        }
    }

    // Algunos eventos pueden traer el nombre directamente
    if (participante && typeof participante === 'object') {

        const campos = [
            participante.notify,
            participante.name,
            participante.vname,
            participante.displayName
        ];

        for (const campo of campos) {
            const nombre = textoSeguro(campo);

            if (nombre) {
                return nombre;
            }
        }
    }

    // Último recurso: número del JID
    if (jid) {
        const numero = jid
            .split('@')[0]
            .split(':')[0];

        if (numero) {
            return numero;
        }
    }

    return 'Nuevo miembro';
}

async function obtenerFoto(sock, jid) {
    try {

        const url =
            await sock.profilePictureUrl(
                jid,
                'image'
            );

        if (!url) {
            return null;
        }

        const respuesta =
            await fetch(url);

        if (!respuesta.ok) {
            return null;
        }

        const datos =
            await respuesta.arrayBuffer();

        if (!datos.byteLength) {
            return null;
        }

        return Buffer.from(datos);

    } catch {
        return null;
    }
}

export function registrarBienvenida(sock) {

    if (!sock?.ev) {
        throw new Error(
            'Socket inválido para bienvenida.'
        );
    }

    sock.ev.on(
        'group-participants.update',
        async evento => {

            try {

                if (!evento) {
                    return;
                }

                const grupo = evento.id;
                const accion = evento.action;
                const participantes =
                    Array.isArray(evento.participants)
                        ? evento.participants
                        : [];

                if (accion !== 'add') {
                    return;
                }

                if (!grupo || !participantes.length) {
                    return;
                }

                let metadata = null;

                try {
                    metadata =
                        await sock.groupMetadata(grupo);
                } catch (error) {
                    console.error(
                        '[BIENVENIDA] Metadata:',
                        error?.message || error
                    );
                }

                const nombreGrupo =
                    textoSeguro(
                        metadata?.subject,
                        'nuestro grupo'
                    );

                for (const participante of participantes) {

                    try {

                        const jid =
                            obtenerJid(participante);

                        if (!jid) {
                            console.log(
                                '[BIENVENIDA] JID inválido:',
                                participante
                            );

                            continue;
                        }

                        const nombre =
                            obtenerNombre(
                                participante,
                                metadata
                            );

                        const nombreFinal =
                            textoSeguro(
                                nombre,
                                'Nuevo miembro'
                            );

                        const mensaje =
                            '╭━━━〔 ✨ *BIENVENIDO/A* 〕━━━╮\n' +
                            '┃\n' +
                            `┃ 👤 *${nombreFinal}*\n` +
                            '┃\n' +
                            `┃ 🎉 ¡Bienvenido/a a\n` +
                            `┃    *${nombreGrupo}*!\n` +
                            '┃\n' +
                            '┃ 🤝 Esperamos que disfrutes\n' +
                            '┃    tu estancia con nosotros.\n' +
                            '┃\n' +
                            '┃ 📜 Escribe *.menu* para\n' +
                            '┃    ver los comandos.\n' +
                            '┃\n' +
                            '╰━━━━━━━━━━━━━━━━━━━━━━╯\n' +
                            '\n' +
                            `              🤖 *${FIRMA}*`;

                        const foto =
                            await obtenerFoto(
                                sock,
                                jid
                            );

                        if (foto) {

                            await sock.sendMessage(
                                grupo,
                                {
                                    image: foto,
                                    caption: mensaje,
                                    mentions: [jid]
                                }
                            );

                        } else {

                            await sock.sendMessage(
                                grupo,
                                {
                                    text: mensaje,
                                    mentions: [jid]
                                }
                            );
                        }

                        console.log(
                            `[BIENVENIDA] ${nombreFinal} (${jid})`
                        );

                    } catch (error) {

                        console.error(
                            '[BIENVENIDA] Participante:',
                            error?.message || error
                        );
                    }
                }

            } catch (error) {

                console.error(
                    '[BIENVENIDA] Evento:',
                    error?.message || error
                );
            }
        }
    );

    console.log(
        '🎉 Sistema de bienvenida BOT-API activado.'
    );
}
