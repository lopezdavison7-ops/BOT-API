// commands/genrandom.js
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GACHA_IMG_DIR = path.join(__dirname, '../media/gacha');
const GACHA_DATABASE = path.join(__dirname, '../database/gacha.json');

// ============================================================
// LISTA DE ANIMES (Seed para el random)
// ============================================================

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

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

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

// ============================================================
// MOTOR DE SCRAPING DE KONACHAN (CON FILTRO BAJADO A 30%)
// ============================================================

async function fetchAllPosts(seriesTag, extraTags = [], pages = 3) {
    const baseTags = [seriesTag, ...extraTags].join(' ');
    const allPosts = [];
    const BANNED = /(loli|shota|child|toddler|infant)/;

    for (let page = 1; page <= pages; page++) {
        const url = `https://konachan.net/post.json?tags=${encodeURIComponent(baseTags)}&limit=100&page=${page}`;
        try {
            const res = await fetch(url, {
                signal: AbortSignal.timeout(10_000),
                headers: { 'User-Agent': 'konachan-scraper/1.0' },
            });
            if (!res.ok) break;
            const posts = await res.json();
            if (!Array.isArray(posts) || posts.length === 0) break;

            const filtered = posts.filter((p) => {
                const tags = (p.tags || '').toLowerCase();
                return !BANNED.test(tags) && p.rating !== 'e';
            });

            allPosts.push(...filtered);
            if (posts.length < 100) break;
            await sleep(800);
        } catch {
            break;
        }
    }
    return allPosts;
}

function collectTagFrequencies(posts, seriesTag) {
    const SKIP = new Set([
        seriesTag, 'highres', 'absurdres', 'jpeg_artifacts', 'scan', 'dakimakura',
        '1girl', '2girls', '3girls', '4girls', 'multiple_girls', 'solo',
        '1boy', '2boys', 'multiple_boys',
        'swimsuits', 'thighhighs', 'bikini', 'wet', 'pantsu', 'nipples',
        'dress', 'see_through', 'animal_ears', 'ass', 'skirt_lift', 'open_shirt',
        'bra', 'tail', 'breasts', 'cleavage', 'panties', 'navel', 'blush',
        'long_hair', 'short_hair', 'blonde_hair', 'twintails', 'brown_hair',
        'black_hair', 'white_hair', 'red_hair', 'blue_hair', 'green_hair',
        'no_bra', 'megane', 'horns', 'stockings', 'pantyhose',
        'weapon', 'cosplay', 'bunny_ears', 'feet', 'lingerie', 'bunny_girl',
        'leotard', 'sword', 'armor', 'torn_clothes', 'seifuku', 'wings',
        'shirt_lift', 'wedding_dress', 'gym_uniform', 'maid', 'towel',
        'naked_apron', 'yukata', 'uniform', 'pajama', 'underboob', 'shimapan',
        'vector_trace', 'wallpaper', 'transparent_png', 'monochrome',
        'crossover', 'tagme', 'fixme', 'crease', 'onsen', 'yuri',
    ]);

    const freq = {};
    for (const post of posts) {
        const tagStr = typeof post.tags === 'string' ? post.tags : '';
        for (const t of tagStr.split(/\s+/).filter(Boolean)) {
            if (SKIP.has(t)) continue;
            freq[t] = (freq[t] || 0) + 1;
        }
    }
    return freq;
}

async function filterCharacterTags(tagNames, seriesTag) {
    const characters = [];
    const CONCURRENCY = 2;

    for (let i = 0; i < tagNames.length; i += CONCURRENCY) {
        const batch = tagNames.slice(i, i + CONCURRENCY);
        await Promise.all(batch.map(async (tag) => {
            try {
                const tagRes = await fetch(
                    `https://konachan.net/tag.json?name=${encodeURIComponent(tag)}`,
                    { signal: AbortSignal.timeout(8_000), headers: { 'User-Agent': 'konachan-scraper/1.0' } },
                );
                if (!tagRes.ok) return;
                const tagData = await tagRes.json();
                const info = Array.isArray(tagData) ? tagData.find((t) => t.name === tag) : null;
                if (!info || info.type !== 4) return;

                const checkRes = await fetch(
                    `https://konachan.net/post.json?tags=${encodeURIComponent(tag)}&limit=100`,
                    { signal: AbortSignal.timeout(8_000), headers: { 'User-Agent': 'konachan-scraper/1.0' } },
                );
                if (!checkRes.ok) return;
                const checkPosts = await checkRes.json();
                if (!Array.isArray(checkPosts) || checkPosts.length === 0) return;

                const valid = checkPosts.filter((p) => (p.sample_url || p.file_url) && !p.tags?.includes('corrupt_file'));
                if (valid.length === 0) return;

                const seriesMatch = valid.filter((p) => p.tags?.includes(seriesTag)).length;
                // 🔥 FILTRO BAJADO A 30% (antes era 0.6)
                if (seriesMatch / valid.length >= 0.3) characters.push(tag);
            } catch {
                /* ignorar */
            }
        }));
        await sleep(1200);
    }
    return characters;
}

