// commands/utils/sms.js
// ============================================================
// BOT-API — SMS VIRTUAL (API Gohan)
// Obtiene números temporales y verifica SMS recibidos
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import fetch from 'node-fetch';

const API_BASE = 'https://api-gohan-v1.onrender.com';
const RUTA_DB = path.join(process.cwd(), 'database', 'smsUsers.json');

// ───────────── BASE DE DATOS ─────────────
function leerDB() {
    try {
        if (!fs.existsSync(RUTA_DB)) return {};
        return JSON.parse(fs.readFileSync(RUTA_DB, 'utf8'));
    } catch {
        return {};
    }
}

function guardarDB(db) {
    fs.mkdirSync(path.dirname(RUTA_DB), { recursive: true });
    fs.writeFileSync(RUTA_DB, JSON.stringify(db, null, 2), 'utf8');
}

function jidANumero(jid) {
    return String(jid || '').split('@')[0].replace(/\D/g, '');
}

// ───────────── API FUNCTIONS ─────────────
async function getVirtualNumber() {
    const res = await fetch(`${API_BASE}/sms/number`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(20000)
    });

    if (!res.ok) throw new Error(`API respondió ${res.status}`);

    const data = await res.json();

    if (!data.status || !data.result) {
        throw new Error(data.message || 'API no devolvió número');
    }

    return data.result;
}

async function checkSMS(number) {
    const encoded = encodeURIComponent(number);
    const res = await fetch(`${API_BASE}/sms/check?number=${encoded}`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(20000)
    });

    if (!res.ok) throw new Error(`API respondió ${res.status}`);

    const data = await res.json();

    if (!data.status) {
        throw new Error(data.message || 'No se pudo verificar SMS');
    }

    return data.result || data.messages || [];
}

// ───────────── AYUDA ─────────────
function generarAyuda() {
    return (
        '╭━━〔 📱 𝐒𝐌𝐒 𝐕𝐈𝐑𝐓𝐔𝐀𝐋 〕━━⬣\n' +
        '┃\n' +
        '┃ 📋 Obtener un número temporal:\n' +
        '┃ ➪ .sms\n' +
        '┃ ➪ .sms new\n' +
        '┃ ➪ .sms get\n' +
        '┃\n' +
        '┃ 📥 Ver SMS recibidos:\n' +
        '┃ ➪ .sms check (usa tu último número)\n' +
        '┃ ➪ .sms check +1589908420\n' +
        '┃\n' +
        '┃ ⚠️ Los números duran 15-30 min\n' +
        '┃    y WhatsApp puede bloquearlos.\n' +
        '┃\n' +
        '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
    );
}

