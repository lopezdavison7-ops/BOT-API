// commands/genrandom.js
import fetch from 'node-fetch';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// CONFIGURACIÓN DE BASE DE DATOS (SQLite)
// ============================================================

const DB_FILE = path.join(__dirname, '../database/gacha.sqlite3');
const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');

// Crear tablas si no existen
db.exec(`
  CREATE TABLE IF NOT EXISTS gacha_characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    series TEXT NOT NULL,
    gender TEXT NOT NULL,
    booru_tag TEXT NOT NULL,
    value INTEGER NOT NULL,
    rarity TEXT NOT NULL DEFAULT 'common',
    UNIQUE(name, series)
  );
`);

// ============================================================
// FUNCIONES DE LA BASE DE DATOS (igual que tu amigo)
// ============================================================

function computeRarity(value) {
  if (value >= 15000) return 'mythic';
  if (value >= 9000) return 'legendary';
  if (value >= 6500) return 'epic';
  if (value >= 4500) return 'rare';
  return 'common';
}

function addCharacter({ name, series, gender, booru_tag, value }) {
  // Verificar duplicados
  const dup = db.prepare('SELECT 1 FROM gacha_characters WHERE name = ? AND series = ?').get(name, series);
  if (dup) throw new Error('DUPLICATE_CHARACTER');
  
  const rarity = computeRarity(value);
  db.prepare(
    'INSERT INTO gacha_characters (name, series, gender, booru_tag, value, rarity) VALUES (?,?,?,?,?,?)'
  ).run(name, series, gender, booru_tag, value, rarity);
}

// ============================================================
// FUNCIONES DE SCRAPING (idénticas a tu amigo)
// ============================================================

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const randomValue = () => Math.floor(Math.random() * (8000 - 3000 + 1) + 3000);

