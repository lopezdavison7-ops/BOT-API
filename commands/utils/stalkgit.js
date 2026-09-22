// commands/utils/github.js — 🐙 Stalker de perfiles GitHub
// ============================================================
// API: api.stellarwa.xyz/stalking/github
// Uso: .github <usuario>
// ============================================================
import fetch from 'node-fetch';

const API = 'https://api.stellarwa.xyz/stalking/github';
const KEY = 'api-UqWzP';

function bold(t) {
    return String(t).replace(/[A-Za-z]/g, c =>
        String.fromCodePoint((c <= 'Z' ? 0x1D400 - 65 : 0x1D41A - 97) + c.charCodeAt(0))
    );
}

function fmtFecha(iso) {
    try {
        const d = new Date(iso);
        return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) { return iso || 'N/D'; }
}

const nf = n => Number(n || 0).toLocaleString('en-US');

export default {
    nombre: 'github',
    categoria: 'utils',
    alias: ['gh', 'ghstalk', 'gitstalk', 'perfilgh', 'git'],
    descripcion: 'Stalkea un perfil de GitHub: stats, lenguajes y repos top',
    uso: '.github <usuario>',
    ejecutar: async ({ sock, msg, argumento, responder }) => {
        // Limpia el input: acepta @user, links de github o nombre pelado
        const user = (argumento || '')
            .trim()
            .replace(/^@/, '')
            .replace(/https?:\/\/(www\.)?github\.com\//i, '')
            .replace(/\/+.*$/, '');

        if (!user) {
            return await responder.texto(
                '╭━━〔 🐙 𝐆𝐈𝐓𝐇𝐔𝐁 𝐒𝐓𝐀𝐋𝐊 〕━━⬣\n' +
                '┃\n' +
                '┃ 📋 Uso: *.github <usuario>*\n' +
                '┃\n' +
                '┃ ➪ .github LuferOS\n' +
                '┃ ➪ .github lopezdavison7-ops\n' +
                '┃ ➪ .github https://github.com/torvalds\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        await responder.texto('🐙 Stalkeando a *' + user + '* en GitHub...');

        try {
            // Intenta con ?username= y si falla con ?user=
            let json = null;
            for (const param of ['username', 'user']) {
                try {
                    const res = await fetch(API + '?key=' + KEY + '&' + param + '=' + encodeURIComponent(user), { timeout: 20000 });
                    if (!res.ok) continue;
                    const j = await res.json();
                    if (j && j.status === true && j.result) { json = j; break; }
                } catch (e) {}
            }

            if (!json) {
                return await responder.texto(
                    '❌ No encontré el perfil de GitHub: *' + user + '*\n' +
                    '💡 Revisa que el usuario exista.'
                );
            }

            const r = json.result;
            const s = r.stats || {};
            const acc = r.account || {};

            // ---------- LENGUAJES TOP ----------
            let langs = '';
            const topLangs = (r.top_languages || []).slice(0, 5);
            if (topLangs.length) {
                topLangs.forEach((l, i) => {
                    langs += '┃ ' + (i + 1) + '. *' + l.language + '* (' + l.repos + ' repos)\n';
                });
            } else {
                langs = '┃ _(sin lenguajes detectados)_\n';
            }

            // ---------- REPOS TOP ----------
            let repos = '';
            const topRepos = (r.top_repos || []).slice(0, 5);
            if (topRepos.length) {
                topRepos.forEach(rp => {
                    repos += '┃ ⭐ ' + nf(rp.stars) + ' · *' + rp.name + '*\n';
                    repos += '┃    ' + (rp.language || 'N/D') + ' · 🍴 ' + nf(rp.forks) + '\n';
                });
            } else {
                repos = '┃ _(sin repos públicos)_\n';
            }

            const caption =
                '╭━━〔 🐙 𝐆𝐈𝐓𝐇𝐔𝐁 𝐒𝐓𝐀𝐋𝐊 〕━━⬣\n' +
                '┃\n' +
                '┃ 👤 Usuario: *' + (r.username || user) + '*\n' +
                (r.name ? '┃ 📛 Nombre: ' + r.name + '\n' : '') +
                (r.bio && r.bio !== 'No disponible' ? '┃ 📝 Bio: ' + r.bio + '\n' : '') +
                (r.company && r.company !== 'No disponible' ? '┃ 🏢 Compañía: ' + r.company + '\n' : '') +
                (r.location && r.location !== 'No disponible' ? '┃ 📍 Ubicación: ' + r.location + '\n' : '') +
                (r.twitter && r.twitter !== 'No disponible' ? '┃ 🐦 Twitter: ' + r.twitter + '\n' : '') +
                '┃ 🔗 ' + (r.profile_url || 'https://github.com/' + user) + '\n' +
                '┃\n' +
                '┣━━〔 📊 ' + bold('ESTADISTICAS') + ' 〕━━⬣\n' +
                '┃\n' +
                '┃ 👥 Seguidores: *' + nf(s.followers) + '*\n' +
                '┃  Siguiendo: *' + nf(s.following) + '*\n' +
                '┃ 📦 Repos públicos: *' + nf(s.public_repos) + '*\n' +
                '┃ ⭐ Stars totales: *' + nf(s.total_stars) + '*\n' +
                '┃ 🍴 Forks totales: *' + nf(s.total_forks) + '*\n' +
                '┃ 📅 Cuenta creada: ' + fmtFecha(acc.created_at) + '\n' +
                '┃ ️ Tipo: ' + (acc.type || 'User') + '\n' +
                '┃\n' +
                '┣━━〔  ' + bold('LENGUAJES TOP') + ' 〕━━⬣\n' +
                '┃\n' +
                langs +
                '┃\n' +
                '┣━━〔 📦 ' + bold('REPOS TOP') + ' 〕━━⬣\n' +
                '┃\n' +
                repos +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            // ---------- ENVIAR CON AVATAR ----------
            try {
                await sock.sendMessage(msg.key.remoteJid, {
                    image: { url: r.avatar },
                    caption: caption
                }, { quoted: msg });
            } catch (e) {
                await responder.texto(caption);
            }

        } catch (error) {
            console.error('[GITHUB] Error:', error);
            await responder.texto('❌ Error al stalkear GitHub: ' + (error.message || error));
        }
    }
};