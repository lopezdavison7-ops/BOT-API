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
// LISTA DE ANIMES + PERSONAJES FAMOSOS
// ============================================================

const ANIME_CHARACTERS = {
    'naruto': ['uzumaki_naruto', 'uchiha_sasuke', 'haruno_sakura', 'hatake_kakashi', 'uchiha_itachi'],
    'bleach': ['kurosaki_ichigo', 'kuchiki_rukia', 'uchiha_renji', 'hinamori_momo', 'kuchiki_byakuya'],
    'one_piece': ['monkey_d_luffy', 'roronoa_zoro', 'nami', 'sanji', 'nico_robin'],
    'sword_art_online': ['kirito', 'asuna', 'yuuki_asuna', 'kirigaya_kazuto', 'yuuki_konno'],
    'clannad': ['furukawa_nagisa', 'sakagami_tomoyo', 'ichinose_kotomi', 'fujibayashi_kyou', 'nagisa_furukawa'],
    'my_hero_academia': ['midoriya_izuku', 'bakuho_katsuki', 'todoroki_shoto', 'uraraka_ochaco', 'tokoyami_fumikage'],
    'demon_slayer': ['kamado_tanjiro', 'kamado_nezuko', 'zenitsu_agatsuma', 'inosuke_hashibira', 'shinobu_kocho'],
    'jujutsu_kaisen': ['itadori_yuji', 'fushiguro_megumi', 'kugisaki_nobara', 'gojo_satoru', 'sukuna_ryomen'],
    'fullmetal_alchemist': ['edward_elric', 'alphonse_elric', 'winry_rockbell', 'roy_mustang', 'roriy_mei'],
    'tokyo_ghoul': ['kaneki_ken', 'kagune', 'touka_kirishima', 'suzuya_juuzou', 'arima_kishou'],
    'code_geass': ['lelouch_vi_britannia', 'cc', 'suzaku_kururugi', 'kallen_stadtfeld', 'c_c'],
    'steins_gate': ['okabe_rintarou', 'makise_kurisu', 'shiina_mayuri', 'hashida_daru', 'akiba_mae'],
    'k_on': ['hirasawa_yui', 'nakano_azusa', 'tairitsu', 'mio_akiyama', 'kotobuki_tsumugi'],
    'toradora': ['aisaka_taiga', 'takasu_ryuuji', 'kushieda_minori', 'amai_haruta', 'kiryu_ino'],
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
// BUSCAR Y DESCARGAR IMÁGENES DE UN PERSONAJE
// ============================================================

async function descargarPersonaje(charTag, seriesName) {
    try {
        const url = `https://konachan.net/post.json?limit=3&tags=${encodeURIComponent(charTag)}+rating:safe&order:random`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return null;
        const posts = await res.json();
        if (!posts || posts.length === 0) return null;

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
        return null;
    }
}

// ============================================================
// COMANDO GENRANDOM (Con búsqueda por personajes)
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

                // 1. Seleccionar 5 animes aleatorios de la lista
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

                    // 2. Buscar cada personaje del anime
                    for (const charTag of characters) {
                        const result = await descargarPersonaje(charTag, seriesName);
                        if (result && result > 0) {
                            animesAgregados += result;
                            totalAgregados += result;
                        } else {
                            animesSaltados++;
                            totalSaltados++;
                        }
                        await sleep(500); // Pausa para no saturar
                    }

                    resultados.push({
                        seriesName: seriesName,
                        agregados: animesAgregados,
                        saltados: animesSaltados
                    });
                }

                // 3. Resumen final
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