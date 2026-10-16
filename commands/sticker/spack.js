import fetch from 'node-fetch';
import https from 'node:https';
import axios from 'axios';
import sharp from 'sharp';
import { crc32 } from 'zlib';
import {
    MEDIA_PATH_MAP,
    MEDIA_HKDF_KEY_MAPPING,
    encryptedStream,
    generateWAMessageFromContent,
    generateMessageIDV2,
    unixTimestampSeconds,
    sha256,
    proto
} from 'baileys';

// Registrar tipo de media para sticker packs
MEDIA_PATH_MAP['sticker-pack'] = '/mms/document';
MEDIA_HKDF_KEY_MAPPING['sticker-pack'] = 'Sticker Pack';

const AGENTE = new https.Agent({ keepAlive: true, maxSockets: 10 });
const HEADERS = { 
    'Accept': 'application/json', 
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};

const MAX_STICKERS = 30;
const API_SEARCH = 'https://api.delirius.online/search/stickerly';
const API_DOWNLOAD = 'https://api.delirius.online/download/stickerly';

if (!global.spackSessions) global.spackSessions = new Map();
const SESSION_TTL = 5 * 60 * 1000;

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function reqJSON(url, timeout = 15000) {
    const res = await fetch(url, { 
        agent: AGENTE, 
        headers: HEADERS, 
        signal: AbortSignal.timeout(timeout) 
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
}

function esURL(s) {
    return /sticker\.ly\/s\//i.test(s);
}

function fmtNum(n) {
    const num = Number(n) || 0;
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return String(num);
}

function limpiarPackName(s) {
    return String(s).replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim().slice(0, 24) || 'BOT-API Pack';
}

function apiOk(data) {
    return data.estado === true || data.estado === 'verdadero' || data.status === true;
}

// Verificar si es WebP
const isWebp = (b) =>
    b.length >= 12 &&
    b.toString('ascii', 0, 4) === 'RIFF' &&
    b.toString('ascii', 8, 12) === 'WEBP';

// Verificar si es WebP animado
const isAnimatedWebp = (b) => {
    if (!isWebp(b)) return false;
    let o = 12;
    while (o < b.length - 8) {
        const tag = b.toString('ascii', o, o + 4);
        const sz = b.readUInt32LE(o + 4);
        if (tag === 'VP8X' && b[o + 8] & 0x02) return true;
        if (tag === 'ANIM' || tag === 'ANMF') return true;
        o += 8 + sz + (sz % 2);
    }
    return false;
};

// Convertir a WebP
const toWebp = async (buffer, animated = false) =>
    sharp(buffer, animated ? { animated: true } : {})
        .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: 80, ...(animated ? { loop: 0 } : {}) })
        .toBuffer();

// Crear ZIP manual
const makeZip = (files) => {
    const locals = [];
    const centrals = [];
    let offset = 0;
    for (const [name, data] of Object.entries(files)) {
        const n = Buffer.from(name, 'utf8');
        const crc = crc32(data);
        const local = Buffer.alloc(30 + n.length);
        local.writeUInt32LE(0x04034b50, 0);
        local.writeUInt16LE(20, 4);
        local.writeUInt32LE(crc, 14);
        local.writeUInt32LE(data.length, 18);
        local.writeUInt32LE(data.length, 22);
        local.writeUInt16LE(n.length, 26);
        n.copy(local, 30);
        locals.push(local, data);
        const central = Buffer.alloc(46 + n.length);
        central.writeUInt32LE(0x02014b50, 0);
        central.writeUInt16LE(20, 4);
        central.writeUInt16LE(20, 6);
        central.writeUInt32LE(crc, 16);
        central.writeUInt32LE(data.length, 20);
        central.writeUInt32LE(data.length, 24);
        central.writeUInt16LE(n.length, 28);
        central.writeUInt32LE(offset, 42);
        n.copy(central, 46);
        centrals.push(central);
        offset += local.length + data.length;
    }
    const cd = Buffer.concat(centrals);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(centrals.length, 8);
    end.writeUInt16LE(centrals.length, 10);
    end.writeUInt32LE(cd.length, 12);
    end.writeUInt32LE(offset, 16);
    return Buffer.concat([...locals, cd, end]);
};

