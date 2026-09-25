// commands/utils/sms.js
// ============================================================
// BOT-API — SMS VIRTUAL REAL (5SIM) + Verificación WhatsApp
// Obtiene números temporales y filtra los NO registrados en WhatsApp
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import fetch from 'node-fetch';

// ───────────── CONFIGURACIÓN ─────────────
// API key de 5SIM (gratis en https://5sim.net)
const FIVESIM_API_KEY = process.env.FIVESIM_API_KEY || '';
const FIVESIM_BASE = 'https://5sim.net/v1';

// País por defecto (puedes cambiar: russia, ukraine, indonesia, etc.)
const PAIS_DEFAULT = 'any';

// Servicio por defecto (whatsapp, telegram, gmail, etc.)
const SERVICIO_DEFAULT = 'whatsapp';

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

// ───────────── 5SIM API ─────────────
async function comprarNumero5SIM(servicio = SERVICIO_DEFAULT, pais = PAIS_DEFAULT) {
    if (!FIVESIM_API_KEY) {
        throw new Error('Falta FIVESIM_API_KEY en .env\n\nRegístrate gratis en https://5sim.net\ny agrega: FIVESIM_API_KEY=tu_key_aqui');
    }

    const url = `${FIVESIM_BASE}/user/buy/activation/${pais}/${servicio}/any`;

    const res = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${FIVESIM_API_KEY}`,
            'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(20000)
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || `5SIM respondió ${res.status}`);
    }

    const data = await res.json();

    return {
        id: data.id,
        phone: data.phone,
        country: data.country,
        service: data.service,
        status: data.status,
        _raw: data
    };
}

async function obtenerCodigo5SIM(activationId) {
    const url = `${FIVESIM_BASE}/user/check/${activationId}`;

    const res = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${FIVESIM_API_KEY}`,
            'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(20000)
    });

    if (!res.ok) throw new Error(`5SIM respondió ${res.status}`);

    const data = await res.json();

    return {
        status: data.status,
        sms: data.sms || [],
        _raw: data
    };
}

async function cancelarNumero5SIM(activationId) {
    try {
        await fetch(`${FIVESIM_BASE}/user/cancel/${activationId}`, {
            headers: {
                'Authorization': `Bearer ${FIVESIM_API_KEY}`,
                'Accept': 'application/json'
            }
        });
    } catch (e) {
        console.error('[SMS] Error cancelando:', e.message);
    }
}

// ───────────── VERIFICAR SI ESTÁ REGISTRADO EN WHATSAPP ─────────────
async function estaRegistradoEnWhatsApp(sock, numero) {
    try {
        const jid = numero.includes('@') ? numero : `${numero.replace(/\D/g, '')}@s.whatsapp.net`;
        const resultado = await sock.onWhatsApp(jid);

        // onWhatsApp devuelve array con { exists: true/false }
        return resultado?.[0]?.exists === true;
    } catch (e) {
        console.error('[SMS] Error verificando WhatsApp:', e.message);
        return null; // No se pudo verificar
    }
}

// ───────────── BUSCAR NÚMERO NO REGISTRADO ─────────────
async function buscarNumeroNoRegistrado(sock, maxIntentos = 3) {
    const intentos = [];

    for (let i = 0; i < maxIntentos; i++) {
        console.log(`[SMS] Intento ${i + 1}/${maxIntentos}: comprando número...`);

        try {
            const numero = await comprarNumero5SIM();

            console.log(`[SMS] Número obtenido: ${numero.phone}`);
            console.log(`[SMS] Verificando si está registrado en WhatsApp...`);

            const registrado = await estaRegistradoEnWhatsApp(sock, numero.phone);

            if (registrado === false) {
                console.log(`[SMS] ✅ Número NO registrado: ${numero.phone}`);
                return { ...numero, registrado: false };
            }

            if (registrado === true) {
                console.log(`[SMS] ❌ Número YA registrado: ${numero.phone}`);
                intentos.push({ phone: numero.phone, registrado: true });

                // Cancelar este número y pedir otro
                await cancelarNumero5SIM(numero.id);
                continue;
            }

            // No se pudo verificar, lo devolvemos igual
            console.log(`[SMS] ⚠️ No se pudo verificar: ${numero.phone}`);
            return { ...numero, registrado: null };

        } catch (e) {
            console.error(`[SMS] Error en intento ${i + 1}:`, e.message);
            intentos.push({ error: e.message });
        }
    }

    throw new Error(
        `No se encontró número no registrado después de ${maxIntentos} intentos.\n` +
        intentos.map(i => i.phone ? `• ${i.phone} (registrado)` : `• Error: ${i.error}`).join('\n')
    );
}

