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
// LISTA DE ANIMES PARA NEKOS.BEST
// ============================================================

const ANIME_LIST = [
    'Naruto', 'Bleach', 'One Piece', 'Sword Art Online', 'Clannad',
    'My Hero Academia', 'Demon Slayer', 'Jujutsu Kaisen', 'Fullmetal Alchemist',
    'Tokyo Ghoul', 'Code Geass', 'Steins;Gate', 'K-On!', 'Toradora!',
    'Fate/stay night', 'Angel Beats!', 'Madoka Magica', 'One Punch Man',
    'Attack on Titan', 'Hunter x Hunter', 'Dragon Ball Z', 'Death Note'
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
// OBTENER IMAGEN DESDE NEKOS.BEST
// ============================================================

async function obtenerImagenNekos() {
    try {
        // API que siempre funciona y devuelve imágenes de anime
        const url = 'https://nekos.best/api/v2/neko';
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return null;
        const data = await res.json();
        if (!data || !data.results || data.results.length === 0) return null;
        return data.results[0].url;
    } catch {
        return null;
    }
}

// ============================================================
// AGREGAR IMAGEN AL GACHA
// ============================================================

async function agregarImagenAlGacha(animeName) {
    try {
        const url = await obtenerImagenNekos();
        if (!url) return false;

        const imgRes = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!imgRes.ok) return false;
        const buffer = await imgRes.buffer();
        
        const fileName = `gacha_${Date.now()}_${animeName.replace(/\s/g, '_')}.jpg`;
        fs.writeFileSync(path.join(GACHA_IMG_DIR, fileName), buffer);

        const gachaData = cargarDatosGacha();
        const valor = Math.floor(Math.random() * (8000 - 3000 + 1) + 3000);
        gachaData[fileName] = {
            nombre: tagToName(animeName),
            genero: 'Desconocido',
            serie: animeName,
            valor: valor
        };
        guardarDatosGacha(gachaData);
        return true;
    } catch {
        return false;
    }
}

// ============================================================
// COMANDO GENRANDOM
// ============================================================

export default {
    nombre: 'genrandom',
    categoria: 'Diversión',
    alias: ['genchar', 'gr'],
    descripcion: 'Genera cartas desde nekos.best (sin bloqueos)',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {
            const ctx = {
                reply: async (text) => {
                    await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
                },
                args: argumento ? argumento.trim().split(/\s+/) : []
            };

            await ctx.reply(
                `╭〔 🎲 𝐆𝐄𝐍𝐑𝐀𝐍𝐃𝐎𝐌 〕⬣\n` +
                `┃ Buscando 5 animes al azar...\n` +
                `┃\n` +
                `┃ > nekos.best — Conexión estable.\n` +
                `╰━━━━━━━━━━━━━━━━⬣\n\n` +
                `╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`
            );

            const shuffled = ANIME_LIST.sort(() => Math.random() - 0.5);
            const selected = shuffled.slice(0, 5);

            let totalAgregados = 0;
            let resultados = [];

            for (let i = 0; i < selected.length; i++) {
                const anime = selected[i];

                await ctx.reply(
                    `╭〔 📦 𝐆𝐄𝐍𝐑𝐀𝐍𝐃𝐎𝐌 〕⬣\n` +
                    `┃ [${i + 1}/${selected.length}] Procesando: ${anime}\n` +
                    `╰━━━━━━━━━━━━━━━━⬣\n\n` +
                    `╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`
                );

                const exito = await agregarImagenAlGacha(anime);
                if (exito) {
                    totalAgregados++;
                    resultados.push(`┃ ✅ *${anime}* — +1 nueva`);
                } else {
                    resultados.push(`┃ ❌ *${anime}* — omitida`);
                }
                await sleep(800);
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

        } catch (error) {
            console.error('[GENRANDOM] Error:', error);
            await responder.texto('❌ Error en genrandom.');
        }
    }
};