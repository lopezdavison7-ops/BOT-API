// commands/tools/wachannel.js
// ============================================================
// BOT-API — WHATSAPP CHANNEL STALK (Delirius API)
// ============================================================
// .wachannel <url o ID del canal> → ficha del canal de WhatsApp
// ============================================================

const API = 'https://api.delirius.online/tools/whatsappchannelstalk?channel=';

function fmtNum(n) {
    if (!n) return '0';
    const str = String(n);
    // Extraer número de "Noticias... Channel • 615K"
    const match = str.match(/([\d,.]+)\s*(K|M|B)?/i);
    if (match) {
        const num = parseFloat(match[1].replace(/,/g, ''));
        const suf = (match[2] || '').toUpperCase();
        if (suf === 'K') return (num).toFixed(num < 10 ? 1 : 0) + 'K';
        if (suf === 'M') return (num).toFixed(num < 10 ? 1 : 0) + 'M';
        if (suf === 'B') return (num).toFixed(1) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
        return String(num);
    }
    return str;
}

// Extraer solo el número de seguidores del texto
function extraerSeguidores(texto) {
    if (!texto) return '0';
    // Buscar patrón "• 615K" o "• 1.2M" al final
    const match = texto.match(/•\s*([\d,.]+[KMB]?)/i);
    if (match) return match[1];
    // Si no, devolver el texto completo formateado
    return fmtNum(texto);
}

// Extraer descripción real (quitar el texto genérico de WhatsApp)
function limpiarDescripcion(desc) {
    if (!desc) return '—';
    // Quitar textos genéricos de WhatsApp
    const genericos = ['What we do', 'Who we are', 'Use WhatsApp', 'Need help?'];
    let limpia = desc;
    genericos.forEach(g => {
        limpia = limpia.replace(new RegExp(g, 'gi'), '').trim();
    });
    return limpia || '—';
}

// ---------- DESCARGAR FOTO DE PERFIL DEL CANAL ----------
async function descargarProfile(url) {
    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
                'Accept': 'image/png,image/*,*/*',
                'Referer': 'https://www.whatsapp.com/'
            }
        });
        if (res.ok) {
            const buffer = Buffer.from(await res.arrayBuffer());
            if (buffer.length > 1000) return buffer;
        }
    } catch (e) {
        console.error('[WACHANNEL] Error descargando profile:', e.message);
    }
    return null;
}

// ---------- SUBIR A TELEGRAPH (respaldo) ----------
async function uploadToTelegraph(buffer) {
    const formData = new FormData();
    formData.append('file', new Blob([buffer], { type: 'image/jpeg' }), 'profile.jpg');

    const res = await fetch('https://telegra.ph/upload', {
        method: 'POST',
        body: formData
    });

    if (!res.ok) throw new Error('HTTP ' + res.status);

    const text = await res.text();
    let result;
    try { result = JSON.parse(text); } catch { throw new Error('No es JSON'); }

    if (Array.isArray(result) && result[0]?.src) {
        return 'https://telegra.ph' + result[0].src;
    }
    throw new Error('Respuesta inválida');
}