function getGenderFromPosts(charTag, posts) {
    if (charTag.includes('_(male)')) return 'Masculino';
    if (charTag.includes('_(female)')) return 'Femenino';

    const FEMALE = new Set(['1girl', '2girls', 'multiple_girls', 'female']);
    const MALE = new Set(['1boy', '2boys', 'multiple_boys', 'male', 'shouta']);

    let maleScore = 0, femaleScore = 0;
    for (const post of posts) {
        if (!post.tags?.includes(charTag)) continue;
        const tags = post.tags.split(/\s+/);
        const isSolo = tags.includes('solo');
        const hasMale = tags.some((t) => MALE.has(t));
        const hasFemale = tags.some((t) => FEMALE.has(t));
        const weight = isSolo ? 10 : 1;
        if (hasMale && !hasFemale) maleScore += weight;
        else if (hasFemale && !hasMale) femaleScore += weight;
    }
    return maleScore > femaleScore ? 'Masculino' : 'Femenino';
}

async function fetchRandomSeriesTags(cantidad = 5) {
    const MAX_PAGE = 15;
    const MIN_COUNT = 30;
    const pool = new Map();

    const pageSet = new Set();
    while (pageSet.size < 3) pageSet.add(Math.floor(Math.random() * MAX_PAGE) + 1);

    for (const page of pageSet) {
        try {
            const res = await fetch(
                `https://konachan.net/tag.json?type=3&order=count&limit=100&page=${page}`,
                { signal: AbortSignal.timeout(8_000), headers: { 'User-Agent': 'konachan-scraper/1.0' } },
            );
            if (!res.ok) continue;
            const tags = await res.json();
            if (!Array.isArray(tags)) continue;
            for (const t of tags) {
                if (t.count >= MIN_COUNT) pool.set(t.name, true);
            }
        } catch {
            /* ignorar */
        }
        await sleep(400);
    }

    return [...pool.keys()].sort(() => Math.random() - 0.5).slice(0, cantidad);
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
        return { seriesName, agregados: [], saltados: [], posts: 0, skipped: true };
    }

    const tagFreq = collectTagFrequencies(posts, seriesTag);
    const tagNames = Object.entries(tagFreq).filter(([, c]) => c >= 2).map(([n]) => n);
    const charTagNames = await filterCharacterTags(tagNames, seriesTag);

    const agregados = [];
    const saltados = [];
    const gachaData = cargarDatosGacha();

    for (const charTag of charTagNames) {
        const dbName = tagToName(charTag);
        const gender = getGenderFromPosts(charTag, posts);
        const value = Math.floor(Math.random() * (8000 - 3000 + 1) + 3000);

        const exists = Object.values(gachaData).some(c => c.nombre === dbName && c.serie === seriesName);
        if (exists) {
            saltados.push(`${dbName} (Ya existe)`);
            continue;
        }

        const nombreArchivo = `gacha_${Date.now()}_${charTag.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;
        // Aquí descargaríamos la imagen, pero por ahora solo registramos
        gachaData[nombreArchivo] = {
            nombre: dbName,
            genero: gender,
            serie: seriesName,
            valor: value
        };
        agregados.push(`${dbName} (${gender}) — ${value.toLocaleString()} ¥`);
    }

    guardarDatosGacha(gachaData);
    return { seriesName, agregados, saltados, posts: posts.length, skipped: false };
}

// ============================================================
// COMANDO GENRANDOM (CON FILTRO BAJADO A 30%)
// ============================================================

export default {
    nombre: 'genrandom',
    categoria: 'Diversión',
    alias: ['genchar', 'gr'],
    descripcion: 'Genera personajes de 5 animes al azar desde Konachan.',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {
            const ctx = {
                reply: async (text) => {
                    await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
                },
                args: argumento ? argumento.trim().split(/\s+/) : []
            };

            const cmd = ctx.args[0]?.toLowerCase() || 'genrandom';

            if (cmd === 'genrandom') {
                await ctx.reply(
                    `╭〔 🎲 𝐆𝐄𝐍𝐑𝐀𝐍𝐃𝐎𝐌 〕⬣\n` +
                    `┃ Buscando 5 animes al azar...\n` +
                    `┃\n` +
                    `┃ > konachan.net — Esto tardará varios minutos.\n` +
                    `╰━━━━━━━━━━━━━━━━⬣\n\n` +
                    `╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`
                );

                let seriesTags = [];
                try { seriesTags = await fetchRandomSeriesTags(5); } catch { /* ignorar */ }

                if (seriesTags.length === 0) {
                    const shuffled = [...ANIME_LIST].sort(() => Math.random() - 0.5);
                    seriesTags = shuffled.slice(0, 5).map(s => s.toLowerCase().replace(/\s/g, '_'));
                }

                const resultados = [];
                for (let i = 0; i < seriesTags.length; i++) {
                    const tag = seriesTags[i];
                    await ctx.reply(
                        `╭〔 📦 𝐆𝐄𝐍𝐑𝐀𝐍𝐃𝐎𝐌 〕⬣\n` +
                        `┃ [${i + 1}/${seriesTags.length}] Procesando: ${tagToSeriesName(tag)}\n` +
                        `╰━━━━━━━━━━━━━━━━⬣\n\n` +
                        `╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`
                    );
                    try {
                        resultados.push(await runGeneration(ctx, tag, [], 3));
                    } catch (e) {
                        resultados.push({ seriesName: tagToSeriesName(tag), agregados: [], saltados: [], posts: 0, skipped: true, error: e.message });
                    }
                    if (i < seriesTags.length - 1) await sleep(2000);
                }

                const totalAg = resultados.reduce((s, r) => s + r.agregados.length, 0);
                const totalSk = resultados.reduce((s, r) => s + r.saltados.length, 0);

                let resumen = '';
                resultados.forEach(r => {
                    if (r.skipped) {
                        resumen += `┃ ❌ *${r.seriesName}* — omitida${r.error ? ` (${r.error})` : ''}\n`;
                    } else {
                        resumen += `┃ ✅ *${r.seriesName}* — ${r.agregados.length} nuevos, ${r.saltados.length} saltados (${r.posts} posts)\n`;
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

            const input = ctx.args.join(' ').trim();
            if (!input) {
                await ctx.reply(
                    `╭〔 🎴 𝐆𝐄𝐍𝐂𝐇𝐀𝐑 〕⬣\n` +
                    `┃ ❓ Falta la URL o el tag...\n` +
                    `┃\n` +
                    `┃ > Uso: *.genchar <URL_KONACHAN>*\n` +
                    `┃ > O:   *.genchar <tag_serie>*\n` +
                    `┃ > Ej:  *.genchar sword_art_online*\n` +
                    `┃ > Ej:  *.genrandom* — 5 series al azar\n` +
                    `╰━━━━━━━━━━━━━━━━⬣\n\n` +
                    `╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`
                );
                return;
            }

            let seriesTag;
            let extraTags = [];
            const parts = input.split(/\s+/);
            seriesTag = parts[0].toLowerCase();
            extraTags = parts.slice(1);

            const { seriesName, agregados, saltados } = await runGeneration(ctx, seriesTag, extraTags, 3);

            let lista = agregados.length ? agregados.slice(0, 15) : [];
            let listaExtra = agregados.length > 15 ? [`...y ${agregados.length - 15} más`] : [];

            let resumen = '';
            resumen += `┃ SERIE › ${seriesName}\n`;
            resumen += `┃ AGREGADOS › ${agregados.length}\n`;
            resumen += `┃ SALTADOS › ${saltados.length}\n`;
            if (lista.length) {
                resumen += `┃\n`;
                resumen += `┃ *Agregados:*\n`;
                lista.forEach(item => resumen += `┃ ${item}\n`);
                listaExtra.forEach(item => resumen += `┃ ${item}\n`);
            }

            await ctx.reply(
                `╭〔 ✅ 𝐆𝐄𝐍𝐂𝐇𝐀𝐑 𝐂𝐎𝐌𝐏𝐋𝐄𝐓𝐀𝐃𝐎 〕⬣\n` +
                `┃\n` +
                `${resumen}` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━⬣\n\n` +
                `╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`
            );

        } catch (error) {
            console.error('[GENRANDOM] Error:', error);
            await responder.texto('❌ Error al ejecutar genrandom.');
        }
    }
};