
import fetch from 'node-fetch';
import sharp from 'sharp';

const API_URL = 'https://api.lempi.lat/tools/brat';
const API_KEY = 'lem_777e1c256edcd0ce3c4c31d34fc61cdba7bd465e';

const COLORES = {
    verde:    '#8ACE00',
    brat:     '#8ACE00',
    blanco:   'Blanco',
    negro:    'Negro',
    azul:     'Azul',
    rojo:     'Rojo',
    rosa:     'Rosa',
    amarillo: 'Amarillo',
    morado:   'Morado',
    naranja:  'Naranja'
};

function obtenerMensajeCitado(msg) {
    return msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
}

function extraerTextoDeMensaje(mensaje) {
    if (!mensaje) return '';

    return (
        mensaje.conversation ||
        mensaje.extendedTextMessage?.text ||
        mensaje.imageMessage?.caption ||
        mensaje.videoMessage?.caption ||
        ''
    ).trim();
}

export default {
    nombre: 'brat',
    categoria: 'Stickers',
    alias: ['bratcover', 'charli', 'bratsticker'],
    descripcion: 'Genera sticker estilo brat con tu texto (soporta mensajes citados)',
    uso: '.brat [color] <texto> | .brat [color] (respondiendo a mensaje)',

    ejecutar: async ({ sock, msg, argumento, responder }) => {
        try {
            const args = String(argumento || '').trim().split(/\s+/).filter(Boolean);

            const mensajeCitado = obtenerMensajeCitado(msg);
            let textoCitado = '';

            if (mensajeCitado) {
                textoCitado = extraerTextoDeMensaje(mensajeCitado);
                console.log(`[BRAT] Mensaje citado detectado: "${textoCitado}"`);
            }

            if (!args[0] && !textoCitado) {
                return await responder.texto(
                    '╭━━〔 🎤 𝐁𝐑𝐀𝐓 𝐒𝐓𝐈𝐂𝐊𝐄𝐑 〕━━⬣\n' +
                    '┃\n' +
                    '┃ Uso: .brat [color] <texto>\n' +
                    '┃      .brat [color] (respondiendo a mensaje)\n' +
                    '┃\n' +
                    '┃ Ejemplos:\n' +
                    '┃  • .brat hola mundo\n' +
                    '┃  • .brat blanco soy una chica\n' +
                    '┃  • .brat rosa i\'m your fav\n' +
                    '┃\n' +
                    '┃ Con mensaje citado:\n' +
                    '┃  • Responde a "hola mundo" y escribe:\n' +
                    '┃    .brat verde\n' +
                    '┃\n' +
                    '┃ Colores: verde/brat, blanco, negro,\n' +
                    '┃ azul, rojo, rosa, amarillo, morado,\n' +
                    '┃ naranja o hex (#FFFFFF)\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            }

            let color = 'verde';
            let texto = '';

            if (args[0]) {
                const primer = args[0].toLowerCase();

                if (COLORES[primer] || /^#[0-9a-f]{3,8}$/i.test(primer)) {
                    color = COLORES[primer] || primer;

                    if (args.length > 1) {
                        texto = args.slice(1).join(' ');
                    } else if (textoCitado) {

                        texto = textoCitado;
                    } else {

                        return await responder.texto('❌ Falta el texto. Ejemplo: .brat blanco hola');
                    }
                } else {

                    texto = args.join(' ');
                }
            } else if (textoCitado) {

                texto = textoCitado;
            }

            if (!texto) {
                return await responder.texto('❌ Falta el texto. Ejemplo: .brat blanco hola');
            }

            console.log(`[BRAT] Texto final: "${texto}"`);
            console.log(`[BRAT] Color: ${color}`);

            const url = `${API_URL}?text=${encodeURIComponent(texto)}&color=${encodeURIComponent(color)}&format=image&apikey=${API_KEY}`;
            const resp = await fetch(url, { headers: { 'Content-Type': 'application/json' } });

            if (!resp.ok) {
                throw new Error('API respondió ' + resp.status);
            }

            const data = await resp.json();

            if (!data.status || !data.descarga) {
                return await responder.texto('❌ La API no devolvió imagen: ' + JSON.stringify(data));
            }

            const imgResp = await fetch(data.descarga);
            if (!imgResp.ok) {
                throw new Error('No se pudo descargar la imagen');
            }

            const buffer = await imgResp.arrayBuffer();

            const stickerBuffer = await sharp(Buffer.from(buffer))
                .resize(512, 512, {
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .webp({ quality: 80 })
                .toBuffer();

            await sock.sendMessage(msg.key.remoteJid, {
                sticker: stickerBuffer,
                mimetype: 'image/webp'
            }, { quoted: msg });

            console.log('[BRAT] ✅ Sticker enviado correctamente');

        } catch (error) {
            console.error('[BRAT] Error:', error);
            await responder.texto('❌ Error generando sticker brat: ' + (error.message || error));
        }
    }
};