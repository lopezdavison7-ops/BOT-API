import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RUTA_CONFIG = path.join(__dirname, '..', '..', 'database', 'config.json');

function leerConfig() {
    try {
        if (!fs.existsSync(RUTA_CONFIG)) return { prefijo: '.' };
        return JSON.parse(fs.readFileSync(RUTA_CONFIG, 'utf8'));
    } catch {
        return { prefijo: '.' };
    }
}

function guardarConfig(config) {
    fs.mkdirSync(path.dirname(RUTA_CONFIG), { recursive: true });
    fs.writeFileSync(RUTA_CONFIG, JSON.stringify(config, null, 2), 'utf8');
}

const PREFIJOS_DISPONIBLES = [
    { id: 1, simbolo: '.', nombre: 'Punto', emoji: '⚫' },
    { id: 2, simbolo: '!', nombre: 'Exclamación', emoji: '❗' },
    { id: 3, simbolo: '#', nombre: 'Hashtag', emoji: '#️⃣' },
    { id: 4, simbolo: '/', nombre: 'Barra', emoji: '➗' },
    { id: 5, simbolo: '$', nombre: 'Dólar', emoji: '💲' },
    { id: 6, simbolo: '%', nombre: 'Porcentaje', emoji: '💯' },
    { id: 7, simbolo: '&', nombre: 'Ampersand', emoji: '🔗' },
    { id: 8, simbolo: '*', nombre: 'Asterisco', emoji: '⭐' },
    { id: 9, simbolo: '+', nombre: 'Más', emoji: '➕' },
    { id: 10, simbolo: '-', nombre: 'Menos', emoji: '➖' },
    { id: 11, simbolo: '=', nombre: 'Igual', emoji: '⚖️' },
    { id: 12, simbolo: '?', nombre: 'Interrogación', emoji: '❓' },
    { id: 13, simbolo: '@', nombre: 'Arroba', emoji: '📧' },
    { id: 14, simbolo: '^', nombre: 'Caret', emoji: '🔼' },
    { id: 15, simbolo: '~', nombre: 'Tilde', emoji: '🌊' },
    { id: 16, simbolo: '°', nombre: 'Grado', emoji: '🌡️' }
];

export default {
    nombre: 'setprefix',
    categoria: 'owner',
    alias: ['cambiarprefix', 'setprefijo', 'prefijo', 'changeprefix'],
    descripcion: 'Cambia el prefijo del bot',
    uso: '.setprefix <número> | .setprefix <símbolo> | .setprefix reset',
    soloOwner: true,

    ejecutar: async ({ sock, msg, argumento, responder }) => {
        const input = String(argumento || '').trim();

        if (!input) {
            let lista = '╭━━〔 ⚙️ 𝐒𝐄𝐓 𝐏𝐑𝐄𝐅𝐈𝐗 〕━━⬣\n';
            lista += '┃\n';
            lista += '┃ *Prefijos disponibles:*\n';
            lista += '┃\n';
            PREFIJOS_DISPONIBLES.forEach(p => {
                lista += `┃ ${p.emoji} *${p.id}.* \`${p.simbolo}\` - ${p.nombre}\n`;
            });
            lista += '┃\n';
            lista += '┣━━〔 💡 𝐔𝐒𝐎 〕━━⬣\n';
            lista += '┃\n';
            lista += '┃ 📲 Por número: .setprefix 2\n';
            lista += '┃ ✏️ Por símbolo: .setprefix !\n';
            lista += '┃ 🔄 Resetear: .setprefix reset\n';
            lista += '┃\n';
            lista += '┃ 📍 Prefijo actual: *' + leerConfig().prefijo + '*\n';
            lista += '┃\n';
            lista += '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';
            return await responder.texto(lista);
        }

        if (input.toLowerCase() === 'reset') {
            const config = leerConfig();
            config.prefijo = '.';
            guardarConfig(config);
            return await responder.texto(
                '╭━━〔 ✅ 𝐑𝐄𝐒𝐄𝐓𝐄𝐀𝐃𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ ⚫ Prefijo restaurado a: `.`\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        let nuevoPrefijo = null;

        if (/^\d+$/.test(input)) {
            const num = parseInt(input);
            const encontrado = PREFIJOS_DISPONIBLES.find(p => p.id === num);
            if (!encontrado) {
                return await responder.texto(
                    '╭━━〔 ❌ 𝐈𝐍𝐕𝐀𝐋𝐈𝐃𝐎 〕━━⬣\n' +
                    '┃\n' +
                    '┃ ⚠️ Número no válido\n' +
                    '┃ 💡 Usa un número del 1 al 16\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            }
            nuevoPrefijo = encontrado.simbolo;
        } else {
            if (input.length > 3) {
                return await responder.texto(
                    '╭━━〔 ❌ 𝐌𝐔𝐘 𝐋𝐀𝐑𝐆𝐎 〕━━⬣\n' +
                    '┃\n' +
                    '┃ ⚠️ El prefijo máximo es 3 caracteres\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            }
            if (/^[a-zA-Z0-9\s]$/.test(input)) {
                return await responder.texto(
                    '╭━━〔 ⚠️ 𝐍𝐎 𝐑𝐄𝐂𝐎𝐌𝐄𝐍𝐃𝐀𝐃𝐎 〕━━⬣\n' +
                    '┃\n' +
                    '┃ ⚠️ Evita letras/números como prefijo\n' +
                    '┃ 💡 Usa símbolos especiales\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            }
            nuevoPrefijo = input;
        }

        const config = leerConfig();
        const prefijoAnterior = config.prefijo;
        config.prefijo = nuevoPrefijo;
        guardarConfig(config);

        const prefijoInfo = PREFIJOS_DISPONIBLES.find(p => p.simbolo === nuevoPrefijo);
        const nombrePrefijo = prefijoInfo ? prefijoInfo.nombre : 'Personalizado';
        const emojiPrefijo = prefijoInfo ? prefijoInfo.emoji : '✨';

        await responder.texto(
            '╭━━〔 ✅ 𝐏𝐑𝐄𝐅𝐈𝐗 𝐂𝐀𝐌𝐁𝐈𝐀𝐃𝐎 〕━━⬣\n' +
            '┃\n' +
            '┃ ' + emojiPrefijo + ' *Nuevo prefijo:* `' + nuevoPrefijo + '`\n' +
            '┃ 📝 Nombre: ' + nombrePrefijo + '\n' +
            '┃ 🔄 Cambiado de: `' + prefijoAnterior + '` → `' + nuevoPrefijo + '`\n' +
            '┃\n' +
            '┃ ⚠️ *IMPORTANTE:*\n' +
            '┃ Reinicia el bot para aplicar\n' +
            '┃ el cambio completamente\n' +
            '┃\n' +
            '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
        );

        console.log(`[SETPREFIX] Guardado en: ${RUTA_CONFIG}`);
        console.log(`[SETPREFIX] Prefijo cambiado: ${prefijoAnterior} → ${nuevoPrefijo}`);
    }
};