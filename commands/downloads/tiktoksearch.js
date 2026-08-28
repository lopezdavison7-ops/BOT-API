// commands/downloads/tiktoksearch.js
// ============================================================
// COMANDO: TIKTOKSEARCH
// BOT-API
//
// Busca videos en TikTok usando Lempi API.
// Devuelve resultados con links directos de descarga.
// ============================================================

import axios from 'axios';
import config from '../../config.js';

const LEMPI_API = 'https://api.lempi.lat';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

const HEADERS = {
    'User-Agent': USER_AGENT,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
};

function formatearNumero(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return String(num);
}

function formatearDuracion(segundos) {
    const min = Math.floor(segundos / 60);
    const seg = segundos % 60;
    return min > 0 ? `${min}m ${seg}s` : `${seg}s`;
}

function truncarTexto(texto, max = 50) {
    const t = String(texto || '').trim();
    return t.length > max ? t.substring(0, max - 3) + '...' : t;
}

async function buscarTikTokLempi(query, apikey) {
    try {
        const url = `${LEMPI_API}/s/tiktok?q=${encodeURIComponent(query)}&apikey=${apikey}`;
        const res = await axios.get(url, { headers: HEADERS, timeout: 15000 });
        const data = res.data;

        if (!data.status || !data.resultados?.length) {
            return null;
        }

        return data.resultados.map(v => ({
            id: v.id,
            titulo: v.titulo,
            url: v.url,
            duracion: v.duracion,
            portada: v.portada,
            video: v.video,
            calidad: v.calidad,
            autor: {
                usuario: v.autor?.usuario,
                nombre: v.autor?.nombre,
                avatar: v.autor?.avatar
            },
            estadisticas: {
                vistas: v.estadisticas?.vistas,
                likes: v.estadisticas?.likes,
                comentarios: v.estadisticas?.comentarios,
                compartidos: v.estadisticas?.compartidos
            },
            musica: {
                titulo: v.musica?.titulo,
                autor: v.musica?.autor
            }
        }));
    } catch (e) {
        console.error('[LEMPI TIKTOK SEARCH] Error:', e.message);
        return null;
    }
}

export default {
    nombre: 'tiktoksearch',

    categoria: 'descargas',

    alias: [
        'ttsearch',
        'tiktoks'
    ],

    descripcion:
        'Busca videos en TikTok. Uso: .tiktoksearch <texto>',

    ejecutar: async ({
        sock,
        msg,
        responder,
        argumento
    }) => {

        const apikey = config.LEMPI_API_KEY || '';

        if (!apikey) {
            await responder.texto(
                '╭〔 ❌ 𝐓𝐈𝐊𝐓𝐎𝐊𝐒𝐄𝐀𝐑𝐂𝐇 〕⬣\n' +
                '┃\n' +
                '┃ ❌ *API Key de Lempi no configurada.*\n' +
                '┃\n' +
                '┃ Agrega tu key en config.js:\n' +
                '┃ LEMPI_API_KEY: "tu_key_aqui"\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
            return;
        }

        const consulta = argumento?.trim();

        if (!consulta) {
            await responder.texto(
                '╭〔 ❌ 𝐓𝐈𝐊𝐓𝐎𝐊𝐒𝐄𝐀𝐑𝐂𝐇 〕⬣\n' +
                '┃\n' +
                '┃ ❌ *Falta el texto a buscar.*\n' +
                '┃\n' +
                '┃ 📌 *Uso:* .tiktoksearch gatos graciosos\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
            return;
        }

        await responder.texto(
            `╭〔 🔍 𝐓𝐈𝐊𝐓𝐎𝐊𝐒𝐄𝐀𝐑𝐂𝐇 〕⬣\n` +
            `┃\n` +
            `┃ Buscando: *${consulta}*\n` +
            `┃ 🔎 En Tiktok...\n` +
            `┃\n` +
            `╰━━━━━━━━━━━━━━━━⬣`
        );

        const videos = await buscarTikTokLempi(consulta, apikey);

        if (!videos || videos.length === 0) {
            await responder.texto(
                '╭〔 ❌ 𝐓𝐈𝐊𝐓𝐎𝐊𝐒𝐄𝐀𝐑𝐂𝐇 〕⬣\n' +
                '┃\n' +
                '┃ No se encontraron resultados.\n' +
                '┃ Intenta con otra búsqueda.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
            return;
        }

        let texto =
            `╭〔 💻𝐁𝐎𝐓-𝐀𝐏𝐈⚡ 〕⬣\n` +
            `┃\n` +
            `┃ 🔎 *TikTok Search*\n` +
            `┃ 📝 "${truncarTexto(consulta, 30)}"\n` +
            `┃ 📊 ${videos.length} resultados\n` +
            `┃\n`;

        videos.slice(0, 10).forEach((v, i) => {
            const stats = v.estadisticas;
            const duracion = formatearDuracion(v.duracion);
            const vistas = formatearNumero(stats.vistas || 0);
            const likes = formatearNumero(stats.likes || 0);
            const comentarios = formatearNumero(stats.comentarios || 0);

            texto +=
                `┃ ${i + 1}. *${truncarTexto(v.titulo, 40)}*\n` +
                `┃ 👤 @${v.autor?.usuario || 'user'}\n` +
                `┃ ⏱️ ${duracion} | 👁️ ${vistas} | ❤️ ${likes} | 💬 ${comentarios}\n` +
                `┃ 🔗 ${v.url}\n` +
                `┃ ⬇️ ${v.video}\n` +
                `┃\n`;
        });

        texto +=
            `┃ 💡 *Para descargar:*\n` +
            `┃ Usa .tiktok <link> o .play <link>\n` +
            `┃\n` +
            `╰〔 💻𝐁𝐎𝐓-𝐀𝐏𝐈⚡ 〕⬣`;

        await responder.texto(texto);
    }
};
