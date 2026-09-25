
// commands/utils/sms.js
// ============================================================
// BOT-API — SMS VIRTUAL (API Gohan)
// Con debug para ver qué responde la API realmente
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import fetch from 'node-fetch';

const API_BASE = 'https://api-gohan-v1.onrender.com';
const RUTA_DB = path.join(process.cwd(), 'database', 'smsUsers.json');

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

// ───────────── API CON DEBUG ─────────────
async function getVirtualNumber(debug = false) {
    const url = `${API_BASE}/sms/number`;
    
    if (debug) console.log('[SMS] Llamando:', url);
    
    const res = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(20000)
    });

    if (!res.ok) throw new Error(`API respondió ${res.status}`);

    const data = await res.json();
    
    if (debug) {
        console.log('[SMS] Respuesta completa:', JSON.stringify(data, null, 2));
    }

    if (!data.status || !data.result) {
        throw new Error(data.message || 'API no devolvió número');
    }

    return {
        ...data.result,
        _raw: debug ? data : null
    };
}

async function checkSMS(number, debug = false) {
    const encoded = encodeURIComponent(number);
    const url = `${API_BASE}/sms/check?number=${encoded}`;
    
    if (debug) console.log('[SMS] Verificando:', url);
    
    const res = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(20000)
    });

    if (!res.ok) throw new Error(`API respondió ${res.status}`);

    const data = await res.json();
    
    if (debug) {
        console.log('[SMS] Respuesta SMS:', JSON.stringify(data, null, 2));
    }

    if (!data.status) {
        throw new Error(data.message || 'No se pudo verificar SMS');
    }

    return data.result || data.messages || data.data || [];
}

// ───────────── COMANDO ─────────────
export default {
    nombre: 'sms',
    categoria: 'utils',
    alias: ['virtualsms', 'tempsms', 'smsvirtual', 'numerovirtual', 'fakenumber'],
    descripcion: 'Obtén números virtuales temporales y verifica SMS recibidos.',
    uso: '.sms | .sms check | .sms debug',

    ejecutar: async ({ sock, msg, args, responder }) => {
        const subcomando = (args[0] || '').toLowerCase();
        const jid = msg.key.participant || msg.key.remoteJid;
        const numero = jidANumero(jid);

        try {
            // ───────────── MODO DEBUG ─────────────
            if (subcomando === 'debug' || subcomando === 'test') {
                await responder.texto('🔍 Probando API Gohan...');
                
                const result = await getVirtualNumber(true);
                
                const texto = 
                    '╭━━〔 🔍 𝐃𝐄𝐁𝐔𝐆 𝐀𝐏𝐈 〕━━⬣\n' +
                    '┃\n' +
                    '┃ 📞 Número: ' + result.number + '\n' +
                    '┃ 🌎 País: ' + result.country + '\n' +
                    '┃ 📦 Source: ' + result.source + '\n' +
                    '┃ ⏱️ Expira: ' + result.expires_in + '\n' +
                    '┃\n' +
                    '┃ 📋 Endpoint check:\n' +
                    '┃ ' + result.sms_check + '\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';
                
                await responder.texto(texto);
                return;
            }

            // ───────────── MODO 1: OBTENER NÚMERO ─────────────
            if (!subcomando || subcomando === 'new' || subcomando === 'get' || subcomando === 'numero') {
                await responder.texto('📡 Obteniendo número virtual...');

                const result = await getVirtualNumber(false);

                const db = leerDB();
                db[numero] = {
                    number: result.number,
                    country: result.country,
                    obtenido: Date.now(),
                    expira: result.expires_in
                };
                guardarDB(db);

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
                    '┃ 📥 Ver SMS recibidos:\n' +
                    '┃ ➪ *.sms check*\n' +
                    '┃\n' +
                    '┃ 🔍 Ver info de la API:\n' +
                    '┃ ➪ *.sms debug*\n' +
                    '┃\n' +
                    '┃ ⚠️ ' + (result.warning || 'Número temporal') + '\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

                await responder.texto(texto);
                return;
            }

            // ───────────── MODO 2: VER SMS ─────────────
            if (subcomando === 'check' || subcomando === 'ver' || subcomando === 'leer') {
                let targetNumber = args[1] || '';

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
                            '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                        );
                    }

                    targetNumber = userData.number;
                }

                await responder.texto('📡 Verificando SMS de ' + targetNumber + '...');

                const mensajes = await checkSMS(targetNumber, false);

                if (!mensajes || !mensajes.length || (Array.isArray(mensajes) && mensajes.length === 0)) {
                    return await responder.texto(
                        '╭━━〔 📭 𝐒𝐈𝐍 𝐌𝐄𝐍𝐒𝐀𝐉𝐄𝐒 〕━━⬣\n' +
                        '┃\n' +
                        '┃ 📞 Número: ' + targetNumber + '\n' +
                        '┃\n' +
                        '┃ 📭 No hay SMS recibidos aún.\n' +
                        '┃\n' +
                        '┃ 💡 Esta API parece ser de\n' +
                        '┃    demostración y puede no\n' +
                        '┃    recibir SMS reales.\n' +
                        '┃\n' +
                        '┃ 🔍 Usa *.sms debug* para\n' +
                        '┃    ver más info de la API.\n' +
                        '┃\n' +
                        '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                    );
                }

                const lista = Array.isArray(mensajes) ? mensajes : [mensajes];
                
                let texto =
                    '╭━━〔 📬 𝐒𝐌𝐒 𝐑𝐄𝐂𝐈𝐁𝐈𝐃𝐎𝐒 〕━━⬣\n' +
                    '┃\n' +
                    '┃ 📞 Número: ' + targetNumber + '\n' +
                    '┃ 📊 Total: *' + lista.length + '* mensaje(s)\n' +
                    '┃\n';

                const maxShow = Math.min(lista.length, 5);
                for (let i = 0; i < maxShow; i++) {
                    const sms = lista[i];
                    const from = sms.from || sms.sender || 'Desconocido';
                    const body = sms.body || sms.message || sms.text || JSON.stringify(sms);
                    const time = sms.date || sms.time || sms.timestamp || '';

                    texto +=
                        '┣━━〔 📩 SMS #' + (i + 1) + ' 〕━━⬣\n' +
                        '┃ 👤 De: ' + from + '\n' +
                        (time ? '┃ 🕐 ' + time + '\n' : '') +
                        '┃ 💬 ' + String(body).slice(0, 200) + (String(body).length > 200 ? '...' : '') + '\n';
                }

                if (lista.length > 5) {
                    texto += '┃\n┃ … y ' + (lista.length - 5) + ' más\n';
                }

                texto += '┃\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

                await responder.texto(texto);
                return;
            }

            // Ayuda por defecto
            return await responder.texto(
                '╭━━〔 📱 𝐒𝐌𝐒 𝐕𝐈𝐑𝐓𝐔𝐀𝐋 〕━━⬣\n' +
                '┃\n' +
                '┃ ➪ *.sms* — Obtener número\n' +
                '┃ ➪ *.sms check* — Ver SMS\n' +
                '┃ ➪ *.sms debug* — Info API\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );

        } catch (error) {
            console.error('[SMS] Error:', error);

            await responder.texto(
                '╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ ⚠️ ' + (error?.message || 'Error desconocido') + '\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }
    }
};