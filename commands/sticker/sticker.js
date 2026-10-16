import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createRequire } from 'module';
import { downloadMediaMessage } from 'baileys';
import config from '../../config.js';

const require = createRequire(import.meta.url);
const webp = require('node-webpmux');

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tmp = path.join(__dirname, '..', '..', 'tmp');
const RUTA_META = path.join(__dirname, '..', '..', 'database', 'stickerMeta.json');

if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true });

const clean = (value) => typeof value === 'string' ? value.trim() : '';

function leerMeta() {
    try {
        const data = fs.readFileSync(RUTA_META, 'utf8');
        return JSON.parse(data);
    } catch {
        return {};
    }
}

function getStickerMeta(senderNum, pushName) {
    const metaDb = leerMeta();
    const userMeta = metaDb[senderNum];
    const nombre = pushName || senderNum.split('@')[0];

    if (userMeta && (userMeta.pack || userMeta.author)) {
        return {
            packname: clean(userMeta.pack) || clean(config.packname) || '⚡ BOT-API ',
            author: clean(userMeta.author) || `@${nombre}`
        };
    }

    return {
        packname: clean(config.packname) || '⚡ BOT-API ⚡',
        author: clean(config.author) || `@${nombre}`
    };
}

function parseTempMeta(args, packname, author) {
    if (!args.length) return { packname, author };
    const texto = args.join(' ').trim();
    if (!texto) return { packname, author };

    if (texto.includes('|')) {
        const [p, a] = texto.split('|').map(s => s.trim());
        return {
            packname: p || packname,
            author: a || author
        };
    }

    return {
        packname: texto,
        author: texto
    };
}

async function addExif(webpBuffer, packname, author) {
    const img = new webp.Image();

    const json = {
        'sticker-pack-id': crypto.randomBytes(32).toString('hex'),
        'sticker-pack-name': packname,
        'sticker-pack-publisher': author,
        emojis: ['']
    };

    const exifAttr = Buffer.from([
        0x49, 0x49, 0x2A, 0x00,
        0x08, 0x00, 0x00, 0x00,
        0x01, 0x00, 0x41, 0x57,
        0x07, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x16, 0x00,
        0x00, 0x00
    ]);

    const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
    const exif = Buffer.concat([exifAttr, jsonBuffer]);
    exif.writeUIntLE(jsonBuffer.length, 14, 4);

    await img.load(webpBuffer);
    img.exif = exif;

    return await img.save(null);
}

async function convertirWebp(buffer, esVideo = false) {
    const id = crypto.randomBytes(8).toString('hex');
    const ext = esVideo ? 'mp4' : 'jpg';

    const inputP = path.join(tmp, `stk_${id}.${ext}`);
    const outP = path.join(tmp, `stk_${id}.webp`);

    fs.writeFileSync(inputP, buffer);

    try {
        if (esVideo) {
            const { stdout } = await execAsync(
                `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputP}"`
            );
            const dur = parseFloat(stdout.trim());

            if (dur > 15) {
                throw new Error(`El video dura *${dur.toFixed(1)}s*, máximo *15 segundos*`);
            }

            await execAsync(
                `ffmpeg -i "${inputP}" -t 15 -vf "fps=15,scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000" -c:v libwebp -lossless 0 -q:v 70 -loop 0 -an -vsync 0 "${outP}" -y`
            );
        } else {
            await execAsync(
                `ffmpeg -i "${inputP}" -vf "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000" -c:v libwebp -lossless 0 -q:v 80 "${outP}" -y`
            );
        }

        return fs.readFileSync(outP);
    } finally {
        try { fs.unlinkSync(inputP); } catch {}
        try { fs.unlinkSync(outP); } catch {}
    }
}

async function limpiarSticker(buffer) {
    const id = crypto.randomBytes(8).toString('hex');
    const inputP = path.join(tmp, `stk_${id}.webp`);
    const outP = path.join(tmp, `stk_${id}_out.webp`);

    fs.writeFileSync(inputP, buffer);

    try {
        try {
            await execAsync(`ffmpeg -i "${inputP}" -vcodec copy "${outP}" -y`);
        } catch {
            try {
                await execAsync(
                    `ffmpeg -i "${inputP}" -vf "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000" -c:v libwebp -lossless 0 -q:v 70 -loop 0 -an -vsync 0 "${outP}" -y`
                );
            } catch {
                fs.writeFileSync(outP, buffer);
            }
        }
        return fs.readFileSync(outP);
    } finally {
        try { fs.unlinkSync(inputP); } catch {}
        try { fs.unlinkSync(outP); } catch {}
    }
}

export default {
    nombre: 'sticker',
    categoria: 'Stickers',
    alias: ['s', 'stik', 'stick', 'sticker'],
    descripcion: 'Crea stickers desde imagen, video o sticker.',

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        try {
            const reaccion = async (emoji) => {
                await sock.sendMessage(jid, { react: { text: emoji, key: msg.key } });
            };

            await reaccion('🕒');

            const senderNum = msg.key.participant || msg.key.remoteJid;
            const pushName = msg.pushName || senderNum.split('@')[0];

            let { packname, author } = getStickerMeta(senderNum, pushName);
            const args = argumento ? argumento.split(' ') : [];

            const tempMeta = parseTempMeta(args, packname, author);
            packname = tempMeta.packname;
            author = tempMeta.author;

            const msgType = Object.keys(msg.message || {})[0];
            const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
            const quoted = contextInfo?.quotedMessage;
            const quotedType = quoted ? Object.keys(quoted)[0] : null;

            const validTypes = ['imageMessage', 'videoMessage', 'stickerMessage'];
            const mediaMsg = validTypes.includes(msgType) ? msg : null;

            const quotedMsg = quoted && validTypes.includes(quotedType)
                ? {
                    key: {
                        remoteJid: jid,
                        id: contextInfo?.stanzaId,
                        participant: contextInfo?.participant
                    },
                    message: quoted
                }
                : null;

            const targetMsg = mediaMsg || quotedMsg;
            const targetType = mediaMsg ? msgType : quotedType;

            if (!targetMsg) {
                await reaccion('❌');
                return await responder.texto(
                    '╭━━〔 🖼️ 𝐒𝐓𝐈𝐂𝐊𝐄𝐑 〕━━⬣\n' +
                    '┃\n' +
                    '┃  Envía o responde una imagen,\n' +
                    '┃    video (máx 15s) o sticker.\n' +
                    '┃\n' +
                    '┃  Ejemplos:\n' +
                    ' › .s ➔ sticker normal\n' +
                    '┃ › .s MiMarca ➔ marca temporal\n' +
                    '┃ › .s Marca | Autor ➔ marca personalizada\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );
            }

            const buffer = await downloadMediaMessage(targetMsg, 'buffer', {}, { sock });

            const esVideo = targetType === 'videoMessage';
            const esSticker = targetType === 'stickerMessage';

            const webpBuffer = esSticker
                ? await limpiarSticker(buffer)
                : await convertirWebp(buffer, esVideo);

            const stickerFinal = await addExif(webpBuffer, packname, author);

            await sock.sendMessage(jid, { sticker: stickerFinal }, { quoted: msg });
            await reaccion('✅');

        } catch (error) {
            console.error('[STICKER] Error:', error?.message || error);
            await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
            await responder.texto(
                '❌ Error al crear el sticker.\n\n' +
                '⚠️ Detalle: ' + (error?.message || 'Error desconocido')
            );
        }
    }
};