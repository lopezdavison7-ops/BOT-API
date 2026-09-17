// commands/tools/igstalk.js
// ============================================================
// BOT-API — INSTAGRAM STALK (Delirius API)
// ============================================================
// .igstalk <usuario> → ficha completa del perfil de Instagram
// ============================================================

const API = 'https://api.delirius.online/tools/igstalk?username=';

function fmtNum(n) {
    n = String(n || '0').replace(/,/g, '');
    const num = Number(n) || 0;
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return String(num);
}

export default {
    nombre: 'igstalk',
    categoria: 'tools',
    alias: ['instastalk', 'stalkig'],
    descripcion: 'Ver ficha completa de un perfil de Instagram',
    uso: '.igstalk <usuario>',
    ejecutar: async ({ msg, argumento, responder }) => {
        const usuario = String(argumento || '').trim().replace('@', '');

        if (!usuario) {
            return await responder.texto(
                '╭━━〔 📸 𝐈𝐍𝐒𝐓𝐀𝐆𝐑𝐀𝐌 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Falta el nombre de usuario\n' +
                '┃\n' +
                '┃ 📋 Uso:\n' +
                '┃ • .igstalk nayeonyny\n' +
                '┃ • .ig @cristiano\n' +
                '┃ • .instagram therock\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        try {
            const res = await fetch(API + encodeURIComponent(usuario));
            const text = await res.text();

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            let json;
            try { json = JSON.parse(text); } catch { throw new Error('Respuesta no es JSON'); }

            const status = json.estado ?? json.status ?? false;
            const d = json.datos ?? json.data ?? null;

            if (!status || !d) {
                return await responder.texto(
                    '╭━━〔 ❌ 𝐈𝐍𝐒𝐓𝐀𝐆𝐑𝐀𝐌 〕━━⬣\n' +
                    '┃\n' +
                    '┃ No encontré el perfil:\n' +
                    '┃ *@' + usuario + '*\n' +
                    '┃\n' +
                    '┃ 💡 Revisa que el nombre esté\n' +
                    '┃    bien escrito.\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            }

            // ---------- NORMALIZAR CLAVES ----------
            const username = d['nombre de usuario'] || d.username || usuario;
            const fullName = d.full_name || d['nombre completo'] || '—';
            const bio = d.biografía || d.biography || d.bio || '—';
            const category = d.categoría || d.category || '—';
            const posts = d.publicaciones || d.posts || '0';
            const seguidores = d.seguidores || d.followers || '0';
            const siguiendo = d.siguiendo || d.following || '0';
            const url = d.url || d.profileUrl || '';
            const urlExterna = d.url_externa || d.external_url || '—';
            const pronombres = d.pronombres || d.pronouns || '—';
            const pageName = d.page_name || d.nombre_pagina || '—';
            
            const privado = d.privado ?? d.private ?? false;
            const verificado = d.verificado ?? d.verified ?? false;
            const metaVerified = d.meta_verified ?? d.metaVerified ?? false;
            const negocios = d.negocios ?? d.business ?? false;
            const creator = d.creator_account ?? d.creatorAccount ?? false;
            const highlights = d.has_highlights ?? d.hasHighlights ?? false;
            const musica = d.tiene_música ?? d.has_music ?? false;

            // ---------- CONSTRUIR FICHA ----------
            let ficha =
                '╭━━〔 📸 𝐈𝐍𝐒𝐓𝐀𝐆𝐑𝐀𝐌 〕━━⬣\n' +
                '┃\n' +
                '┃ 👤 *' + (fullName !== '—' ? fullName : username) + '*\n' +
                '┃ 🆔 @' + username + '\n';

            if (bio && bio !== '-') {
                ficha += '┃ 📝 ' + bio.substring(0, 100) + (bio.length > 100 ? '...' : '') + '\n';
            }

            if (pronombres && pronombres !== '-') {
                ficha += '┃ 🏷️ ' + pronombres + '\n';
            }

            if (category && category !== '-') {
                ficha += '┃ 📂 ' + category + '\n';
            }

            ficha +=
                '┃\n' +
                '┃ 📸 Publicaciones: *' + fmtNum(posts) + '*\n' +
                '┃ 👥 Seguidores: *' + fmtNum(seguidores) + '*\n' +
                '┃ ➡️ Siguiendo: *' + fmtNum(siguiendo) + '*\n' +
                '┃\n' +
                '┃ 🔒 Privada: ' + (privado ? 'Sí' : 'No') + '\n' +
                '┃ ✅ Verificada: ' + (verificado ? 'Sí' : 'No') + '\n';

            if (metaVerified) {
                ficha += '┃ 🔵 Meta Verified: Sí\n';
            }

            if (negocios) {
                ficha += '┃ 💼 Cuenta de negocios\n';
            }

            if (creator) {
                ficha += '┃ 🎨 Cuenta de creador\n';
            }

            if (highlights) {
                ficha += '┃ ⭐ Tiene historias destacadas\n';
            }

            if (musica) {
                ficha += '┃ 🎵 Tiene música\n';
            }

            if (urlExterna && urlExterna !== '-') {
                ficha += '┃\n┃ 🔗 ' + urlExterna + '\n';
            }

            if (url && url !== '-') {
                ficha += '┃\n┃ 🌐 ' + url + '\n';
            }

            ficha += '┃\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            // ---------- ENVIAR (sin foto por ahora, la API no la devuelve) ----------
            await responder.texto(ficha);

        } catch (error) {
            console.error('[IGSTALK] Error:', error?.message || error);
            await responder.texto(
                '╭━━〔 ❌ 𝐈𝐍𝐒𝐓𝐀𝐆𝐑𝐀𝐌 〕━━⬣\n' +
                '┃\n' +
                '┃ Error consultando Instagram.\n' +
                '┃\n' +
                `┃ ⚠️ ${error?.message || 'Error desconocido'}\n` +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }
    }
};