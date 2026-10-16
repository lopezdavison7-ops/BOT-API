import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { setDesc } from '../../database/perfiles.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RUTA_PERFILES = path.join(__dirname, '..', '..', 'database', 'perfiles.json');

function leerPerfiles() {
    try {
        const data = fs.readFileSync(RUTA_PERFILES, 'utf8');
        return JSON.parse(data);
    } catch {
        return {};
    }
}

function guardarPerfil(db) {
    fs.mkdirSync(path.dirname(RUTA_PERFILES), { recursive: true });
    fs.writeFileSync(RUTA_PERFILES, JSON.stringify(db, null, 2), 'utf8');
}

export default {
    nombre: 'setpasatiempo',
    categoria: 'Perfil',
    alias: ['sethobby', 'pasatiempo', 'hobby'],
    descripcion: 'Establece tu pasatiempo en tu perfil.',

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        const sender = msg.key.participant || msg.key.remoteJid;
        const input = String(argumento || '').trim();
        const db = leerPerfiles();

        const pasatiemposDisponibles = [
            '📚 Leer', '✍️ Escribir', '🎤 Cantar', '💃 Bailar', '🎮 Jugar', 
            '🎨 Dibujar', '🍳 Cocinar', '✈️ Viajar',
'📚 Leer', '🏊 Nadar', '📸 Fotografía',
            '🎧 Escuchar música', '🏀 Deportes', '🎬 Ver películas', '🌿 Jardinería',
            '🧵 Manualidades', '🎲 Juegos de mesa', '🏋️‍♂️ Gimnasio', '🚴 Ciclismo',
            '🎯 Tiro con arco', '🍵 Ceremonia del té', '🧘‍♂️ Meditación', '🎪 Malabares',
            '🛠️ Bricolaje', '🎹 Tocar instrumentos', '🐶 Cuidar mascotas', '🌌 Astronomía',
            '♟️ Ajedrez', '🍷 Catación de vinos', '🛍️ Compras', '🏕️ Acampar',
            '🎣 Pescar', '📱 Tecnología', '🎭 Teatro', '🍽️ Gastronomía', '🏺 Coleccionar',
            '✂️ Costura', '🧁 Repostería', '📝 Blogging', '🚗 Automóviles', '🧩 Rompecabezas',
            '🎳 Bolos', '🏄 Surf', '⛷️ Esquí', '🎿 Snowboard', '🤿 Buceo', '🏹 Tiro al blanco',
            '🧭 Orientación', '🏇 Equitación', '🎨 Pintura', '📊 Invertir', '🌡️ Meteorología',
            '🔍 Investigar', '💄 Maquillaje', '💇‍♂️ Peluquería', '🛌 Dormir', '🍺 Cervecería',
            '🪓 Carpintería', '🧪 Experimentos', '📻 Radioafición', '🗺️ Geografía', '💎 Joyería',
            'Otro 🌟'
        ];

        if (!input) {
            let lista = '╭━━〔 🎯 𝐏𝐀𝐒𝐀𝐓𝐈𝐄𝐌𝐏𝐎𝐒 〕━━⬣\n┃\n';
            pasatiemposDisponibles.forEach((pasatiempo, index) => {
                lista += `┃ ${index + 1}) ${pasatiempo}\n`;
            });
            lista += '┃\n';
            lista += '┃ 💡 Ejemplos:\n';
            lista += '┃ › .setpasatiempo 1\n';
            lista += '┃ › .setpasatiempo Leer\n';
            lista += '┃ › .setpasatiempo "Otro 🌟"\n';
            lista += '╰━━━━━━━━━━━━━━━━⬣';
            
            return await responder.texto(lista);
        }

        let pasatiempoSeleccionado = '';

        // Si el usuario envía un número
        if (/^\d+$/.test(input)) {
            const index = parseInt(input) - 1;
            if (index >= 0 && index < pasatiemposDisponibles.length) {
                pasatiempoSeleccionado = pasatiemposDisponibles[index];
            } else {
                return await responder.texto(`❌ Número inválido. Selecciona un número entre 1 y ${pasatiemposDisponibles.length}.`);
            }
        } else {
            // Si el usuario envía texto (búsqueda flexible)
            const inputLimpio = input.replace(/[^\w\s]/g, '').toLowerCase().trim();
            const encontrado = pasatiemposDisponibles.find(p => 
                p.replace(/[^\w\s]/g, '').toLowerCase().includes(inputLimpio)
            );

            if (encontrado) {
                pasatiempoSeleccionado = encontrado;
            } else {
                return await responder.texto('❌ Pasatiempo no encontrado. Usa el comando sin argumentos para ver la lista disponible.');
            }
        }

        // Inicializar perfil del usuario si no existe
        if (!db[sender]) {
            db[sender] = {};
        }

        // Verificar si ya tiene ese pasatiempo
        if (db[sender].pasatiempo === pasatiempoSeleccionado) {
            return await responder.texto(`⚠️ Ya tienes establecido este pasatiempo: *${pasatiempoSeleccionado}*`);
        }

        // Guardar en la base de datos
        db[sender].pasatiempo = pasatiempoSeleccionado;
        guardarPerfil(db);

        return await responder.texto(
            '╭━━〔 ✅ 𝐏𝐀𝐒𝐀𝐓𝐈𝐄𝐌𝐏𝐎 𝐄𝐒𝐓𝐀𝐁𝐋𝐄𝐂𝐈𝐃𝐎 〕━━⬣\n' +
            '┃\n' +
            `┃ ✨ Se ha establecido tu pasatiempo:\n` +
            `┃ 🎯 *${pasatiempoSeleccionado}*\n` +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━⬣'
        );
    }
};