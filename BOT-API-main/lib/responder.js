

export function crearRespondedor(sock, msg) {

    const remitente = msg.key.remoteJid;

    async function descargar(url) {

        const respuesta = await fetch(url, {
            headers: {
                'User-Agent': 'AlexBot/1.0',
                'Accept': '*/*',
                'Referer': 'https://nekos.best/'
            }
        });

        if (!respuesta.ok) {
            throw new Error(
                `El servidor del archivo respondió HTTP ${respuesta.status}`
            );
        }

        const arrayBuffer = await respuesta.arrayBuffer();

        return Buffer.from(arrayBuffer);
    }

    return {

        texto: async (texto) => {

            return sock.sendMessage(
                remitente,
                {
                    text: texto
                },
                {
                    quoted: msg
                }
            );
        },

        imagen: async (fuente, caption = '') => {

            let buffer;

            if (Buffer.isBuffer(fuente)) {

                buffer = fuente;

            } else if (
                typeof fuente === 'string' &&
                /^https?:\/\//i.test(fuente)
            ) {

                buffer = await descargar(fuente);

            } else {

                throw new Error(
                    'Fuente de imagen no válida.'
                );
            }

            return sock.sendMessage(
                remitente,
                {
                    image: buffer,
                    caption
                },
                {
                    quoted: msg
                }
            );
        },

        video: async (fuente, caption = '') => {

            let buffer;

            if (Buffer.isBuffer(fuente)) {

                buffer = fuente;

            } else if (
                typeof fuente === 'string' &&
                /^https?:\/\//i.test(fuente)
            ) {

                buffer = await descargar(fuente);

            } else {

                throw new Error(
                    'Fuente de video no válida.'
                );
            }

            return sock.sendMessage(
                remitente,
                {
                    video: buffer,
                    caption
                },
                {
                    quoted: msg
                }
            );
        },

        audio: async (fuente) => {

            let buffer;

            if (Buffer.isBuffer(fuente)) {

                buffer = fuente;

            } else if (
                typeof fuente === 'string' &&
                /^https?:\/\//i.test(fuente)
            ) {

                buffer = await descargar(fuente);

            } else {

                throw new Error(
                    'Fuente de audio no válida.'
                );
            }

            return sock.sendMessage(
                remitente,
                {
                    audio: buffer,
                    mimetype: 'audio/mp4'
                },
                {
                    quoted: msg
                }
            );
        }
    };
}
