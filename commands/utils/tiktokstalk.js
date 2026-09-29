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

function validarUsername(input) {
    const limpio = String(input || '').trim().replace(/^@/, '');
    if (!limpio) return { valido: false, error: 'Usuario vacío' };
    if (/\s/.test(limpio)) {
        return {
            valido: false,
            error:
                'Los usernames de TikTok *NO pueden tener espacios*.\n\n' +
                '💡 Ve al perfil en TikTok y copia el *@username* real.'
        };
    }
    if (!/^[a-zA-Z0-9._]+$/.test(limpio)) {
        return {
            valido: false,
            error: 'Solo se permiten: letras, números, `.` y `_`'
        };
    }
    return { valido: true, username: limpio };
}

export default {
    nombre: 'tiktokstalk',
    categoria: 'info',
    alias: ['ttstalk', 'tiktokinfo', 'ttuser', 'tiktoker'],
    descripcion: 'Muestra información completa de un perfil de TikTok',
    uso: '.ttstalk <username>',

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        const input = String(argumento || '').trim();

        if (!input) {
            return await responder.texto(
                '╭━━〔 🎵 𝐓𝐈𝐊𝐓𝐎𝐊 𝐒𝐓𝐀𝐋𝐊 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Escribe el username de TikTok\n' +
                '┃\n' +
                '┃ 💡 Ejemplos:\n' +
                '┃ ➪ .ttstalk twice_tiktok_official\n' +
                '┃ ➪ .ttstalk khaby.lame\n' +
                '┃\n' +
                '┃ ⚠️ Usa el *@username* real,\n' +
                '┃    NO el nombre visible\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        const validacion = validarUsername(input);
        if (!validacion.valido) {
            return await responder.texto(
                '╭━━〔 ⚠️ 𝐔𝐒𝐄𝐑𝐍𝐀𝐌𝐄 𝐈𝐍𝐕𝐀𝐋𝐈𝐃𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ ' + validacion.error + '\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        const username = validacion.username;

        try {
            await responder.texto('🔍 Obteniendo perfil de @' + username + '...');

            const res = await fetch(API_STALK + encodeURIComponent(username), {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json'
                },
                signal: AbortSignal.timeout(15000)
            });

            if (!res.ok) throw new Error('API respondió ' + res.status);

            const rawText = await res.text();
            let json;
            try {
                json = JSON.parse(rawText);
            } catch (e) {
                return await responder.texto('❌ La API no devolvió formato válido.');
            }

            const estado = pick(json, ['status', 'estado', 'success']);
            if (estado === false || estado === 'false') {
                const mensaje = pick(json, ['message', 'mensaje', 'error']) || 'Usuario no encontrado';
                return await responder.texto('❌ ' + mensaje);
            }

            const resultado = pick(json, ['result', 'resultado', 'data', 'datos']);

            if (!resultado) {
                return await responder.texto('❌ La API no devolvió datos para: *@' + username + '*');
            }

            const usuario = pick(resultado, ['users', 'usuarios', 'user', 'userInfo', 'profile', 'userData']);
            const stats = pick(resultado, ['stats', 'estadísticas', 'statistics', 'statsInfo']);

            if (!usuario) {
                return await responder.texto(
                    '❌ Usuario no encontrado: *@' + username + '*\n\n' +
                    '💡 Verifica que el username exista en TikTok.'
                );
            }

            const realUsername = pick(usuario, ['username', 'uniqueId']) || username;
            const apodo = pick(usuario, ['nickname', 'apodo', 'name']) || realUsername;
            const bio = pick(usuario, ['signature', 'firma', 'bio', 'description']) || 'Sin biografía';
            const verificado = Boolean(pick(usuario, ['verified', 'verificado']));
            const privado = Boolean(pick(usuario, ['privateAccount', 'private', 'isPrivate', 'private_account']));
            const perfilUrl = pick(usuario, ['url', 'profileUrl', 'link']) || ('https://www.tiktok.com/@' + realUsername);
            const avatar =
                pick(usuario, ['avatarLarger', 'avatarLarge', 'avatar']) ||
                pick(usuario, ['avatarMedium']) ||
                pick(usuario, ['avatarThumb', 'avatarPulgar']);

            const followers = formatNumber(pick(stats, ['followerCount', 'followers', 'seguidores']));
            const following = formatNumber(pick(stats, ['followingCount', 'following', 'siguiendo']));
            const likes = formatNumber(pick(stats, ['heartCount', 'heart', 'likes', 'hearts', 'corazones']));
            const videos = formatNumber(pick(stats, ['videoCount', 'videos', 'video']));
            const friends = formatNumber(pick(stats, ['friendCount', 'friends', 'amigos']));

            const bioLimpia = String(bio).replace(/[*_~`]/g, '').slice(0, 200);

            const caption =
                '╭━━〔 🎵 𝐓𝐈𝐊𝐓𝐎𝐊 𝐏𝐑𝐎𝐅𝐈𝐋𝐄 〕━━⬣\n' +
                '┃\n' +
                '┃ 👤 *' + apodo + '*\n' +
                '┃ 🔗 @' + realUsername + (verificado ? ' ✅' : '') + (privado ? ' 🔒' : '') + '\n' +
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
                (friends && friends !== '0' ? '┃ 👥 Amigos: *' + friends + '*\n' : '') +
                '┃\n' +
                '┃ 🔗 ' + perfilUrl + '\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            if (avatar && !privado) {
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