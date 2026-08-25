import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { esOwner } from '../../lib/owner.js';
import { obtenerStore, guardarStore } from '../../lib/jsonStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MEDIA_DIR = path.join(__dirname, '../../media/gacha');
const GACHA_DATABASE = path.join(__dirname, '../../database/gacha.json');

const VALORES_POSIBLES = [
    1200, 2500, 3800, 4660, 5200, 6800,
    8500, 10000, 12400, 15000, 18000, 25000
];

const UA = { 'User-Agent': 'konachan-scraper/1.0' };

const randomValue = () =>
    VALORES_POSIBLES[Math.floor(Math.random() * VALORES_POSIBLES.length)];

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function caja(emoji, titulo, cuerpo = [], pie) {
    const lineas = Array.isArray(cuerpo) ? cuerpo : [cuerpo];
    let texto = `╭〔 ${emoji} 𝐆𝐄𝐍𝐂𝐇𝐀𝐑 › ${titulo} 〕⬣\n┃\n`;
    for (const l of lineas) {
        texto += l === '' ? '┃\n' : `┃ ${l}\n`;
    }
    texto += '┃\n╰━━━━━━━━━━━━━━━━⬣';
    if (pie) texto += `\n\n> ${pie}`;
    texto += '\n\n╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣';
    return texto;
}

function parseKonachanUrl(input) {
    try {
        const url = new URL(input);
        if (!url.hostname.includes('konachan')) return null;
        const rawTags = url.searchParams.get('tags');
        if (!rawTags) return null;
        const tags = rawTags.trim().split(/\s+/).filter(Boolean);
        return { seriesTag: tags[0], extraTags: tags.slice(1) };
    } catch {
        return null;
    }
}

function tagToSeriesName(tag) {
    return tag.replace(/[_:]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

function tagToName(tag) {
    return tag
        .replace(/\(.*?\)$/, '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim();
}

async function fetchAllPosts(seriesTag, extraTags = [], pages = 5) {
    const baseTags = [seriesTag, ...extraTags].join(' ');
    const allPosts = [];
    const BANNED = /(loli|shota|child|toddler|infant)/;

    for (let page = 1; page <= pages; page++) {
        const url = `https://konachan.net/post.json?tags=${encodeURIComponent(baseTags)}&limit=100&page=${page}`;
        try {
            const res = await fetch(url, { signal: AbortSignal.timeout(10_000), headers: UA });
            if (!res.ok) break;
            const posts = await res.json();
            if (!Array.isArray(posts) || posts.length === 0) break;

            const filtrados = posts.filter((p) => {
                const tags = (p.tags || '').toLowerCase();
                return !BANNED.test(tags) && p.rating !== 'e';
            });

            allPosts.push(...filtrados);
            if (posts.length < 100) break;
            await delay(800);
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
        'nude', 'naked', 'topless', 'uncensored', 'censored',
        'pussy', 'penis', 'cum', 'sex', 'fellatio', 'paizuri', 'masturbation',
        'fingering', 'anus', 'bottomless', 'pussy_juice', 'pubic_hair',
        'areolae', 'erect_nipples', 'panty_pull', 'breast_grab', 'breast_hold',
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
                    { signal: AbortSignal.timeout(8_000), headers: UA }
                );
                if (!tagRes.ok) return;
                const tagData = await tagRes.json();
                const info = Array.isArray(tagData) ? tagData.find((t) => t.name === tag) : null;
                if (!info || info.type !== 4) return;

                const checkRes = await fetch(
                    `https://konachan.net/post.json?tags=${encodeURIComponent(tag)}&limit=100`,
                    { signal: AbortSignal.timeout(8_000), headers: UA }
                );
                if (!checkRes.ok) return;
                const checkPosts = await checkRes.json();
                if (!Array.isArray(checkPosts) || checkPosts.length === 0) return;

                const valid = checkPosts.filter((p) => (p.sample_url || p.file_url) && !p.tags?.includes('corrupt_file'));
                if (valid.length === 0) return;

                const seriesMatch = valid.filter((p) => p.tags?.includes(seriesTag)).length;
                if (seriesMatch / valid.length >= 0.6) characters.push(tag);
            } catch {}
        }));
        await delay(1200);
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
                { signal: AbortSignal.timeout(8_000), headers: UA }
            );
            if (!res.ok) continue;
            const tags = await res.json();
            if (!Array.isArray(tags)) continue;
            for (const t of tags) {
                if (t.count >= MIN_COUNT) pool.set(t.name, true);
            }
        } catch {}
        await delay(400);
    }

    if (pool.size === 0) {
        try {
            const res = await fetch(
                'https://konachan.net/tag.json?type=3&order=count&limit=100&page=1',
                { signal: AbortSignal.timeout(8_000), headers: UA }
            );
            const tags = await res.json();
            for (const t of tags) {
                if (t.count >= MIN_COUNT) pool.set(t.name, true);
            }
        } catch {}
    }

    return [...pool.keys()].sort(() => Math.random() - 0.5).slice(0, cantidad);
}