// ───────────── COMANDO ─────────────
export default {
    nombre: 'sms',
    categoria: 'utils',
    alias: ['virtualsms', 'tempsms', 'smsvirtual', 'numerovirtual', 'fakenumber', 'numerowsp'],
    descripcion: 'Obtén números virtuales NO registrados en WhatsApp y verifica SMS.',
    uso: '.sms | .sms check | .sms status',

    ejecutar: async ({ sock, msg, args, responder }) => {
        const subcomando = (args[0] || '').toLowerCase();
        const jid = msg.key.participant || msg.key.remoteJid;
        const numero = jidANumero(jid);

        try {
            // ───────────── MODO 1: OBTENER NÚMERO NO REGISTRADO ─────────────
            if (!subcomando || subcomando === 'new' || subcomando === 'get' || subcomando === 'numero') {
                if (!FIVESIM_API_KEY) {
                    return await responder.texto(
                        '╭━━〔 ️ 𝐅𝐀𝐋𝐓𝐀 𝐀𝐏𝐈 𝐊𝐄𝐘 〕━━⬣\n' +
                        '┃\n' +
                        '┃ Para usar números reales necesitas:\n' +
                        '┃\n' +
                        '┃ 1️⃣ Registrarte en https://5sim.net\n' +
                        '┃ 2️⃣ Obtener tu API key (gratis)\n' +
                        '┃ 3️⃣ Agregar a .env:\n' +
                        '┃    FIVESIM_API_KEY=tu_key_aqui\n' +
                        '┃\n' +
                        '┃ 💡 5SIM da créditos gratis al\n' +
                        '┃    registrarte para probar.\n' +
                        '┃\n' +
                        '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                    );
                }

                await responder.texto('📡 Buscando número NO registrado en WhatsApp...');

                const result = await buscarNumeroNoRegistrado(sock, 3);

                // Guardar en base de datos
                const db = leerDB();
                db[numero] = {
                    activationId: result.id,
                    number: result.phone,
                    country: result.country,
                    obtenido: Date.now(),
                    registrado: result.registrado
                };
                guardarDB(db);

                const texto =
                    '╭━━〔  𝐍𝐔𝐌𝐄𝐑𝐎 𝐍𝐎 𝐑𝐄𝐆𝐈𝐒𝐓𝐑𝐀𝐃𝐎 〕━━⬣\n' +
                    '┃\n' +
                    '┃ ✅ Número obtenido y verificado\n' +
                    '┃\n' +
                    '┃ 📞 *Número:*\n' +
                    '┃    ' + result.phone + '\n' +
                    '┃\n' +
                    '┃ 🌎 País: *' + (result.country || 'Desconocido').toUpperCase() + '*\n' +
                    '┃ 📦 Servicio: ' + result.service + '\n' +
                    '┃ 🔍 Registrado en WhatsApp: *' + (result.registrado === false ? 'NO ✅' : result.registrado === true ? 'SÍ ❌' : 'Desconocido ⚠️') + '*\n' +
                    '┃\n' +
                    '┣━━〔 💡 𝐔𝐒𝐎 〕━━⬣\n' +
                    '┃\n' +
                    '┃ 📥 Ver SMS/código recibido:\n' +
                    '┃ ➪ *.sms check*\n' +
                    '┃\n' +
                    '┃ 📊 Ver estado de la activación:\n' +
                    '┃ ➪ *.sms status*\n' +
                    '┃\n' +
                    '┃ ️ El número dura ~20 minutos.\n' +
                    '┃\n' +
                    '╰━━〔  𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

                await responder.texto(texto);
                return;
            }

            // ───────────── MODO 2: VER SMS RECIBIDOS ─────────────
            if (subcomando === 'check' || subcomando === 'ver' || subcomando === 'leer' || subcomando === 'codigo') {
                const db = leerDB();
                const userData = db[numero];

                if (!userData || !userData.activationId) {
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

                await responder.texto('📡 Verificando SMS de ' + userData.number + '...');

                const result = await obtenerCodigo5SIM(userData.activationId);

                if (!result.sms || result.sms.length === 0) {
                    return await responder.texto(
                        '╭━━〔 📭 𝐒𝐈𝐍 𝐒𝐌𝐒 〕━━⬣\n' +
                        '┃\n' +
                        '┃ 📞 Número: ' + userData.number + '\n' +
                        '┃ 📊 Estado: ' + result.status + '\n' +
                        '┃\n' +
                        '┃ 📭 Aún no hay SMS recibidos.\n' +
                        '┃\n' +
                        '┃ 💡 Si acabas de enviar la\n' +
                        '┃    verificación, espera unos\n' +
                        '┃    segundos y prueba de nuevo.\n' +
                        '┃\n' +
                        '╰━━〔  𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                    );
                }

                // Extraer código si existe
                let codigo = null;
                for (const sms of result.sms) {
                    const texto = sms.text || sms.body || '';
                    const match = texto.match(/\b(\d{4,6})\b/);
                    if (match) {
                        codigo = match[1];
                        break;
                    }
                }

                let texto =
                    '╭━━〔  𝐒𝐒 𝐑𝐄𝐂𝐈𝐁𝐈𝐃𝐎𝐒 〕━━⬣\n' +
                    '┃\n' +
                    '┃ 📞 Número: ' + userData.number + '\n' +
                    '┃ 📊 Total: *' + result.sms.length + '* mensaje(s)\n' +
                    (codigo ? '┃\n┃ 🔑 *CÓDIGO: ' + codigo + '*\n' : '') +
                    '┃\n';

                const maxShow = Math.min(result.sms.length, 3);
                for (let i = 0; i < maxShow; i++) {
                    const sms = result.sms[i];
                    texto +=
                        '┣━━〔 📩 SMS #' + (i + 1) + ' 〕━━⬣\n' +
                        '┃ 💬 ' + String(sms.text || sms.body || '').slice(0, 150) + '\n';
                }

                texto += '┃\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

                await responder.texto(texto);
                return;
            }

            // ───────────── MODO 3: VER ESTADO ─────────────
            if (subcomando === 'status' || subcomando === 'estado') {
                const db = leerDB();
                const userData = db[numero];

                if (!userData || !userData.activationId) {
                    return await responder.texto('❌ No tienes un número activo.');
                }

                const result = await obtenerCodigo5SIM(userData.activationId);

                await responder.texto(
                    '╭━━〔  𝐄𝐒𝐓𝐀𝐃𝐎 〕━━⬣\n' +
                    '┃\n' +
                    '┃ 📞 Número: ' + userData.number + '\n' +
                    '┃  Estado: *' + result.status.toUpperCase() + '*\n' +
                    '┃ 📬 SMS recibidos: ' + (result.sms?.length || 0) + '\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
                return;
            }

            // Ayuda por defecto
            return await responder.texto(
                '╭━━〔 📱 𝐌𝐒 𝐕𝐈𝐑𝐓𝐔𝐀𝐋 〕━━⬣\n' +
                '┃\n' +
                '┃ ➪ *.sms* — Número NO registrado\n' +
                '┃ ➪ *.sms check* — Ver SMS/código\n' +
                '┃ ➪ *.sms status* — Estado\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );

        } catch (error) {
            console.error('[SMS] Error:', error);

            await responder.texto(
                '╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ ⚠️ ' + (error?.message || 'Error desconocido').split('\n')[0] + '\n' +
                '┃\n' +
                '╰━━〔  𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }
    }
};