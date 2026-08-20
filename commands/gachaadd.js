// commands/gachaadd.js
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

// ============================================================
// COMANDO GACHAADD
// ============================================================

export default {
    nombre: 'gachaadd',
    categoria: 'Diversión',
    alias: ['addgacha', 'agregar'],
    descripcion: 'Agrega una foto al gacha respondiendo a un mensaje.',
    ejecutar: async ({ msg, responder, sock }) => {
        try {
            // 1. Verificar que se haya respondido a un mensaje
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quotedMsg) {
                await responder.texto(
                    `❌ *GACHAADD*\n\n` +
                    `Responde a una foto con *.gachaadd* para agregarla al gacha.`
                );
                return;
            }

            // 2. Verificar que sea una imagen
            const imageMsg = quotedMsg.imageMessage;
            if (!imageMsg) {
                await responder.texto('❌ Eso no es una foto. Responde a una imagen.');
                return;
            }

            // 3. Obtener el buffer de la imagen
            const quotedId = msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
            const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
            
            let buffer;
            try {
                buffer = await sock.downloadMediaMessage({
                    key: {
                        remoteJid: msg.key.remoteJid,
                        id: quotedId,
                        participant: quotedParticipant,
                        fromMe: false
                    },
                    message: quotedMsg
                });
            } catch (err) {
                console.error('[GACHAADD] Error descargando:', err);
                await responder.texto('❌ No se pudo descargar la foto del mensaje.');
                return;
            }

            if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
                await responder.texto('❌ La imagen está vacía o es inválida.');
                return;
            }

            // 4. Guardar la imagen en media/gacha/
            const fileName = `gacha_${Date.now()}.jpg`;
            const filePath = path.join(GACHA_IMG_DIR, fileName);
            fs.writeFileSync(filePath, buffer);

            // 5. Registrar en gacha.json
            const gachaData = cargarDatosGacha();
            const valor = Math.floor(Math.random() * (8000 - 3000 + 1) + 3000);
            gachaData[fileName] = {
                nombre: `Carta ${Date.now()}`,
                genero: 'Desconocido',
                serie: 'Manual',
                valor: valor
            };
            guardarDatosGacha(gachaData);

            // 6. Mensaje de confirmación
            const respuesta = `
╭〔 ✅ 𝐆𝐀𝐂𝐇𝐀 𝐀𝐆𝐑𝐄𝐆𝐀𝐃Ａ 〕⬣
┃
┃ 📁 Archivo: ${fileName}
┃
┃ 💾 Guardado en media/gacha/
┃
┃ 📝 Registrado en gacha.json
┃
┃ 💴 Valor: ${valor} monedas
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣
`;
            await responder.texto(respuesta);

        } catch (error) {
            console.error('[GACHAADD] Error:', error);
            await responder.texto('❌ Error al agregar la foto al gacha.');
        }
    }
};