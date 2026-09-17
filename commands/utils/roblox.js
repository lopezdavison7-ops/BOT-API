// commands/tools/roblox.js
// ============================================================
// BOT-API — ROBLOX STALK (Delirius API)
// Manda avatar + ficha completa
// ============================================================

const API = 'https://api.delirius.online/tools/robloxstalk?username=';

// ---------- NÚMEROS BONITOS (172.5K, 1.2M) ----------
function fmtNum(n) {
    n = Number(n) || 0;
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return String(n);
}

// ---------- DESCARGAR AVATAR COMO BUFFER ----------
async function descargarAvatar(url) {
    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
                'Accept': 'image/png,image/*,*/*',
                'Referer': 'https://www.roblox.com/'
            }
        });
        if (res.ok) {
            const buffer = Buffer.from(await res.arrayBuffer());
            if (buffer.length > 0) return buffer;
        }
    } catch (e) {
        console.error('[ROBLOX] Error descargando avatar:', e.message);
    }
    return null;
}

export default {
    nombre: 'roblox',
    categoria: 'tools',
    alias: ['rbx', 'robloxstalk', 'stalkroblox', 'robloxuser'],
    descripcion: 'Ver ficha completa de un usuario de Roblox con avatar',
    uso: '.roblox <usuario>',
    ejecutar: async ({ msg, argumento, responder }) => {
        const usuario = String(argumento || '').trim();

        if (!usuario) {
            return await responder.texto(
                '╭━━〔 🎮 𝐎𝐋𝐗 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Falta el nombre de usuario\n' +
                '┃\n' +
                '┃ 📋 Uso:\n' +
                '┃ • .roblox nayeonyny\n' +
                '┃ • .rbx builderman\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐓-𝐏 ⚡ 〕━━⬣'
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
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐏 ⚡ 〕━━⬣'
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
            const avatar = d.imagen_de_perfil || d.profileImage || d.avatar || '';
            const pais = extra.country || extra.pais || '—';
            const edad = extra.edad || extra.age || '—';
            const estadoCuenta = extra.accountStatus || extra.estado || '—';
            const baneado = d.isBanned ?? d.banned ?? false;
            const verificado = d.hasVerified ?? d.verified ?? false;
            const juegos = d.juegosCreados || d.games || d.createdGames || [];

            // ---------- CONSTRUIR FICHA ----------
            let ficha =
                '╭━━〔 🎮 𝐑𝐎𝐁𝐎 〕━━\n' +
                '┃\n' +
                '┃ 👤 *' + nombre + '*\n' +
                '┃ 🆔 ID: ' + (d.id || '—') + '\n' +
                (descripcion ? '┃  ' + descripcion + '\n' : '') +
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

            ficha += '┃\n╰━━〔 ⚡ 𝐁𝐓-𝐏 ⚡ 〕━━⬣';

            // ---------- ENVIAR AVATAR + FICHA ----------
            if (avatar) {
                // Intento 1: descargar como buffer (con headers anti-bloqueo)
                const buffer = await descargarAvatar(avatar);

                if (buffer) {
                    await responder.imagen(buffer, ficha);
                    return;
                }

                // Intento 2: mandar URL directa
                try {
                    await responder.imagen({ url: avatar }, ficha);
                    return;
                } catch (e) {
                    console.error('[ROBLOX] Error enviando avatar por URL:', e.message);
                }
            }

            // Último recurso: solo texto
            await responder.texto(ficha);

        } catch (error) {
            console.error('[ROBLOX] Error:', error?.message || error);
            await responder.texto(
                '╭━━〔 ❌ 𝐑𝐎𝐋𝐗 〕━━\n' +
                '┃\n' +
                '┃ Error consultando Roblox.\n' +
                '┃\n' +
                `┃ ⚠️ ${error?.message || 'Error desconocido'}\n` +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐓-𝐏 ⚡ 〕━━⬣'
            );
        }
    }
};