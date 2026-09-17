// commands/tools/roblox.js
// ============================================================
// BOT-API — ROBLOX STALK (Delirius API)
// Manda avatar + ficha completa
// ============================================================

const API = 'https://api.delirius.online/tools/robloxstalk?username=';
// Thumbnail oficial de Roblox (no bloquea como tr.rbxcdn.com)
const API_THUMBNAIL = 'https://thumbnails.roblox.com/v1/users/avatar?userIds={ID}&size=420x420&format=Png&isCircular=false';

function fmtNum(n) {
    n = Number(n) || 0;
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return String(n);
}

// ---------- SUBIR A TELEGRAPH (respaldo si la descarga falla) ----------
async function uploadToTelegraph(buffer) {
    const formData = new FormData();
    formData.append('file', new Blob([buffer], { type: 'image/png' }), 'avatar.png');

    const res = await fetch('https://telegra.ph/upload', {
        method: 'POST',
        body: formData
    });

    if (!res.ok) throw new Error('Telegraph HTTP ' + res.status);

    const text = await res.text();
    let result;
    try { result = JSON.parse(text); } catch { throw new Error('Telegraph no es JSON'); }

    if (Array.isArray(result) && result[0]?.src) {
        return 'https://telegra.ph' + result[0].src;
    }
    throw new Error('Telegraph respuesta inválida');
}

// ---------- DESCARGAR AVATAR (varios intentos) ----------
async function obtenerAvatar(userId, urlOriginal) {
    // Intento 1: Thumbnail oficial de Roblox (el más confiable)
    try {
        const thumbUrl = API_THUMBNAIL.replace('{ID}', userId);
        const res = await fetch(thumbUrl);
        if (res.ok) {
            const data = await res.json();
            if (data?.data?.[0]?.imageUrl) {
                const imgRes = await fetch(data.data[0].imageUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'image/png,image/*'
                    }
                });
                if (imgRes.ok) {
                    const buffer = Buffer.from(await imgRes.arrayBuffer());
                    if (buffer.length > 1000) return { buffer, metodo: 'thumbnail-oficial' };
                }
            }
        }
    } catch (e) {
        console.error('[ROBLOX] Thumbnail oficial falló:', e.message);
    }

    // Intento 2: URL original de la API (tr.rbxcdn.com)
    if (urlOriginal) {
        try {
            const res = await fetch(urlOriginal, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
                    'Accept': 'image/png,image/*,*/*',
                    'Referer': 'https://www.roblox.com/'
                }
            });
            if (res.ok) {
                const buffer = Buffer.from(await res.arrayBuffer());
                if (buffer.length > 1000) return { buffer, metodo: 'url-original' };
            }
        } catch (e) {
            console.error('[ROBLOX] URL original falló:', e.message);
        }
    }

    return null;
}

