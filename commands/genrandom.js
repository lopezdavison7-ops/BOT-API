// commands/genrandom.js
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GACHA_IMG_DIR = path.join(__dirname, '../media/gacha');
const GACHA_DATABASE = path.join(__dirname, '../database/gacha.json');

const ANIME_LIST = [
    'Naruto', 'Bleach', 'One Piece', 'Fate/stay night', 'Fate/Zero',
    'K-On!', 'K-On!!', 'Clannad', 'Clannad After Story', 'Angel Beats!',
    'Toradora!', 'Sword Art Online', 'Katawa Shoujo', 'Kimi ni Todoke',
    'Ouran Koukou Host Club', 'Maburaho', 'Twinkle Crusaders', 'Super Sonico',
    'Touhikou Game', 'Madoka Magica', 'School Days', 'Kanon', 'Air',
    'Kuroko no Basket', 'Haikyuu!!', 'Shingeki no Kyojin', 'Tokyo Ghoul',
    'Fullmetal Alchemist', 'Code Geass', 'Death Note', 'One Punch Man',
    'Jujutsu Kaisen', 'Demon Slayer', 'My Hero Academia', 'Steins;Gate'
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function cargarDatosGacha() {
    if (!fs.existsSync(GACHA_DATABASE)) return {};
    try {
        return JSON.parse(fs.readFileSync(GACHA_DATABASE, 'utf8'));
    } catch {
        return {};
    }
}

function guardarDatosGacha(data) {
    fs.writeFileSync(GACHA_DATABASE, JSON.stringify(data, null, 2));
}

function tagToSeriesName(tag) {
    return tag.replace(/[_:]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

function tagToName(tag) {
    return tag.replace(/\(.*?\)$/, '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

async function fetchAllPosts(seriesTag, extraTags = [], pages = 3) {
    const baseTags = [seriesTag, ...extraTags].join(' ');
    const allPosts = [];
    const BANNED = /(loli|shota|child|toddler|infant)/;
    const MAX_RETRIES = 2;

    for (let page = 1; page <= pages; page++) {
        const url = `https://konachan.net/post.json?tags=${encodeURIComponent(baseTags)}&limit=100&page=${page}`;
        let exito = false;

        for (let intento = 0; intento < MAX_RETRIES; intento++) {
            try {
                const res = await fetch(url, {
                    signal: AbortSignal.timeout(8_000),
                    headers: { 'User-Agent': 'konachan-scraper/1.0' },
                });
                if (!res.ok) continue;
                const posts = await res.json();
                if (!Array.isArray(posts) || posts.length === 0) continue;

                const filtered = posts.filter((p) => {
                    const tags = (p.tags || '').toLowerCase();
                    return !BANNED.test(tags) && p.rating !== 'e';
                });

                allPosts.push(...filtered);
                exito = true;
                if (posts.length < 100) return allPosts;
                break;
            } catch {
                await sleep(600);
            }
        }
        if (!exito) break;
        await sleep(800);
    }
    return allPosts;
}

async function runGeneration(ctx, seriesTag, extraTags = [], pages = 3) {
    const seriesName = tagToSeriesName(seriesTag);

    await ctx.reply(
        `╭〔 🔍 𝐆𝐄𝐍𝐂𝐇𝐀𝐑 〕⬣\n` +
        `┃ Analizando "${seriesName}"...\n` +
        `┃\n` +
        `┃ > ~${pages * 100} posts\n` +
        `╰━━━━━━━━━━━━━━━━⬣\n\n` +
        `╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`
    );

    const posts = await fetchAllPosts(seriesTag, extraTags, pages);
    if (posts.length === 0) {
        return { seriesName, agregados: [], saltados: [], posts: 0, skipped: true, error: 'Sin posts disponibles' };
    }

    const gachaData = cargarDatosGacha();
    const agregados = [];
    const saltados = [];

    for (const post of posts) {
        if (!post.file_url) continue;
        const name = `gacha_${Date.now()}_${seriesTag}_${Math.random().toString(36).substr(2, 4)}.jpg`;
        try {
            const imgRes = await fetch(post.file_url, { signal: AbortSignal.timeout(5_000) });
            if (!imgRes.ok) continue;
            const buffer = await imgRes.buffer();
            const ruta = path.join(GACHA_IMG_DIR, name);
            fs.writeFileSync(ruta, buffer);

            const value = Math.floor(Math.random() * (8000 - 3000 + 1) + 3000);
            gachaData[name] = {
                nombre: tagToName(seriesTag),
                genero: 'Desconocido',
                serie: seriesName,
                valor: value
            };
            agregados.push(`${tagToName(seriesTag)} — ${value.toLocaleString()} ¥`);
        } catch (e) {
            saltados.push(`${tagToName(seriesTag)} (Error)`);
        }
    }

    guardarDatosGacha(gachaData);
    return { seriesName, agregados, saltados, posts: posts.length, skipped: false };
}

export default {
    nombre: 'genrandom',
    categoria: 'Diversión',
    alias: ['genchar', 'gr'],
    descripcion: 'Genera 5 series al azar desde Konachan.',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {
            const ctx = {
                reply: async (text) => {
                    await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
                },
                args: argumento ? argumento.trim().split(/\s+/) : []
            };

            const cmd = ctx.args[0]?.toLowerCase() || 'genrandom';

            if (cmd === 'genrandom' || cmd === 'random') {
                await ctx.reply(
                    `╭〔 🎲 𝐆𝐄𝐍𝐑𝐀𝐍𝐃𝐎𝐌 〕⬣\n` +
                    `┃ Buscando 5 animes al azar...\n` +
                    `┃\n` +
                    `┃ > konachan.net — Esto tardará varios minutos.\n` +
                    `╰━━━━━━━━━━━━━━━━⬣\n\n` +
                    `╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`
                );

                let seriesTags = [];
                try {
                    // Simular una lista de tags (evitando el fetch pesado de tags de Konachan)
                    const shuffled = [...ANIME_LIST].sort(() => Math.random() - 0.5);
                    seriesTags = shuffled.slice(0, 5);
                } catch {
                    seriesTags = ANIME_LIST.slice(0, 5);
                }

                const resultados = [];
                for (let i = 0; i < seriesTags.length; i++) {
                    const tag = seriesTags[i].toLowerCase().replace(/\s/g, '_');
                    await ctx.reply(
                        `╭〔 📦 𝐆𝐄𝐍𝐑𝐀𝐍𝐃𝐎𝐌 〕⬣\n` +
                        `┃ [${i + 1}/${seriesTags.length}] Procesando: ${seriesTags[i]}\n` +
                        `╰━━━━━━━━━━━━━━━━⬣\n\n` +
                        `╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`
                    );
                    try {
                        const res = await runGeneration(ctx, tag, [], 2);
                        resultados.push(res);
                    } catch (e) {
                        resultados.push({ seriesName: seriesTags[i], agregados: [], saltados: [], posts: 0, skipped: true, error: e.message });
                    }
                    if (i < seriesTags.length - 1) await sleep(2000);
                }

                let resumen = '';
                let totalAg = 0, totalSk = 0;
                resultados.forEach(r => {
                    if (r.skipped) {
                        resumen += `┃ ❌ *${r.seriesName}* — omitida${r.error ? ` (${r.error})` : ''}\n`;
                    } else {
                        resumen += `┃ ✅ *${r.seriesName}* — ${r.agregados.length} nuevos, ${r.saltados.length} saltados (${r.posts} posts)\n`;
                        totalAg += r.agregados.length;
                        totalSk += r.saltados.length;
                    }
                });

                await ctx.reply(
                    `╭〔 🏁 𝐆𝐄𝐍𝐑𝐀𝐍𝐃𝐎𝐌 𝐂𝐎𝐌𝐏𝐋𝐄𝐓𝐀𝐃𝐎 〕⬣\n` +
                    `┃\n` +
                    `${resumen}` +
                    `┃\n` +
                    `┃ 👥 Total agregados: *${totalAg}* — ⏭️ Total saltados: *${totalSk}*\n` +
                    `╰━━━━━━━━━━━━━━━━⬣\n\n` +
                    `╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`
                );
                return;
            }

            // Modo genchar (para un solo anime)
            await responder.texto('❌ Usa *.genrandom* para generar 5 animes al azar.');
        } catch (error) {
            console.error('[GENRANDOM] Error:', error);
            await responder.texto('❌ Error general en el comando genrandom.');
        }
    }
};