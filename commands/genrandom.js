// commands/genrandom.js
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GACHA_IMG_DIR = path.join(__dirname, '../media/gacha');
const GACHA_DATABASE = path.join(__dirname, '../database/gacha.json');

// Asegurar que la carpeta exista
if (!fs.existsSync(GACHA_IMG_DIR)) {
    fs.mkdirSync(GACHA_IMG_DIR, { recursive: true });
}

// ============================================================
// LISTA DE ANIMES POPULARES
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

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================
// CARGAR / GUARDAR JSON DE GACHA
// ============================================================

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
// DESCARGAR Y GUARDAR IMAGEN
// ============================================================

async function descargarImagen(url, nombreArchivo) {
    const response = await fetch(url);
    const buffer = await response.buffer();
    const ruta = path.join(GACHA_IMG_DIR, nombreArchivo);
    fs.writeFileSync(ruta, buffer);
    return ruta;
}

// ============================================================
// BUSCAR IMÁGENES EN KONACHAN Y AGREGARLAS AL GACHA
// ============================================================

async function procesarAnime(anime, cantidad = 3) {
    try {
        const url = `https://konachan.net/post.json?limit=${cantidad}&tags=${encodeURIComponent(anime)}+rating:safe&order=random`;
        const response = await fetch(url);
        const data = await response.json();

        if (!data || data.length === 0) return { anime, agregadas: 0, imagenes: [] };

        const gachaData = cargarDatosGacha();
        let agregadas = 0;

        for (const img of data) {
            if (!img.file_url) continue;

            const nombreArchivo = `gacha_${Date.now()}_${anime.replace(/\s/g, '_')}.jpg`;
            try {
                await descargarImagen(img.file_url, nombreArchivo);
                
                // Registrar en gacha.json
                gachaData[nombreArchivo] = {
                    nombre: anime,
                    genero: 'Desconocido',
                    serie: anime,
                    valor: Math.floor(Math.random() * 100) + 1
                };
                agregadas++;
            } catch (e) {
                console.error(`Error descargando imagen de ${anime}:`, e);
            }
        }

        guardarDatosGacha(gachaData);
        return { anime, agregadas, imagenes: data };
    } catch (error) {
        console.error(`Error procesando ${anime}:`, error);
        return { anime, agregadas: 0, imagenes: [] };
    }
}

// ============================================================
// COMANDO GENRANDOM
// ============================================================

export default {
    nombre: 'genrandom',
    categoria: 'Diversión',
    alias: ['gr', 'gachaadd'],
    descripcion: 'Descarga y agrega imágenes de animes al sistema de cartas .rw',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {
            const cantidadAnimes = 3; // Cuántos animes procesar
            const imagenesPorAnime = 2; // Cuántas imágenes por anime

            // 1. Mensaje inicial
            const mensajeInicial = `
╭〔 🎲 𝐆𝐄𝐍𝐑𝐀𝐍𝐃𝐎𝐌 〕⬣
┃
┃ 📦 INICIANDO DESCARGA
┃
┃ ⏳ Buscando ${cantidadAnimes} animes...
┃
┃ ⚡ Descargando ${imagenesPorAnime} imágenes por anime
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣
`;
            const sentMsg = await sock.sendMessage(msg.key.remoteJid, { text: mensajeInicial }, { quoted: msg });
            const messageId = sentMsg.key.id;

            // 2. Seleccionar animes aleatorios
            const animesSeleccionados = [];
            const copia = [...ANIME_LIST];
            for (let i = 0; i < cantidadAnimes; i++) {
                const index = Math.floor(Math.random() * copia.length);
                animesSeleccionados.push(copia[index]);
                copia.splice(index, 1);
            }

            const resultados = [];
            let totalAgregadas = 0;

            // 3. Procesar cada anime
            for (let i = 0; i < animesSeleccionados.length; i++) {
                const anime = animesSeleccionados[i];

                // Mensaje de progreso: Buscando
                const textoBuscando = `
╭〔 📦 𝐆𝐄𝐍𝐑𝐀𝐍𝐃𝐎𝐌 〕⬣
┃
┃ 🔄 Procesando...
┃
┃ [${i + 1}/${cantidadAnimes}] Buscando: ${anime}
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣
`;
                await sock.sendMessage(msg.key.remoteJid, {
                    text: textoBuscando,
                    edit: {
                        key: {
                            remoteJid: msg.key.remoteJid,
                            fromMe: true,
                            id: messageId
                        }
                    }
                });

                await sleep(1500);

                // Procesar y descargar
                const resultado = await procesarAnime(anime, imagenesPorAnime);
                resultados.push(resultado);
                totalAgregadas += resultado.agregadas;

                // Mensaje de progreso: Analizando/Descargando
                const textoAnalizando = `
╭〔 🔍 𝐆𝐄𝐍𝐑𝐀𝐍𝐃𝐎𝐌 〕⬣
┃
┃ 🔎 Analizando...
┃
┃ [${i + 1}/${cantidadAnimes}] "${anime}"
┃
┃ > ${resultado.agregadas} imágenes agregadas
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

                await sleep(1000);
            }

            // 4. Mensaje final con resumen
            let resumen = '';
            resultados.forEach(r => {
                resumen += `┃ ✅ *${r.anime}* — +${r.agregadas} cartas nuevas\n`;
            });

            const mensajeFinal = `
╭〔 🏁 𝐆𝐄𝐍𝐑𝐀𝐍𝐃𝐎𝐌 𝐂𝐎𝐌𝐏𝐋𝐄𝐓𝐀𝐃𝐎 〕⬣
┃
┃ ${resumen}
┃
┃ 📦 Total de cartas agregadas: ${totalAgregadas}
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