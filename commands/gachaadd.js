// commands/gachaadd.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';

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
// FUNCIÓN PARA DESCARGAR LA IMAGEN (INFALIBLE)
// ============================================================

async function descargarImagen(quotedMsg) {
    try {
        if (!quotedMsg?.imageMessage) return null;

        // Obtener el stream de la imagen
        const stream = await downloadContentFromMessage(quotedMsg.imageMessage, 'image');
        if (!stream) return null;

        // Convertir stream a buffer
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        
        if (!buffer || buffer.length === 0) return null;
        return buffer;
    } catch (error) {
        console.error('[GACHAADD] Error descargando imagen:', error);
        return null;
    }
}

// ============================================================
// COMANDO GACHAADD
// ============================================================

export default {
    nombre: 'gachaadd',
    categoria: 'Diversión',
    alias: ['addgacha', 'agregar'],
    descripcion: 'Agrega una foto al gacha con nombre, género y precio.',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {
            // 1. Verificar que se haya respondido a un mensaje
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quotedMsg) {
                await responder.texto(
                    `❌ *GACHAADD*\n\n` +
                    `Responde a una foto con *.gachaadd nombre|género|precio*\n\n` +
                    `📌 Ejemplo:\n` +
                    `*.gachaadd Naruto|Masculino|5000*\n\n` +
                    `💡 Si no pones nada, se asignarán valores automáticos.`
                );
                return;
            }

            // 2. Verificar que sea una imagen
            const imageMsg = quotedMsg.imageMessage;
            if (!imageMsg) {
                await responder.texto('❌ Eso no es una foto. Responde a una imagen.');
                return;
            }

            // 3. Descargar la imagen usando el método infalible
            const buffer = await descargarImagen(quotedMsg);
            if (!buffer) {
                await responder.texto('❌ No se pudo descargar la foto. Asegúrate de que sea una imagen válida.');
                return;
            }

            // 4. Guardar la imagen en media/gacha/
            const fileName = `gacha_${Date.now()}.jpg`;
            const filePath = path.join(GACHA_IMG_DIR, fileName);
            fs.writeFileSync(filePath, buffer);

            // 5. Procesar los datos ingresados (nombre, género, precio)
            let nombre = `Carta ${Date.now()}`;
            let genero = 'Desconocido';
            let valor = Math.floor(Math.random() * (8000 - 3000 + 1) + 3000);

            const args = String(argumento || '').trim();
            if (args) {
                const partes = args.split('|').map(p => p.trim());
                if (partes.length >= 1 && partes[0]) nombre = partes[0];
                if (partes.length >= 2 && partes[1]) genero = partes[1];
                if (partes.length >= 3 && partes[2]) {
                    const precio = parseInt(partes[2]);
                    if (!isNaN(precio) && precio > 0) valor = precio;
                }
            }

            // 6. Registrar en gacha.json
            const gachaData = cargarDatosGacha();
            gachaData[fileName] = {
                nombre: nombre,
                genero: genero,
                serie: 'Manual',
                valor: valor
            };
            guardarDatosGacha(gachaData);

            // 7. Mensaje de confirmación
            const respuesta = `
╭〔 ✅ 𝐆𝐀𝐂𝐇𝐀 𝐀𝐆𝐑𝐄𝐆𝐀𝐃Ａ 〕⬣
┃
┃ 🖼️ Archivo: ${fileName}
┃
┃ 📝 Nombre: ${nombre}
┃
┃ ⚥ Género: ${genero}
┃
┃ 💴 Precio: ${valor} monedas
┃
┃ 💾 Guardado en media/gacha/ y gacha.json
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