// ───────────── COMANDO ─────────────
export default {
    nombre: 'sms',
    categoria: 'utils',
    alias: ['virtualsms', 'tempsms', 'smsvirtual', 'numerovirtual', 'fakenumber'],
    descripcion: 'Obtén números virtuales temporales y verifica SMS recibidos.',
    uso: '.sms | .sms check [+número]',

    ejecutar: async ({ sock, msg, args, responder }) => {
        const subcomando = (args[0] || '').toLowerCase();
        const jid = msg.key.participant || msg.key.remoteJid;
        const numero = jidANumero(jid);

        try {
            // ───────────── MODO 1: OBTENER NÚMERO NUEVO ─────────────
            if (!subcomando || subcomando === 'new' || subcomando === 'get' || subcomando === 'numero') {
                await responder.texto('📡 Obteniendo número virtual...');

                const result = await getVirtualNumber();

                // Guardar en base de datos del usuario
                const db = leerDB();
                db[numero] = {
                    number: result.number,
                    country: result.country,
                    obtenido: Date.now(),
                    expira: result.expires_in
                };
                guardarDB(db);

                const smsCheckUrl = `${API_BASE}${result.sms_check}`;

                const texto =
                    '╭━━〔 📱 𝐒𝐌𝐒 𝐕𝐈𝐑𝐓𝐔𝐀𝐋 〕━━⬣\n' +
                    '┃\n' +
                    '┃ ✅ Número generado\n' +
                    '┃\n' +
                    '┃ 📞 *Número:*\n' +
                    '┃    ' + result.number + '\n' +
                    '┃\n' +
                    '┃ 🌎 País: *' + (result.country || 'Desconocido').toUpperCase() + '*\n' +
                    '┃ ⏱️ Expira en: *' + result.expires_in + '*\n' +
                    '┃ 📦 Fuente: ' + (result.source || 'temp-number') + '\n' +
                    '┃\n' +
                    '┣━━〔 💡 𝐔𝐒𝐎 〕━━⬣\n' +
                    '┃\n' +
                    '┃ 📥 Para ver SMS recibidos:\n' +
                    '┃ ➪ *.sms check*\n' +
                    '┃\n' +
                    '┃ ⚠️ ' + (result.warning || 'Número temporal') + '\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

                await responder.texto(texto);
                return;
            }

            // ───────────── MODO 2: VERIFICAR SMS ─────────────
            if (subcomando === 'check' || subcomando === 'ver' || subcomando === 'leer') {
                let targetNumber = args[1] || '';

                // Si no especificó número, usar el último guardado
                if (!targetNumber) {
                    const db = leerDB();
                    const userData = db[numero];

                    if (!userData || !userData.number) {
                        return await responder.texto(
                            '╭━━〔 ⚠️ 𝐒𝐈𝐍 𝐍𝐔𝐌𝐄𝐑𝐎 〕━━⬣\n' +
                            '┃\n' +
                            '┃ No tienes un número activo.\n' +
                            '┃\n' +
                            '┃ 💡 Primero obtén uno:\n' +
                            '┃ ➪ *.sms*\n' +
                            '┃\n' +
                            '┃ O especifica el número:\n' +
                            '┃ ➪ *.sms check +1589908420*\n' +
                            '┃\n' +
                            '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                        );
                    }

                    targetNumber = userData.number;
                }

                await responder.texto('📡 Verificando SMS de ' + targetNumber + '...');

                const mensajes = await checkSMS(targetNumber);

                if (!mensajes || !mensajes.length) {
                    return await responder.texto(
                        '╭━━〔 📭 𝐒𝐈𝐍 𝐌𝐄𝐍𝐒𝐀𝐉𝐄𝐒 〕━━⬣\n' +
                        '┃\n' +
                        '┃ 📞 Número: ' + targetNumber + '\n' +
                        '┃\n' +
                        '┃ 📭 No hay SMS recibidos aún.\n' +
                        '┃\n' +
                        '┃ 💡 Intenta de nuevo en unos\n' +
                        '┃    segundos si acabas de\n' +
                        '┃    enviar la verificación.\n' +
                        '┃\n' +
                        '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                    );
                }

                // Construir mensaje con los SMS
                let texto =
                    '╭━━〔 📬 𝐒𝐌𝐒 𝐑𝐄𝐂𝐈𝐁𝐈𝐃𝐎𝐒 〕━━⬣\n' +
                    '┃\n' +
                    '┃ 📞 Número: ' + targetNumber + '\n' +
                    '┃ 📊 Total: *' + mensajes.length + '* mensaje(s)\n' +
                    '┃\n';

                // Mostrar hasta 5 mensajes
                const maxShow = Math.min(mensajes.length, 5);
                for (let i = 0; i < maxShow; i++) {
                    const sms = mensajes[i];
                    const from = sms.from || sms.sender || 'Desconocido';
                    const body = sms.body || sms.message || sms.text || 'Sin contenido';
                    const time = sms.date || sms.time || sms.timestamp || '';

                    texto +=
                        '┣━━〔 📩 SMS #' + (i + 1) + ' 〕━━⬣\n' +
                        '┃ 👤 De: ' + from + '\n' +
                        (time ? '┃ 🕐 ' + time + '\n' : '') +
                        '┃ 💬 ' + body.slice(0, 200) + (body.length > 200 ? '...' : '') + '\n';
                }

                if (mensajes.length > 5) {
                    texto += '┃\n┃ … y ' + (mensajes.length - 5) + ' más\n';
                }

                texto += '┃\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

                await responder.texto(texto);
                return;
            }

            // ───────────── MODO 3: AYUDA ─────────────
            if (subcomando === 'help' || subcomando === 'ayuda' || subcomando === '?') {
                return await responder.texto(generarAyuda());
            }

            // Comando no reconocido
            return await responder.texto(generarAyuda());

        } catch (error) {
            console.error('[SMS] Error:', error?.message || error);

            await responder.texto(
                '╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ No se pudo completar la acción.\n' +
                '┃\n' +
                '┃ ⚠️ ' + (error?.message || 'Error desconocido') + '\n' +
                '┃\n' +
                '┃ 💡 La API puede estar saturada,\n' +
                '┃    intenta en unos segundos.\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }
    }
};