function tagToSeriesName(tag) {
  return tag.replace(/[_:]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

function tagToName(tag) {
  return tag.replace(/\(.*?\)$/, '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

async function fetchAllPosts(seriesTag, extraTags = [], pages = 5) {
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
        if (seriesMatch / valid.length >= 0.6) characters.push(tag);
      } catch {
        /* ignorar */
      }
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
    await delay(400);
  }

  return [...pool.keys()].sort(() => Math.random() - 0.5).slice(0, cantidad);
}

async function runGeneration(ctx, seriesTag, extraTags = [], pages = 5) {
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
    await ctx.reply(
      `╭〔 ⚠️ 𝐆𝐄𝐍𝐂𝐇𝐀𝐑 〕⬣\n` +
      `┃ "${seriesName}" omitida...\n` +
      `┃\n` +
      `┃ > Sin posts disponibles, se omite.\n` +
      `╰━━━━━━━━━━━━━━━━⬣\n\n` +
      `╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`
    );
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
    try {
      const value = randomValue();
      // Usamos la función SQLite como tu amigo
      addCharacter({ name: dbName, series: seriesName, gender, booru_tag: charTag, value });
      agregados.push(`${dbName} (${gender}) — ${value.toLocaleString()} ¥`);
    } catch (e) {
      saltados.push(`${dbName} (${e.message === 'DUPLICATE_CHARACTER' ? 'Ya existe' : 'Error'})`);
    }
  }

  return { seriesName, agregados, saltados, posts: posts.length, skipped: false };
}

// ============================================================
// COMANDO GENRANDOM
// ============================================================

export default {
  nombre: 'genrandom',
  categoria: 'Diversión',
  alias: ['genchar', 'gr'],
  descripcion: 'Genera personajes desde konachan para el gacha.',
  ejecutar: async ({ msg, responder, argumento, sock }) => {
    try {
      const ctx = {
        reply: async (text) => {
          await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
        },
        args: argumento ? argumento.trim().split(/\s+/) : []
      };

      const cmd = ctx.args[0]?.toLowerCase() || 'genrandom';

      if (cmd === 'genrandom' || ctx.args[0] === 'random') {
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
          return ctx.reply(
            `╭〔 ❌ 𝐆𝐄𝐍𝐑𝐀𝐍𝐃𝐎𝐌 〕⬣\n` +
            `┃ Error...\n` +
            `┃\n` +
            `┃ > No se pudo conectar con konachan.net.\n` +
            `╰━━━━━━━━━━━━━━━━⬣\n\n` +
            `╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`
          );
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
            resultados.push(await runGeneration(ctx, tag, [], 10));
          } catch (e) {
            resultados.push({ seriesName: tagToSeriesName(tag), agregados: [], saltados: [], posts: 0, skipped: true, error: e.message });
          }
          if (i < seriesTags.length - 1) await delay(2000);
        }

        const totalAg = resultados.reduce((s, r) => s + r.agregados.length, 0);
        const totalSk = resultados.reduce((s, r) => s + r.saltados.length, 0);

        return ctx.reply(
          `╭〔 🏁 𝐆𝐄𝐍𝐑𝐀𝐍𝐃𝐎𝐌 𝐂𝐎𝐌𝐏𝐋𝐄𝐓𝐀𝐃𝐎 〕⬣\n` +
          `┃\n` +
          `${resultados.map((r) =>
            r.skipped
              ? `┃ ❌ *${r.seriesName}* — omitida${r.error ? ` (${r.error})` : ''}`
              : `┃ ✅ *${r.seriesName}* — ${r.agregados.length} nuevos, ${r.saltados.length} saltados (${r.posts} posts)`
          ).join('\n')}\n` +
          `┃\n` +
          `┃ 👥 Total agregados: *${totalAg}* — ⏭️ Total saltados: *${totalSk}*\n` +
          `╰━━━━━━━━━━━━━━━━⬣\n\n` +
          `╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`
        );
      }

      const input = ctx.args.join(' ').trim();

      if (!input) {
        return ctx.reply(
          `╭〔 🎴 𝐆𝐄𝐍𝐂𝐇𝐀𝐑 〕⬣\n` +
          `┃ ❓ Falta la URL o el tag...\n` +
          `┃\n` +
          `┃ > Uso: *.genchar <URL_KONACHAN>*\n` +
          `┃ > O:   *.genchar <tag_serie>*\n` +
          `┃ > Ej:  *.genchar https://konachan.com/post?tags=sword_art_online*\n` +
          `┃ > Ej:  *.genchar sword_art_online*\n` +
          `┃ > Ej:  *.genrandom* — 5 series al azar\n` +
          `┃ > Ej:  *.gendebug <URL>* — Modo debug\n` +
          `╰━━━━━━━━━━━━━━━━⬣\n\n` +
          `╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`
        );
      }

      let seriesTag;
      let extraTags = [];

      const parsed = parseKonachanUrl(input);
      if (parsed) {
        seriesTag = parsed.seriesTag;
        extraTags = parsed.extraTags;
      } else {
        const parts = input.split(/\s+/);
        seriesTag = parts[0].toLowerCase();
        extraTags = parts.slice(1);
      }

      const { seriesName, agregados, saltados } = await runGeneration(ctx, seriesTag, extraTags, 5);

      const lista = agregados.length ? agregados.slice(0, 15) : [];
      const listaExtra = agregados.length > 15 ? [`...y ${agregados.length - 15} más`] : [];

      return ctx.reply(
        `╭〔 ✅ 𝐆𝐄𝐍𝐂𝐇𝐀𝐑 𝐂𝐎𝐌𝐏𝐋𝐄𝐓𝐀𝐃𝐎 〕⬣\n` +
        `┃\n` +
        `┃ SERIE › ${seriesName}\n` +
        `┃ AGREGADOS › ${agregados.length}\n` +
        `┃ SALTADOS › ${saltados.length}\n` +
        `${lista.length ? `┃\n┃ *Agregados:*\n${lista.map(i => `┃ ${i}`).join('\n')}\n${listaExtra.map(i => `┃ ${i}`).join('\n')}` : ''}\n` +
        `┃\n` +
        `╰━━━━━━━━━━━━━━━━⬣\n\n` +
        `╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`
      );

    } catch (e) {
      console.error('[GENRANDOM] Error:', e);
      await responder.texto('❌ Error al ejecutar genrandom.');
    }
  }
};