function elegirUrlImagen(charTag, posts) {
    const candidatos = posts.filter((p) =>
        p.tags?.includes(charTag) &&
        (p.sample_url || p.file_url) &&
        !p.tags?.includes('corrupt_file')
    );
    if (candidatos.length === 0) return null;
    const elegido = candidatos[Math.floor(Math.random() * candidatos.length)];
    return elegido.sample_url || elegido.file_url;
}

async function descargarImagen(url) {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000), headers: UA });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (buffer.length === 0) throw new Error('Imagen vacía');
    return buffer;
}

function cargarGacha() {
    return obtenerStore(GACHA_DATABASE, {});
}

function guardarGacha() {
    guardarStore(GACHA_DATABASE, true);
}

function yaExiste(nombre, serie) {
    const datos = cargarGacha();
    return Object.values(datos).some(
        (c) => c.nombre === nombre && c.serie === serie
    );
}

function asegurarCarpetaMedia() {
    if (!fs.existsSync(MEDIA_DIR)) {
        fs.mkdirSync(MEDIA_DIR, { recursive: true });
    }
}

async function guardarPersonaje({ nombre, serie, genero, valor, buffer }) {
    asegurarCarpetaMedia();

    const archivo = `gacha_${Date.now()}_${Math.floor(Math.random() * 10000)}.jpg`;
    const ruta = path.join(MEDIA_DIR, archivo);

    fs.writeFileSync(ruta, buffer);

    const datos = cargarGacha();
    datos[archivo] = { nombre, genero, serie, valor };
    guardarGacha();

    return archivo;
}

async function runGeneration(responder, seriesTag, extraTags = [], pages = 5) {
    const seriesName = tagToSeriesName(seriesTag);

    await responder.texto(caja('🔍', 'ANALIZANDO', [`Serie: ${seriesName}`, `Buscando hasta ~${pages * 100} posts...`]));

    const posts = await fetchAllPosts(seriesTag, extraTags, pages);
    if (posts.length === 0) {
        await responder.texto(caja('⚠️', 'OMITIDA', [`"${seriesName}" no tiene posts disponibles.`]));
        return { seriesName, agregados: [], saltados: [], posts: 0, skipped: true };
    }

    const tagFreq = collectTagFrequencies(posts, seriesTag);
    const tagNames = Object.entries(tagFreq).filter(([, c]) => c >= 2).map(([n]) => n);
    const charTagNames = await filterCharacterTags(tagNames, seriesTag);

    const agregados = [];
    const saltados = [];

    for (const charTag of charTagNames) {
        const dbName = tagToName(charTag);
        const gender = getGenderFromPosts(charTag, posts);

        if (yaExiste(dbName, seriesName)) {
            saltados.push(`${dbName} (Ya existe)`);
            continue;
        }

        const urlImagen = elegirUrlImagen(charTag, posts);
        if (!urlImagen) {
            saltados.push(`${dbName} (Sin imagen válida)`);
            continue;
        }

        try {
            const buffer = await descargarImagen(urlImagen);
            const valor = randomValue();
            await guardarPersonaje({ nombre: dbName, serie: seriesName, genero: gender, valor, buffer });
            agregados.push(`${dbName} (${gender}) — ¥${valor.toLocaleString('en-US')}`);
        } catch (e) {
            saltados.push(`${dbName} (Error de imagen: ${e.message})`);
        }

        await delay(500);
    }

    return { seriesName, agregados, saltados, posts: posts.length, skipped: false };
}

