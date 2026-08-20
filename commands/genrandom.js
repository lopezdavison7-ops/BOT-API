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
// LISTA DE ANIMES + PERSONAJES (con tags reales para Konachan)
// ============================================================

const ANIME_CHARACTERS = {
    'naruto': ['naruto', 'sasuke', 'sakura', 'kakashi', 'itachi'],
    'bleach': ['ichigo', 'rukia', 'renji', 'byakuya', 'hitsugaya'],
    'one_piece': ['luffy', 'zoro', 'nami', 'sanji', 'robin'],
    'sword_art_online': ['kirito', 'asuna', 'yuuki'],
    'clannad': ['nagisa', 'tomoyo', 'kotomi', 'kyou', 'fuko'],
    'my_hero_academia': ['midoriya', 'bakuho', 'todoroki', 'uraraka', 'ochaco'],
    'demon_slayer': ['tanjiro', 'nezuko', 'zenitsu', 'inosuke', 'shinobu'],
    'jujutsu_kaisen': ['itadori', 'megumi', 'nobara', 'gojo', 'sukuna'],
    'fullmetal_alchemist': ['edward', 'alphonse', 'winry', 'mustang'],
    'tokyo_ghoul': ['kaneki', 'touka', 'suzuya', 'arima'],
    'code_geass': ['lelouch', 'cc', 'suzaku', 'kallen'],
    'steins_gate': ['okabe', 'kurisu', 'mayuri', 'daru'],
    'k_on': ['yui', 'azusa', 'mio', 'tsumugi'],
    'toradora': ['taiga', 'ryuuji', 'minori', 'haruta'],
};

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

function tagToName(tag) {
    return tag.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

// ============================================================
// DESCARGAR Y AGREGAR PERSONAJE AL GACHA
// ============================================================

async function descargarYAgregar(animeKey, charTag) {
    try {
        // 🔥 Usar el tag del personaje (NO el del anime)
        const url = `https://konachan.net/post.json?limit=2&tags=${encodeURIComponent(charTag)}+rating:safe&order:random`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return 0;
        const posts = await res.json();
        if (!posts || posts.length === 0) return 0;

        const gachaData = cargarDatosGacha();
        let agregadas = 0;

        for (const post of posts) {
            if (!post.file_url) continue;
            const fileName = `gacha_${Date.now()}_${charTag}.jpg`;
            try {
                const imgRes = await fetch(post.file_url, { signal: AbortSignal.timeout(5000) });
                if (!imgRes.ok) continue;
                const buffer = await imgRes.buffer();
                fs.writeFileSync(path.join(GACHA_IMG_DIR, fileName), buffer);

                const valor = Math.floor(Math.random() * (8000 - 3000 + 1) + 3000);
                gachaData[fileName] = {
                    nombre: tagToName(charTag),
                    genero: 'Desconocido',
                    serie: tagToName(animeKey),
                    valor: valor
                };
                agregadas++;
            } catch {}
        }

        guardarDatosGacha(gachaData);
        return agregadas;
    } catch {
        return 0;
    }
}

// ============================================================
// COMANDO GENRANDOM
// ============================================================

export default {
    nombre: 'genrandom',
    categoria: 'Diversión',
    alias: ['genchar', 'gr'],
    descripcion: 'Genera personajes aleatorios desde Konachan y los agrega al gacha.',
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

                const keys = Object.keys(ANIME_CHARACTERS);
                const shuffled = keys.sort(() => Math.random() - 0.5);
                const selected = shuffled.slice(0, 5);

                let totalAgregados = 0;
                let resultados = [];

                for (let i = 0; i < selected.length; i++) {
                    const anime = selected[i];
                    const chars = ANIME_CHARACTERS[anime];

                    await ctx.reply(
                        `╭〔 📦 𝐆𝐄𝐍𝐑𝐀𝐍𝐃𝐎𝐌 〕⬣\n` +
                        `┃ [${i + 1}/${selected.length}] Procesando: ${tagToName(anime)}\n` +
                        `╰━━━━━━━━━━━━━━━━⬣\n\n` +
                        `╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`
                    );

                    let animeAgregados = 0;
                    for (const charTag of chars) {
                        const count = await descargarYAgregar(anime, charTag);
                        animeAgregados += count;
                        totalAgregados += count;
                        await sleep(600);
                    }

                    resultados.push(animeAgregados > 0 
                        ? `┃ ✅ *${tagToName(anime)}* — +${animeAgregados} nuevas` 
                        : `┃ ❌ *${tagToName(anime)}* — omitida (sin imágenes)`
                    );
                }

                await ctx.reply(
                    `╭〔 🏁 𝐆𝐄𝐍𝐑𝐀𝐍𝐃𝐎𝐌 𝐂𝐎𝐌𝐏𝐋𝐄𝐓𝐀𝐃𝐎 〕⬣\n` +
                    `┃\n` +
                    `${resultados.join('\n')}\n` +
                    `┃\n` +
                    `┃ 📦 Total agregados: *${totalAgregados}*\n` +
                    `╰━━━━━━━━━━━━━━━━⬣\n\n` +
                    `╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`
                );
                return;
            }

            await responder.texto('❌ Usa *.genrandom* para generar cartas.');
        } catch (error) {
            console.error('[GENRANDOM] Error:', error);
            await responder.texto('❌ Error en genrandom.');
        }
    }
};