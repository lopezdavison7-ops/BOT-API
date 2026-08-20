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
// LISTA DE ANIMES POPULARES (Seed)
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

// ============================================================
// DESCARGA DE IMÁGENES Y REGISTRO
// ============================================================

async function descargarYRegistrar(url, nombreArchivo, gachaData) {
    try {
        const response = await fetch(url);
        if (!response.ok) return false;
        const buffer = await response.buffer();
        const ruta = path.join(GACHA_IMG_DIR, nombreArchivo);
        fs.writeFileSync(ruta, buffer);
        return true;
    } catch {
        return false;
    }
}

// ============================================================
// MOTOR DE SCRAPING DE KONACHAN
// ============================================================

async function scrapearAnime(anime, limite = 100) {
    try {
        const url = `https://konachan.net/post.json?limit=${limite}&tags=${encodeURIComponent(anime)}+rating:safe&order:random`;
        const response = await fetch(url);
        if (!response.ok) return { anime, nuevos: 0, saltados: 0, total: 0 };
        
        const data = await response.json();
        if (!data || data.length === 0) return { anime, nuevos: 0, saltados: 0, total: 0 };

        const gachaData = cargarDatosGacha();
        let nuevos = 0;
        let saltados = 0;

        for (const img of data) {
            if (!img.file_url) continue;
            
            const nombreArchivo = `gacha_${Date.now()}_${anime.replace(/\s/g, '_')}.jpg`;
            const exito = await descargarYRegistrar(img.file_url, nombreArchivo, gachaData);
            
            if (exito) {
                // Registrar en gacha.json
                gachaData[nombreArchivo] = {
                    nombre: anime,
                    genero: 'Desconocido',
                    serie: anime,
                    valor: Math.floor(Math.random() * 100) + 1
                };
                nuevos++;
            } else {
                saltados++;
            }
        }

        guardarDatosGacha(gachaData);
        return { anime, nuevos, saltados, total: data.length };
    } catch (error) {
        console.error(`[SCRAPER] Error en ${anime}:`, error.message);
        return { anime, nuevos: 0, saltados: 0, total: 0 };
    }
}

// ============================================================
// COMANDO GENRANDOM
// ============================================================

export default {
    nombre: 'genrandom',
    categoria: 'Diversión',
    alias: ['gr', 'gachaadd'],
    descripcion: 'Scrapea 5 animes aleatorios de Konachan y los agrega al gacha.',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {
            const mensajeInicial = `
╭〔 🎲 𝐆𝐄𝐍𝐑𝐀𝐍𝐃𝐎𝐌 〕⬣
┃
┃ 📦 INICIANDO SCRAPEO
┃
┃ ⏳ Buscando 5 animes al azar...
┃
┃ 🌐 konachan.net — Esto tardará varios minutos.
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣
`;
            const sentMsg = await sock.sendMessage(msg.key.remoteJid, { text: mensajeInicial }, { quoted: msg });
            const messageId = sentMsg.key.id;

            // 2. Seleccionar 5 animes aleatorios
            const animesSeleccionados = [];
            const copia = [...ANIME_LIST];
            for (let i = 0; i < 5; i++) {
                if (copia.length === 0) break;
                const index = Math.floor(Math.random() * copia.length);
                animesSeleccionados.push(copia[index]);
                copia.splice(index, 1);
            }

            const resultados = [];
            let totalNuevos = 0;
            let totalSaltados = 0;

            // 3. Scrapear cada anime
            for (let i = 0; i < animesSeleccionados.length; i++) {
                const anime = animesSeleccionados[i];

                // 📦 Procesando
                const textoProcesando = `
╭〔 📦 𝐆𝐄𝐍𝐑𝐀𝐍𝐃𝐎𝐌 〕⬣
┃
┃ 🔄 Procesando...
┃
┃ [${i + 1}/5] ${anime}
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣
`;
                await sock.sendMessage(msg.key.remoteJid, {
                    text: textoProcesando,
                    edit: {
                        key: {
                            remoteJid: msg.key.remoteJid,
                            fromMe: true,
                            id: messageId
                        }
                    }
                });

                // Ejecutar el scrapeo
                const resultado = await scrapearAnime(anime, 100);
                resultados.push(resultado);
                totalNuevos += resultado.nuevos;
                totalSaltados += resultado.saltados;

                // 🔍 Analizando
                const textoAnalizando = `
╭〔 🔍 𝐆𝐄𝐍𝐑𝐀𝐍𝐃𝐎𝐌 〕⬣
┃
┃ 🔎 Analizando "${anime}"...
┃
┃ > ${resultado.total} posts encontrados
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣
`;
                await sock.sendMessage(msg.key.remoteJid, {
                    text: textoAnalizando,
                    edit: {
                        key: {
                            remoteJid: msg.key.remoteJid,
                            fromMe: true,
                            id: messageId
                        }
                    }
                });

                await sleep(1500);
            }

            // 4. Mensaje final (Resumen detallado)
            let resumen = '';
            resultados.forEach(r => {
                resumen += `┃ ✅ *${r.anime}* — ${r.nuevos} nuevos, ${r.saltados} saltados (${r.total} posts)\n`;
            });

            const mensajeFinal = `
╭〔 🏁 𝐆𝐄𝐍𝐑𝐀𝐍𝐃𝐎𝐌 𝐂𝐎𝐌𝐏𝐋𝐄𝐓𝐀𝐃𝐎 〕⬣
┃
┃ ${resumen}
┃
┃ 👥 Total agregados: *${totalNuevos}* — ⏭️ Total saltados: *${totalSaltados}*
┃
┃ 💾 Base de datos actualizada en gacha.json
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣
`;

            await sock.sendMessage(msg.key.remoteJid, {
                text: mensajeFinal,
                edit: {
                    key: {
                        remoteJid: msg.key.remoteJid,
                        fromMe: true,
                        id: messageId
                    }
                }
            });

        } catch (error) {
            console.error('[GENRANDOM] Error:', error);
            await responder.texto('❌ Error al ejecutar genrandom.');
        }
    }
};