// Descargar buffer
async function descargarBuffer(url, timeout = 20000) {
    const res = await fetch(url, {
        agent: AGENTE,
        headers: { ...HEADERS, 'Accept': '*/*' },
        signal: AbortSignal.timeout(timeout)
    });
    if (!res.ok) throw new Error('Descarga HTTP ' + res.status);
    return Buffer.from(await res.arrayBuffer());
}

// Enviar sticker pack nativo
async function sendStickerPack(sock, jid, { name, publisher, description, stickers, cover, quoted }) {
    if (!stickers.length) throw new Error('Pack vacío');
    if (stickers.length > 60) throw new Error('Máximo 60 stickers por pack');

    const packId = generateMessageIDV2();
    const files = {};

    const meta = stickers.map((s) => {
        if (s.sticker.length > 1024 * 1024) throw new Error('Un sticker supera 1MB');
        const fileName = sha256(s.sticker).toString('base64').replace(/\//g, '-') + '.webp';
        files[fileName] = s.sticker;
        return {
            fileName,
            mimetype: 'image/webp',
            isAnimated: !!s.isAnimated,
            emojis: s.emojis?.length ? s.emojis : ['🎭'],
            accessibilityLabel: ''
        };
    });

    const trayIconFileName = `${packId}.webp`;
    files[trayIconFileName] = cover;

    const zipBuffer = makeZip(files);

    const up = await encryptedStream(zipBuffer, 'sticker-pack', { logger: sock.logger });
    const { directPath } = await sock.waUploadToServer(up.encFilePath, {
        fileEncSha256B64: up.fileEncSha256.toString('base64'),
        mediaType: 'sticker-pack'
    });

    const content = {
        stickerPackMessage: {
            name,
            publisher,
            packDescription: description,
            stickerPackId: packId,
            stickerPackOrigin: proto.Message.StickerPackMessage.StickerPackOrigin.THIRD_PARTY,
            stickerPackSize: zipBuffer.length,
            stickers: meta,
            fileSha256: up.fileSha256,
            fileEncSha256: up.fileEncSha256,
            mediaKey: up.mediaKey,
            directPath,
            fileLength: up.fileLength,
            mediaKeyTimestamp: unixTimestampSeconds(),
            trayIconFileName
        }
    };

    const m = generateWAMessageFromContent(jid, content, { quoted, userJid: sock.user.id });
    await sock.relayMessage(jid, m.message, { messageId: m.key.id });
    return m;
}

async function buscarPacks(query) {
    const data = await reqJSON(`${API_SEARCH}?query=${encodeURIComponent(query)}`, 15000);
    if (!apiOk(data)) throw new Error('API sin resultados');
    const lista = data.datos || data.data || [];
    if (!Array.isArray(lista) || !lista.length) throw new Error('Sin resultados');
    return lista.slice(0, 10).map(p => ({
        nombre: p.nombre || p.name || 'Sin nombre',
        autor: p.autor || p.author || 'Desconocido',
        stickers: p.sticker_count || 0,
        vistas: p.view_count || 0,
        descargas: p.export_count || 0,
        animado: p.isAnimated || false,
        pagado: p.isPaid || false,
        preview: p.vista_previa || p.vista || p.preview || '',
        url: p.url || ''
    }));
}

async function obtenerPack(url) {
    const data = await reqJSON(`${API_DOWNLOAD}?url=${encodeURIComponent(url)}`, 20000);
    if (!apiOk(data)) throw new Error('API sin datos del pack');
    const pack = data.datos || data.data || {};
    return {
        nombre: pack.nombre || pack.name || 'Sin nombre',
        autor: pack.autora || pack.autor || pack.author || 'Desconocido',
        username: pack.username || '',
        seguidores: pack.seguidores || 0,
        privado: pack.isPrivate || false,
        avatar: pack.avatar || '',
        total: pack.total || pack.sticker_count || 0,
        vistas: pack.viewCount || pack.view_count || 0,
        descargas: pack.exportCount || pack.export_count || 0,
        animado: pack.isAnimated || false,
        preview: pack.vista_previa || pack.vista || pack.preview || '',
        url: pack.url || url,
        compartir: pack.compartir || pack.share || '',
        stickers: pack.pegatinas || pack.stickers || []
    };
}

export default {
    nombre: 'spack',
    categoria: 'Stickers',
    alias: ['stickerpack', 'stickers', 'packsticker', 'pack', 'stickerly'],
    descripcion: 'Busca y descarga packs de stickers de Stickerly como pack nativo',
    uso: '.spack <nombre> | .spack <url> | .spack <número>',

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        const query = String(argumento || '').trim();
        const sender = msg.key.participant || msg.key.senderPn || msg.key.remoteJid;

        if (!query) {
            return await responder.texto(
                '╭━━〔 🎨 𝐒𝐓𝐈𝐂𝐊𝐄𝐑 𝐏𝐀𝐂𝐊 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Escribe el nombre del\n' +
                '┃    pack o pega la URL\n' +
                '┃\n' +
                '┃ 💡 Ejemplos:\n' +
                '┃ ➪ .spack my melody\n' +
                '┃ ➪ .spack https://sticker.ly/s/XXX\n' +
                '┃ ➪ .spack 1 (tras buscar)\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        const esNumero = /^\d+$/.test(query);

        if (esNumero) {
            const num = parseInt(query);
            const session = global.spackSessions.get(sender);

            if (!session || Date.now() - session.t > SESSION_TTL) {
                return await responder.texto(
                    '❌ Sesión expirada. Busca de nuevo:\n➪ *.spack my melody*'
                );
            }

            const item = session.resultados[num - 1];
            if (!item) {
                return await responder.texto(
                    '❌ Número inválido. Elige del 1 al ' + session.resultados.length
                );
            }

            await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });
            return await enviarPack(sock, msg, responder, jid, item.url);
        }

        if (esURL(query)) {
            await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });
            return await enviarPack(sock, msg, responder, jid, query);
        }

        await sock.sendMessage(jid, { react: { text: '🔍', key: msg.key } });

        try {
            const resultados = await buscarPacks(query);

            global.spackSessions.set(sender, { 
                resultados, 
                t: Date.now() 
            });

            let cap =
                '╭━━〔 🎨 𝐑𝐄𝐒𝐔𝐋𝐓𝐀𝐃𝐎𝐒 〕━━⬣\n' +
                '┃\n' +
                '┃ 🔍 *' + query + '*\n' +
                '┃ 📊 ' + resultados.length + ' packs encontrados\n' +
                '┃\n';

            resultados.forEach((p, i) => {
                cap += '┃ *' + (i + 1) + '.* ' + p.nombre.slice(0, 32) + '\n';
                cap += '┃    👤 ' + p.autor + ' | 📸 ' + p.stickers + '\n';
                cap += '┃    👁️ ' + fmtNum(p.vistas) + ' | ⬇️ ' + fmtNum(p.descargas);
                if (p.animado) cap += ' | 🎬 ANIM';
                if (p.pagado) cap += ' | 💰 PAID';
                cap += '\n';
                if (i < resultados.length - 1) cap += '┃\n';
            });

            cap +=
                '┃\n' +
                '┣━━〔 📥 𝐃𝐄𝐒𝐂𝐀𝐑𝐆𝐀𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ ➪ .spack 1\n' +
                '┃ ➪ .spack 2\n' +
                '┃\n' +
                '┃ ⏳ Sesión válida 5 min\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            if (resultados[0]?.preview) {
                try {
                    await sock.sendMessage(jid, {
                        image: { url: resultados[0].preview },
                        caption: cap
                    }, { quoted: msg });
                    await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
                    return;
                } catch {}
            }

            await responder.texto(cap);
            await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });

        } catch (error) {
            console.error('[SPACK-SEARCH] Error:', error?.message || error);
            await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
            await responder.texto(
                '╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ ⚠️ ' + (error?.message || 'No se encontraron packs') + '\n' +
                '┃\n' +
                '┃ 💡 Intenta con otro nombre\n' +
                '┃    o pega la URL directa\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }
    }
};

