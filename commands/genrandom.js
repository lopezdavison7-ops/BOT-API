// commands/genrandom.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GACHA_IMG_DIR = path.join(__dirname, '../media/gacha');
const GACHA_DATABASE = path.join(__dirname, '../database/gacha.json');

// ============================================================
// FUNCIONES AUXILIARES
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

function tagToName(tag) {
    return tag.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

// ============================================================
// OBTENER IMÁGENES LOCALES
// ============================================================

function obtenerImagenesLocales() {
    const files = fs.readdirSync(GACHA_IMG_DIR).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
    if (files.length === 0) return [];
    return files;
}

// ============================================================
// COMANDO GENRANDOM (SOLO LOCAL)
// ============================================================

export default {
    nombre: 'genrandom',
    categoria: 'Diversión',
    alias: ['gr'],
    descripcion: 'Registra imágenes locales en el gacha.',
    ejecutar: async ({ msg, responder, sock }) => {
        try {
            const ctx = {
                reply: async (text) => {
                    await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
                }
            };

            await ctx.reply(
                `╭〔 🎲 𝐆𝐄𝐍𝐑𝐀𝐍𝐃𝐎𝐌 〕⬣\n` +
                `┃ Buscando imágenes locales...\n` +
                `┃\n` +
                `┃ > Carpeta: media/gacha/\n` +
                `╰━━━━━━━━━━━━━━━━⬣\n\n` +
                `╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`
            );

            const imagenes = obtenerImagenesLocales();
            if (imagenes.length === 0) {
                await ctx.reply(
                    `╭〔 ❌ 𝐆𝐄𝐍𝐑𝐀𝐍𝐃𝐎𝐌 〕⬣\n` +
                    `┃ No hay imágenes en media/gacha/\n` +
                    `┃\n` +
                    `┃ > Agrega imágenes manualmente.\n` +
                    `╰━━━━━━━━━━━━━━━━⬣\n\n` +
                    `╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`
                );
                return;
            }

            // Elegir 5 imágenes aleatorias
            const shuffled = imagenes.sort(() => Math.random() - 0.5);
            const selected = shuffled.slice(0, 5);

            const gachaData = cargarDatosGacha();
            let totalAgregados = 0;
            let resultados = [];

            for (let i = 0; i < selected.length; i++) {
                const img = selected[i];
                const name = `Carta Local ${i + 1}`;
                const valor = Math.floor(Math.random() * (8000 - 3000 + 1) + 3000);

                // Verificar si ya existe
                if (!gachaData[img]) {
                    gachaData[img] = {
                        nombre: name,
                        genero: 'Desconocido',
                        serie: 'Local',
                        valor: valor
                    };
                    totalAgregados++;
                    resultados.push(`┃ ✅ *${name}* — registrada`);
                } else {
                    resultados.push(`┃ ⏭️ *${name}* — ya existía`);
                }
            }

            guardarDatosGacha(gachaData);

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