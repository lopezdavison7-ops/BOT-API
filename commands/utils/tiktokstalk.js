import fetch from 'node-fetch';

const API_STALK = 'https://api.delirius.online/tools/tiktokstalk?q=';

function pick(obj, keys) {
    if (!obj) return undefined;
    for (const k of keys) {
        if (obj[k] !== undefined && obj[k] !== null) return obj[k];
    }
    return undefined;
}

function formatNumber(num) {
    if (!num && num !== 0) return '0';
    const n = Number(num);
    if (n >= 1e9) return (n / 1e9).toFixed(1).replace('.0', '') + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace('.0', '') + 'K';
    return String(n);
}

export default {
    nombre: 'tiktokstalk',
    categoria: 'utils',
    alias: ['ttstalk', 'tiktokinfo', 'ttuser', 'tiktoker'],
    descripcion: 'Muestra información completa de un perfil de TikTok',
    uso: '.ttstalk <usuario>',

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        const q = String(argumento || '').trim().replace(/^@/, '');

        if (!q) {
            return await responder.texto(
                '╭━━〔 🎵 𝐓𝐈𝐊𝐓𝐎𝐊 𝐒𝐓𝐀𝐋𝐊 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Escribe el usuario de TikTok\n' +
                '┃\n' +
                '┃ 💡 Ejemplos:\n' +
                '┃ ➪ .ttstalk twice_tiktok_official\n' +
                '┃ ➪ .ttstalk @khaby00\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        try {
            await responder.texto('🔍 Obteniendo perfil de TikTok...');

            const res = await fetch(API_STALK + encodeURIComponent(q), {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json'
                },
                signal: AbortSignal.timeout(15000)
            });

            if (!res.ok) throw new Error('API respondió ' + res.status);

            const json = await res.json();

            const resultado = pick(json, ['resultado', 'result', 'data', 'datos']);

            if (!resultado) {
                return await responder.texto('❌ Usuario no encontrado: *' + q + '*');
            }

            const usuario = pick(resultado, ['usuarios', 'user', 'userInfo', 'profile']);
            const stats = pick(resultado, ['estadísticas', 'stats', 'statistics']);

            if (!usuario) {
                return await responder.texto('❌ No se pudo obtener info del usuario.');
            }

            const username = pick(usuario, ['username', 'uniqueId']) || q;
            const apodo = pick(usuario, ['apodo', 'nickname', 'name']) || username;
            const bio = pick(usuario, ['firma', 'signature', 'bio', 'description']) || 'Sin biografía';
            const verificado = Boolean(pick(usuario, ['verificado', 'verified']));
            const privado = Boolean(pick(usuario, ['privateAccount', 'private', 'isPrivate']));
            const perfilUrl = pick(usuario, ['url', 'profileUrl', 'link']);
            const avatar =
                pick(usuario, ['avatarLarger', 'avatarLarge', 'avatar']) ||
                pick(usuario, ['avatarMedium']) ||
                pick(usuario, ['avatarPulgar', 'avatarThumb']);

            const followers = formatNumber(pick(stats, ['followerCount', 'followers', 'seguidores']));
            const following = formatNumber(pick(stats, ['followingCount', 'following', 'siguiendo']));
            const likes = formatNumber(pick(stats, ['heartCount', 'likes', 'hearts', 'corazones']));
            const videos = formatNumber(pick(stats, ['videoCount', 'videos']));

            const bioLimpia = String(bio).replace(/[*_~`]/g, '').slice(0, 150);

            const caption =
                '╭━━〔 🎵 𝐓𝐈𝐊𝐓𝐎𝐊 𝐏𝐑𝐎𝐅𝐈𝐋𝐄 〕━━⬣\n' +
                '┃\n' +
                '┃ 👤 *' + apodo + '*\n' +
                '┃ 🔗 @' + username + (verificado ? ' ✅' : '') + (privado ? ' 🔒' : '') + '\n' +
                '┃\n' +
                '┃ 📝 *Bio:*\n' +
                '┃ ' + bioLimpia + '\n' +
                '┃\n' +
                '┣━━〔 📊 𝐄𝐒𝐓𝐀𝐃Í𝐒𝐓𝐈𝐂𝐀𝐒 〕━━⬣\n' +
                '┃\n' +
                '┃ 👥 Seguidores: *' + followers + '*\n' +
                '┃ 👤 Siguiendo: *' + following + '*\n' +
                '┃ ❤️ Likes: *' + likes + '*\n' +
                '┃ 🎬 Videos: *' + videos + '*\n' +
                '┃\n' +
                (perfilUrl ? '┃ 🔗 ' + perfilUrl + '\n┃\n' : '') +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            if (avatar) {
                try {
                    await sock.sendMessage(jid, {
                        image: { url: avatar },
                        caption
                    }, { quoted: msg });
                    return;
                } catch (e) {
                    console.error('[TT-STALK] Error enviando foto:', e.message);
                }
            }

            await responder.texto(caption);

        } catch (error) {
            console.error('[TT-STALK] Error:', error.message);
            await responder.texto('❌ Error al obtener el perfil: ' + error.message);
        }
    }
};