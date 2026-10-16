import fetch from 'node-fetch';
import https from 'node:https';

const AGENTE = new https.Agent({ keepAlive: true, maxSockets: 10 });
const HEADERS = { 
    'Accept': 'application/json', 
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};

const MAX_STICKERS = 15;
const DELAY_MS = 250;
const API_SEARCH = 'https://api.delirius.online/search/stickerly';
const API_DOWNLOAD = 'https://api.delirius.online/download/stickerly';

if (!global.spackSessions) global.spackSessions = new Map();
const SESSION_TTL = 5 * 60 * 1000;

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
    return String(s).replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim().slice(0, 40) || 'BOT-API Pack';
}

function apiOk(data) {
    return data.estado === true || data.estado === 'verdadero' || data.status === true;
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

async function descargarBuffer(url, timeout = 20000) {
    const res = await fetch(url, {
        agent: AGENTE,
        headers: { ...HEADERS, 'Accept': '*/*' },
        signal: AbortSignal.timeout(timeout)
    });
    if (!res.ok) throw new Error('Descarga HTTP ' + res.status);
    return Buffer.from(await res.arrayBuffer());
}

export default {
    nombre: 'spack',
    categoria: 'Stickers',
    alias: ['stickerpack', 'stickers', 'packsticker', 'pack', 'stickerly'],
    descripcion: 'Busca y descarga packs de stickers de Stickerly',
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
            '╭━━〔 🎨 𝐄𝐍𝐕𝐈𝐀𝐍𝐃𝐎 𝐏𝐀𝐂𝐊 〕━━⬣\n' +
            '┃\n' +
            '┃ 📦 *' + pack.nombre + '*\n' +
            '┃ 👤 ' + pack.autor + '\n' +
            '┃ 📸 Enviando ' + stickers.length + ' stickers\n' +
            '┃ ' + (pack.animado ? '🎬 Animado' : '🖼️ Estático') + '\n' +
            '┃\n' +
            '┃ ⏳ Recibirás el pack ahora...\n' +
            '┃\n' +
            '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
        );

        let enviados = 0;
        for (const stickerUrl of stickers) {
            try {
                const buffer = await descargarBuffer(stickerUrl, 20000);
                if (!buffer.length) continue;

                await sock.sendMessage(jid, {
                    sticker: buffer,
                    mimetype: 'image/webp',
                    isAnimated: pack.animado || false,
                    packname: packName,
                    author: packAuthor
                });

                enviados++;
                await new Promise(r => setTimeout(r, DELAY_MS));
            } catch (e) {
                console.log(`[SPACK] Sticker falló: ${e.message}`);
            }
        }

        if (enviados > 0) {
            await responder.texto(
                '╭━━〔 ✅ 𝐏𝐀𝐂𝐊 𝐄𝐍𝐕𝐈𝐀𝐃𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ 📤 ' + enviados + '/' + stickers.length + ' stickers\n' +
                '┃ 📦 Pack › *' + packName + '*\n' +
                '┃\n' +
                '┃ 💡 Mantén presionado un\n' +
                '┃    sticker → "Añadir a mis\n' +
                '┃    stickers" para guardarlo\n' +
                '┃\n' +
                (pack.total > MAX_STICKERS 
                    ? '┃ ⚠️ Pack completo: ' + pack.total + '\n┃\n'
                    : '') +
                '┃ 📥 Instala el pack completo:\n' +
                '┃ ' + (pack.compartir || pack.url) + '\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );

            await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
            console.log(`[SPACK] ✅ Pack nativo: ${pack.nombre} (${enviados}/${stickers.length})`);
        } else {
            throw new Error('No se pudo enviar ningún sticker');
        }

    } catch (error) {
        console.error('[SPACK] Error:', error?.message || error);
        await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
        await responder.texto(
            '╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n' +
            '┃\n' +
            '┃ ⚠️ ' + (error?.message || 'No se pudo obtener el pack') + '\n' +
            '┃\n' +
            '┃ 💡 Verifica que la URL sea\n' +
            '┃    válida de sticker.ly\n' +
            '┃\n' +
            '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
        );
    }
}