export default {
    nombre: 'wachannel',
    categoria: 'tools',
    alias: ['wachan', 'canalwa', 'channelstalk', 'wachannelstalk'],
    descripcion: 'Ver información de un canal de WhatsApp',
    uso: '.wachannel <url del canal> | .wachannel <ID del canal>',
    ejecutar: async ({ sock, msg, argumento, responder }) => {
        const chatJid = msg.key.remoteJid;
        const s = sock || global.conns?.[0];
        let input = String(argumento || '').trim();

        if (!input) {
            return await responder.texto(
                '╭━━〔 📢 𝐖𝐀 𝐂𝐇𝐀𝐍𝐍𝐄𝐋 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Falta la URL o ID del canal\n' +
                '┃\n' +
                '┃ 📋 Uso:\n' +
                '┃ • .wachannel https://whatsapp.com/channel/xxx\n' +
                '┃ • .wachan 0029VaOlQAT9sBIIBBUmZu3Q\n' +
                '┃\n' +
                '┃ 💡 Puedes pegar la URL completa\n' +
                '┃    o solo el ID del canal\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        // Si es solo ID (sin http), armar URL
        if (!input.startsWith('http')) {
            input = 'https://www.whatsapp.com/channel/' + input;
        }

        try {
            const res = await fetch(API + encodeURIComponent(input));
            const text = await res.text();

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            let json;
            try { json = JSON.parse(text); } catch { throw new Error('Respuesta no es JSON'); }

            const status = json.status ?? json.estado ?? false;
            const d = json.data ?? json.datos ?? null;

            if (!status || !d) {
                return await responder.texto(
                    '╭━━〔 ❌ 𝐖𝐀 𝐂𝐇𝐀𝐍𝐍𝐄𝐋 〕━━⬣\n' +
                    '┃\n' +
                    '┃ No encontré el canal.\n' +
                    '┃\n' +
                    '┃ 💡 Verifica que la URL o ID\n' +
                    '┃    del canal sea correcto.\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            }

            // Detectar si WhatsApp bloqueó (título genérico)
            if (d.title && d.title.toLowerCase().includes("don't have whatsapp")) {
                // El título real está en los followers (formato: "Descripción. Channel • 615K")
                const followersRaw = d.followers || '';
                const match = followersRaw.match(/^(.+?)\s*Channel\s*•/i);
                const tituloReal = match ? match[1].trim() : d.title;
                const seguidores = extraerSeguidores(followersRaw);
                const descripcion = limpiarDescripcion(d.description);
                const verificado = d.verified ?? false;
                const url = d.url || input;
                const profile = d.profile || '';

                // Construir ficha
                let ficha =
                    '╭━━〔 📢 𝐖𝐀 𝐂𝐇𝐀𝐍𝐍𝐄𝐋 〕━━⬣\n' +
                    '┃\n' +
                    '┃ 📢 *' + tituloReal + '*\n' +
                    '┃\n';

                if (descripcion && descripcion !== '—') {
                    ficha += '┃ 📝 ' + descripcion.substring(0, 200) + (descripcion.length > 200 ? '...' : '') + '\n';
                    ficha += '┃\n';
                }

                ficha +=
                    '┃ 👥 Seguidores: *' + seguidores + '*\n' +
                    '┃ ✅ Verificado: ' + (verificado ? 'Sí' : 'No') + '\n' +
                    '┃\n' +
                    '┃ 🔗 ' + url + '\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

                // Intentar mandar con foto
                if (profile) {
                    const buffer = await descargarProfile(profile);
                    if (buffer) {
                        try {
                            await s.sendMessage(chatJid, {
                                image: buffer,
                                caption: ficha
                            }, { quoted: msg });
                            return;
                        } catch (e) {
                            // Intentar subir a Telegraph
                            try {
                                const telegraphUrl = await uploadToTelegraph(buffer);
                                await responder.imagen({ url: telegraphUrl }, ficha);
                                return;
                            } catch (e2) {
                                console.error('[WACHANNEL] Telegraph falló:', e2.message);
                            }
                        }
                    }

                    // Intento 2: URL directa
                    try {
                        await responder.imagen({ url: profile }, ficha);
                        return;
                    } catch (e) {
                        console.error('[WACHANNEL] URL directa falló:', e.message);
                    }
                }

                // Sin foto
                await responder.texto(ficha);
                return;
            }

            // ---------- CASO NORMAL (API devuelve bien) ----------
            const titulo = d.title || '—';
            const seguidores = extraerSeguidores(d.followers);
            const descripcion = limpiarDescripcion(d.description);
            const verificado = d.verified ?? false;
            const url = d.url || input;
            const profile = d.profile || '';

            let ficha =
                '╭━━〔 📢 𝐖𝐀 𝐂𝐇𝐀𝐍𝐍𝐄𝐋 〕━━⬣\n' +
                '┃\n' +
                '┃ 📢 *' + titulo + '*\n' +
                '┃\n';

            if (descripcion && descripcion !== '—') {
                ficha += '┃ 📝 ' + descripcion.substring(0, 200) + (descripcion.length > 200 ? '...' : '') + '\n';
                ficha += '┃\n';
            }

            ficha +=
                '┃ 👥 Seguidores: *' + seguidores + '*\n' +
                '┃ ✅ Verificado: ' + (verificado ? 'Sí' : 'No') + '\n' +
                '┃\n' +
                '┃ 🔗 ' + url + '\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            // Intentar mandar con foto
            if (profile) {
                const buffer = await descargarProfile(profile);
                if (buffer) {
                    try {
                        await s.sendMessage(chatJid, {
                            image: buffer,
                            caption: ficha
                        }, { quoted: msg });
                        return;
                    } catch (e) {
                        try {
                            const telegraphUrl = await uploadToTelegraph(buffer);
                            await responder.imagen({ url: telegraphUrl }, ficha);
                            return;
                        } catch (e2) {
                            console.error('[WACHANNEL] Telegraph falló:', e2.message);
                        }
                    }
                }

                try {
                    await responder.imagen({ url: profile }, ficha);
                    return;
                } catch (e) {
                    console.error('[WACHANNEL] URL directa falló:', e.message);
                }
            }

            await responder.texto(ficha);

        } catch (error) {
            console.error('[WACHANNEL] Error:', error?.message || error);
            await responder.texto(
                '╭━━〔 ❌ 𝐖𝐀 𝐂𝐇𝐀𝐍𝐍𝐄𝐋 〕━━⬣\n' +
                '┃\n' +
                '┃ Error consultando el canal.\n' +
                '┃\n' +
                `┃ ⚠️ ${error?.message || 'Error desconocido'}\n` +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }
    }
};