export default {
    nombre: 'genchar',

    categoria: 'gacha',

    alias: ['generar'],

    owner: true,

    descripcion: '🎴 (Owner) Genera personajes desde konachan para el gacha.',

    ejecutar: async ({ msg, responder, argumento }) => {

        if (!esOwner(msg)) {
            await responder.texto(caja('⛔', 'ACCESO DENEGADO', ['Este comando es solo para el Owner.']));
            return;
        }

        const texto = (argumento || '').trim();
        const partes = texto.split(/\s+/).filter(Boolean);
        const primera = (partes[0] || '').toLowerCase();

        if (primera === 'random') {
            await responder.texto(caja('🎲', 'RANDOM', ['Buscando 5 animes al azar...', 'konachan.net — esto puede tardar varios minutos.']));

            let seriesTags = [];
            try {
                seriesTags = await fetchRandomSeriesTags(5);
            } catch {}

            if (seriesTags.length === 0) {
                await responder.texto(caja('❌', 'ERROR', ['No se pudo conectar con konachan.net.']));
                return;
            }

            const resultados = [];
            for (let i = 0; i < seriesTags.length; i++) {
                const tag = seriesTags[i];
                await responder.texto(caja('📦', 'PROCESANDO', [`[${i + 1}/${seriesTags.length}] ${tagToSeriesName(tag)}`]));
                try {
                    resultados.push(await runGeneration(responder, tag, [], 10));
                } catch (e) {
                    resultados.push({ seriesName: tagToSeriesName(tag), agregados: [], saltados: [], posts: 0, skipped: true, error: e.message });
                }
                if (i < seriesTags.length - 1) await delay(2000);
            }

            const totalAg = resultados.reduce((s, r) => s + r.agregados.length, 0);
            const totalSk = resultados.reduce((s, r) => s + r.saltados.length, 0);

            const lineasResumen = resultados.map((r) =>
                r.skipped
                    ? `❌ ${r.seriesName} — omitida${r.error ? ` (${r.error})` : ''}`
                    : `✅ ${r.seriesName} — ${r.agregados.length} nuevos, ${r.saltados.length} saltados (${r.posts} posts)`
            );

            await responder.texto(caja('🏁', 'COMPLETADO', lineasResumen, `👥 Total agregados: *${totalAg}* — ⏭️ Total saltados: *${totalSk}*`));
            return;
        }

        if (!texto) {
            await responder.texto(caja('🎴', 'AYUDA', [
                '❓ Falta la URL o el tag.',
                '',
                'Uso: *.genchar <URL_KONACHAN>*',
                'O:   *.genchar <tag_serie>*',
                '',
                'Ej:  *.genchar https://konachan.com/post?tags=sword_art_online*',
                'Ej:  *.genchar sword_art_online*',
                'Ej:  *.genchar random* — 5 series al azar',
                'Ej:  *.genchar debug <URL/tag>* — modo debug (no guarda nada)',
            ]));
            return;
        }

        const esDebug = primera === 'debug';
        const input = esDebug ? partes.slice(1).join(' ').trim() : texto;

        if (esDebug && !input) {
            await responder.texto(caja('🎴', 'DEBUG', ['❓ Falta la URL o el tag después de "debug".']));
            return;
        }

        let seriesTag;
        let extraTags = [];

        const parsed = parseKonachanUrl(input);
        if (parsed) {
            seriesTag = parsed.seriesTag;
            extraTags = parsed.extraTags;
        } else {
            const partesInput = input.split(/\s+/);
            seriesTag = partesInput[0].toLowerCase();
            extraTags = partesInput.slice(1);
        }

        try {
            if (esDebug) {
                await responder.texto(caja('🔍', 'DEBUG', [`Analizando "${tagToSeriesName(seriesTag)}"...`]));
                const posts = await fetchAllPosts(seriesTag, extraTags, 5);
                if (posts.length === 0) throw new Error('No se encontraron posts.');
                const tagFreq = collectTagFrequencies(posts, seriesTag);
                const tagNames = Object.entries(tagFreq).filter(([, c]) => c >= 2).map(([n]) => n);
                const chars = await filterCharacterTags(tagNames, seriesTag);
                await responder.texto(caja('🔍', 'DEBUG › RESULTADO', [
                    `ENCONTRADOS › ${chars.length}`,
                    '',
                    'Top 10:',
                    ...chars.slice(0, 10),
                ]));
                return;
            }

            const { seriesName, agregados, saltados } = await runGeneration(responder, seriesTag, extraTags, 5);

            const lista = agregados.slice(0, 15);
            const listaExtra = agregados.length > 15 ? [`...y ${agregados.length - 15} más`] : [];

            await responder.texto(caja('✅', 'COMPLETADO', [
                `SERIE › ${seriesName}`,
                `AGREGADOS › ${agregados.length}`,
                `SALTADOS › ${saltados.length}`,
                ...(lista.length ? ['', 'Agregados:', ...lista, ...listaExtra] : []),
            ]));

        } catch (e) {
            await responder.texto(caja('❌', 'ERROR', [e.message || String(e)]));
        }
    },
};