export default {
    nombre: 'roblox',
    categoria: 'tools',
    alias: ['rbx', 'robloxstalk', 'stalkroblox', 'robloxuser'],
    descripcion: 'Ver ficha completa de un usuario de Roblox con avatar',
    uso: '.roblox <usuario>',
    ejecutar: async ({ sock, msg, argumento, responder }) => {
        const chatJid = msg.key.remoteJid;
        const s = sock || global.conns?.[0];
        const usuario = String(argumento || '').trim();

        if (!usuario) {
            return await responder.texto(
                '╭━━〔 🎮 𝐑𝐎𝐁𝐋𝐎𝐗 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Falta el nombre de usuario\n' +
                '┃\n' +
                '┃ 📋 Uso:\n' +
                '┃ • .roblox nayeonyny\n' +
                '┃ • .rbx builderman\n' +
                '┃ • .roblox Scar\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        try {
            // ---------- CONSULTAR API ----------
            const res = await fetch(API + encodeURIComponent(usuario));
            const text = await res.text();

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            let json;
            try { json = JSON.parse(text); } catch { throw new Error('Respuesta no es JSON'); }

            const status = json.estado ?? json.status ?? false;
            const d = json.datos ?? json.data ?? null;

            if (!status || !d) {
                return await responder.texto(
                    '╭━━〔 ❌ 𝐑𝐎𝐁𝐋𝐎𝐗 〕━━⬣\n' +
                    '┃\n' +
                    '┃ No encontré al usuario:\n' +
                    '┃ *' + usuario + '*\n' +
                    '┃\n' +
                    '┃ 💡 Revisa que el nombre esté\n' +
                    '┃    bien escrito.\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            }

            // ---------- NORMALIZAR CLAVES ----------
            const extra = d.extraInfo || d.extra || {};
            const nombre = d.nombre || d.name || d.displayName || d.username || '—';
            const descripcion = d.descripcion || d.description || d.bio || '';
            const seguidores = d.seguidores ?? d.followers ?? 0;
            const siguiendo = d.seguidos ?? d.following ?? 0;
            const amigos = d.amigos ?? d.friends ?? 0;
            const creado = d.creado || d.created || '—';
            const presencia = d.presencia || d.presence || d.lastSeen || '—';
            const url = d.url || d.profileUrl || '';
            const avatarOriginal = d.imagen_de_perfil || d.profileImage || d.avatar || '';
            const userId = d.id || null;
            const pais = extra.country || extra.pais || '—';
            const edad = extra.edad || extra.age || '—';
            const estadoCuenta = extra.accountStatus || extra.estado || '—';
            const baneado = d.isBanned ?? d.banned ?? false;
            const verificado = d.hasVerified ?? d.verified ?? false;
            const juegos = d.juegosCreados || d.games || d.createdGames || [];

            // ---------- CONSTRUIR FICHA ----------
            let ficha =
                '╭━━〔 🎮 𝐑𝐎𝐁𝐋𝐎𝐗 〕━━⬣\n' +
                '┃\n' +
                '┃ 👤 *' + nombre + '*\n' +
                '┃ 🆔 ID: ' + (userId || '—') + '\n' +
                (descripcion ? '┃ 📝 ' + descripcion + '\n' : '') +
                '┃\n' +
                '┃ 👥 Seguidores: *' + fmtNum(seguidores) + '*\n' +
                '┃ ➡️ Siguiendo: *' + fmtNum(siguiendo) + '*\n' +
                '┃ 🤝 Amigos: *' + fmtNum(amigos) + '*\n' +
                '┃\n' +
                '┃ 📅 Cuenta creada: ' + creado + '\n' +
                '┃ 🕐 Última conexión: ' + presencia + '\n' +
                '┃ 🌍 País: ' + pais + '\n' +
                '┃ 🎂 Edad: ' + edad + '\n' +
                '┃ 📡 Estado: ' + estadoCuenta + '\n' +
                '┃ ✅ Verificado: ' + (verificado ? 'Sí' : 'No') + '\n' +
                '┃ 🚫 Baneado: ' + (baneado ? 'SÍ ⚠️' : 'No') + '\n';

            if (juegos.length) {
                ficha += '┃\n┃ 🎮 Juegos creados: ' + juegos.length + '\n';
                juegos.slice(0, 5).forEach(j => {
                    ficha += '┃    • ' + (j.nombre || j.name || 'Sin nombre') +
                             ' (' + fmtNum(j.jugando ?? j.playing ?? 0) + ' jugando)\n';
                });
            }

            if (url) {
                ficha += '┃\n┃ 🔗 ' + url + '\n';
            }

            ficha += '┃\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            // ---------- OBTENER AVATAR (con múltiples intentos) ----------
            let enviado = false;

            if (userId) {
                const avatarResult = await obtenerAvatar(userId, avatarOriginal);

                if (avatarResult?.buffer) {
                    try {
                        // Intento 1: enviar buffer directo
                        await s.sendMessage(chatJid, {
                            image: avatarResult.buffer,
                            caption: ficha
                        }, { quoted: msg });
                        enviado = true;
                    } catch (e) {
                        console.error('[ROBLOX] Envío directo falló:', e.message);

                        // Intento 2: subir a Telegraph y mandar URL
                        try {
                            const telegraphUrl = await uploadToTelegraph(avatarResult.buffer);
                            await responder.imagen({ url: telegraphUrl }, ficha);
                            enviado = true;
                        } catch (e2) {
                            console.error('[ROBLOX] Telegraph también falló:', e2.message);
                        }
                    }
                }
            }

            // ---------- FALLBACK: solo texto ----------
            if (!enviado) {
                await responder.texto(
                    '⚠️ *No pude cargar el avatar*\n' +
                    'Método usado: ' + (avatarResult?.metodo || 'ninguno') + '\n\n' +
                    ficha
                );
            }

        } catch (error) {
            console.error('[ROBLOX] Error:', error?.message || error);
            await responder.texto(
                '╭━━〔 ❌ 𝐑𝐎𝐁𝐋𝐎𝐗 〕━━⬣\n' +
                '┃\n' +
                '┃ Error consultando Roblox.\n' +
                '┃\n' +
                `┃ ⚠️ ${error?.message || 'Error desconocido'}\n` +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }
    }
};