async function enviarPack(sock, msg, responder, jid, url) {
    try {
        const pack = await obtenerPack(url);
        const stickers = pack.stickers.slice(0, MAX_STICKERS);

        if (!stickers.length) {
            throw new Error('El pack no tiene stickers');
        }

        const packName = limpiarPackName(pack.nombre);
        const packAuthor = limpiarPackName(pack.autor);

        await responder.texto(
            '╭━━〔 📦 𝐂𝐑𝐄𝐀𝐍𝐃𝐎 𝐏𝐀𝐂𝐊 𝐍𝐀𝐓𝐈𝐕𝐎 〕━━⬣\n' +
            '┃\n' +
            '┃ 📦 *' + pack.nombre + '*\n' +
            '┃ 👤 ' + pack.autor + '\n' +
            '┃ 📸 Procesando ' + stickers.length + ' stickers\n' +
            '┃ ' + (pack.animado ? '🎬 Animado' : '🖼️ Estático') + '\n' +
            '┃\n' +
            '┃ ⏳ Descargando y creando\n' +
            '┃    pack nativo de WhatsApp...\n' +
            '┃    (1-2 minutos)\n' +
            '┃\n' +
            '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
        );

        // Descargar y procesar stickers
        const stickersProcesados = (
            await Promise.allSettled(
                stickers.map(async (stickerUrl) => {
                    const buf = await descargarBuffer(stickerUrl, 20000);
                    const animated = pack.animado || isAnimatedWebp(buf);
                    const webp = isWebp(buf) ? buf : await toWebp(buf, animated);
                    return { sticker: webp, isAnimated: animated, emojis: ['🎭'] };
                })
            )
        )
            .filter((r) => r.status === 'fulfilled')
            .map((r) => r.value);

        if (!stickersProcesados.length) {
            throw new Error('No se pudo procesar ningún sticker');
        }

        // Crear portada
        const cover = await sharp(await descargarBuffer(pack.preview, 15000))
            .resize(96, 96, { fit: 'cover' })
            .webp({ quality: 80 })
            .toBuffer();

        // Enviar pack nativo
        await sendStickerPack(sock, jid, {
            name: packName,
            publisher: packAuthor,
            description: `${pack.nombre} • BOT-API`,
            stickers: stickersProcesados,
            cover,
            quoted: msg
        });

        await responder.texto(
            '╭━━〔 ✅ 𝐏𝐀𝐂𝐊 𝐍𝐀𝐓𝐈𝐕𝐎 𝐈𝐍𝐒𝐓𝐀𝐋𝐀𝐃𝐎 〕━━⬣\n' +
            '┃\n' +
            '┃ 📦 Pack › *' + packName + '*\n' +
            '┃ 👤 Autor › *' + packAuthor + '*\n' +
            '┃ 📸 ' + stickersProcesados.length + ' stickers\n' +
            '┃\n' +
            '┃ ✅ El pack ya está instalado\n' +
            '┃    en tu WhatsApp\n' +
            '┃\n' +
            '┃ 📥 Ver pack completo:\n' +
            '┃ ' + (pack.compartir || pack.url) + '\n' +
            '┃\n' +
            '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
        );

        await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
        console.log(`[SPACK] ✅ Pack nativo enviado: ${pack.nombre} (${stickersProcesados.length} stickers)`);

    } catch (error) {
        console.error('[SPACK] Error:', error?.message || error);
        await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
        await responder.texto(
            '╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n' +
            '┃\n' +
            '┃ ⚠️ ' + (error?.message || 'No se pudo crear el pack') + '\n' +
            '┃\n' +
            '┃ 💡 Verifica que la URL sea\n' +
            '┃    válida de sticker.ly\n' +
            '┃\n' +
            '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
        );
    }
}