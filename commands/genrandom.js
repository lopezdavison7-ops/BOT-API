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
// LISTA DE PERSONAJES REALES DE KONACHAN (¡CON TAGS QUE SÍ EXISTEN!)
// ============================================================

const CHARACTER_TAGS = [
    'naruto', 'sasuke', 'sakura', 'kakashi', 'itachi',
    'ichigo', 'rukia', 'renji', 'byakuya', 'hitsugaya',
    'luffy', 'zoro', 'nami', 'sanji', 'robin',
    'kirito', 'asuna', 'yuuki', 'konno',
    'nagisa', 'tomoyo', 'kotomi', 'kyou', 'fuko',
    'midoriya', 'bakuho', 'todoroki', 'uraraka', 'ochaco',
    'tanjiro', 'nezuko', 'zenitsu', 'inosuke', 'shinobu',
    'itadori', 'megumi', 'nobara', 'gojo', 'sukuna',
    'edward', 'alphonse', 'winry', 'mustang', 'mei',
    'kaneki', 'touka', 'suzuya', 'arima', 'kagune',
    'lelouch', 'cc', 'suzaku', 'kallen', 'c_c',
    'okabe', 'kurisu', 'mayuri', 'daru', 'akiba',
    'yui', 'azusa', 'mio', 'tsumugi', 'ritsu',
    'taiga', 'ryuuji', 'minori', 'haruta', 'kiryu',
    'saber', 'rin', 'shirou', 'sakura', 'gilgamesh'
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

function tagToName(tag) {
    return tag.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

// ============================================================
// DESCARGAR PERSONAJE Y AGREGAR AL GACHA
// ============================================================

async function descargarPersonaje(charTag) {
    try {
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
                    serie: 'Konachan Random',
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
// COMANDO GENRANDOM (EL DEFINITIVO)
// ============================================================

export default {
    nombre: 'genrandom',
    categoria: 'Diversión',
    alias: ['genchar', 'gr'],
    descripcion: 'Descarga personajes aleatorios desde Konachan.',
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
                    `┃ Buscando personajes aleatorios...\n` +
                    `┃\n` +
                    `┃ > konachan.net — Esto tardará unos segundos.\n` +
                    `╰━━━━━━━━━━━━━━━━⬣\n\n` +
                    `╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`
                );

                // Seleccionar 5 personajes aleatorios de la lista
                const shuffled = [...CHARACTER_TAGS].sort(() => Math.random() - 0.5);
                const selected = shuffled.slice(0, 5);

                let totalAgregados = 0;
                let totalSaltados = 0;
                let resultados = [];

                for (let i = 0; i < selected.length; i++) {
                    const charTag = selected[i];

                    await ctx.reply(
                        `╭〔 📦 𝐆𝐄𝐍𝐑𝐀𝐍𝐃𝐎𝐌 〕⬣\n` +
                        `┃ [${i + 1}/${selected.length}] Procesando: ${tagToName(charTag)}\n` +
                        `╰━━━━━━━━━━━━━━━━⬣\n\n` +
                        `╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`
                    );

                    const result = await descargarPersonaje(charTag);
                    if (result > 0) {
                        totalAgregados += result;
                        resultados.push(`┃ ✅ *${tagToName(charTag)}* — +${result} nuevas`);
                    } else {
                        totalSaltados++;
                        resultados.push(`┃ ❌ *${tagToName(charTag)}* — omitida`);
                    }
                    await sleep(800);
                }

                await ctx.reply(
                    `╭〔 🏁 𝐆𝐄𝐍𝐑𝐀𝐍𝐃𝐎𝐌 𝐂𝐎𝐌𝐏𝐋𝐄𝐓𝐀𝐃𝐎 〕⬣\n` +
                    `┃\n` +
                    `${resultados.join('\n')}\n` +
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