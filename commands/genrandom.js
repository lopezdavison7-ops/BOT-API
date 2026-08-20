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
// LISTA DE ANIMES + PERSONAJES (CON TAGS REALES DE KONACHAN)
// ============================================================

const ANIME_CHARACTERS = {
    // Naruto
    'naruto': ['naruto', 'sasuke', 'sakura', 'kakashi', 'itachi'],
    // Bleach
    'bleach': ['ichigo', 'rukia', 'renji', 'byakuya', 'hitsugaya'],
    // One Piece
    'one_piece': ['luffy', 'zoro', 'nami', 'sanji', 'robin'],
    // SAO
    'sword_art_online': ['kirito', 'asuna', 'yuuki', 'konno'],
    // Clannad
    'clannad': ['nagisa', 'tomoyo', 'kotomi', 'kyou', 'fuko'],
    // My Hero Academia
    'my_hero_academia': ['midoriya', 'bakuho', 'todoroki', 'uraraka', 'ochaco'],
    // Demon Slayer
    'demon_slayer': ['tanjiro', 'nezuko', 'zenitsu', 'inosuke', 'shinobu'],
    // Jujutsu Kaisen
    'jujutsu_kaisen': ['itadori', 'megumi', 'nobara', 'gojo', 'sukuna'],
    // Fullmetal Alchemist
    'fullmetal_alchemist': ['edward', 'alphonse', 'winry', 'mustang', 'mei'],
    // Tokyo Ghoul
    'tokyo_ghoul': ['kaneki', 'touka', 'suzuya', 'arima', 'kagune'],
    // Code Geass
    'code_geass': ['lelouch', 'cc', 'suzaku', 'kallen', 'c_c'],
    // Steins;Gate
    'steins_gate': ['okabe', 'kurisu', 'mayuri', 'daru', 'akiba'],
    // K-On!
    'k_on': ['yui', 'azusa', 'mio', 'tsumugi', 'ritsu'],
    // Toradora!
    'toradora': ['taiga', 'ryuuji', 'minori', 'haruta', 'kiryu'],
    // Fate/stay night
    'fate_stay_night': ['saber', 'rin', 'shirou', 'sakura', 'gilgamesh'],
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
// VERIFICAR SI UN TAG EXISTE EN KONACHAN
// ============================================================

async function verificarTag(tag) {
    try {
        const url = `https://konachan.net/tag.json?name=${encodeURIComponent(tag)}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) return false;
        const data = await res.json();
        return Array.isArray(data) && data.length > 0 && data[0].count > 0;
    } catch {
        return false;
    }
}

// ============================================================
// DESCARGAR IMÁGENES DE UN PERSONAJE
// ============================================================

async function descargarPersonaje(charTag, seriesName) {
    try {
        // Verificar si el tag existe
        const existe = await verificarTag(charTag);
        if (!existe) {
            console.log(`[GENRANDOM] Tag ${charTag} no existe en Konachan.`);
            return 0;
        }

        const url = `https://konachan.net/post.json?limit=2&tags=${encodeURIComponent(charTag)}+rating:safe&order:random`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return 0;
        const posts = await res.json();
        if (!posts || posts.length === 0) return 0;

        const gachaData = cargarDatosGacha();
        let agregadas = 0;

        for (const post of posts) {
            if (!post.file_url) continue;
            const nombreArchivo = `gacha_${Date.now()}_${charTag}.jpg`;
            try {
                const imgRes = await fetch(post.file_url, { signal: AbortSignal.timeout(5000) });
                if (!imgRes.ok) continue;
                const buffer = await imgRes.buffer();
                fs.writeFileSync(path.join(GACHA_IMG_DIR, nombreArchivo), buffer);

                const valor = Math.floor(Math.random() * (8000 - 3000 + 1) + 3000);
                gachaData[nombreArchivo] = {
                    nombre: tagToName(charTag),
                    genero: 'Desconocido',
                    serie: seriesName,
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
    descripcion: 'Genera 5 series al azar y agrega personajes al gacha.',
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

                const keys = Object.keys(ANIME_CHARACTERS);
                const shuffled = keys.sort(() => Math.random() - 0.5);
                const selectedAnimes = shuffled.slice(0, 5);

                let totalAgregados = 0;
                let totalSaltados = 0;
                let resultados = [];

                for (let i = 0; i < selectedAnimes.length; i++) {
                    const animeKey = selectedAnimes[i];
                    const seriesName = tagToName(animeKey);
                    const characters = ANIME_CHARACTERS[animeKey];

                    await ctx.reply(
                        `╭〔 📦 𝐆𝐄𝐍𝐑𝐀𝐍𝐃𝐎𝐌 〕⬣\n` +
                        `┃ [${i + 1}/${selectedAnimes.length}] Procesando: ${seriesName}\n` +
                        `╰━━━━━━━━━━━━━━━━⬣\n\n` +
                        `╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`
                    );

                    let animesAgregados = 0;
                    let animesSaltados = 0;

                    for (const charTag of characters) {
                        const result = await descargarPersonaje(charTag, seriesName);
                        if (result > 0) {
                            animesAgregados += result;
                            totalAgregados += result;
                        } else {
                            animesSaltados++;
                            totalSaltados++;
                        }
                        await sleep(500);
                    }

                    resultados.push({
                        seriesName: seriesName,
                        agregados: animesAgregados,
                        saltados: animesSaltados
                    });
                }

                let resumen = '';
                resultados.forEach(r => {
                    if (r.agregados > 0) {
                        resumen += `┃ ✅ *${r.seriesName}* — ${r.agregados} nuevos, ${r.saltados} saltados\n`;
                    } else {
                        resumen += `┃ ❌ *${r.seriesName}* — omitida (0 encontrados)\n`;
                    }
                });

                await ctx.reply(
                    `╭〔 🏁 𝐆𝐄𝐍𝐑𝐀𝐍𝐃𝐎𝐌 𝐂𝐎𝐌𝐏𝐋𝐄𝐓𝐀𝐃𝐎 〕⬣\n` +
                    `┃\n` +
                    `${resumen}` +
                    `┃\n` +
                    `┃ 👥 Total agregados: *${totalAgregados}* — ⏭️ Total saltados: *${totalSaltados}*\n` +
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