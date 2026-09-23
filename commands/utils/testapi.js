// commands/utils/testapi.js —  Prueba todos los formatos de la API NSFW
import fetch from 'node-fetch';

const API = 'https://api.evogb.org/nsfw/detect-free';
const KEY = 'evogb-tYhNSXu6';

export default {
    nombre: 'testapi',
    categoria: 'utils',
    alias: ['pruebaapi', 'apitest'],
    descripcion: 'Prueba todos los formatos de la API NSFW y muestra respuestas crudas',
    uso: '.testapi (responde a una imagen) | .testapi <url>',
    ejecutar: async ({ sock, msg, argumento, responder }) => {
        let buffer = null;

        // Opción 1: URL como argumento
        const urlArg = (argumento || '').trim();
        if (urlArg.startsWith('http')) {
            await responder.texto('📥 Descargando imagen de URL...');
            try {
                const r = await fetch(urlArg, { timeout: 15000 });
                if (!r.ok) return await responder.texto('❌ La URL no respondió: HTTP ' + r.status);
                buffer = Buffer.from(await r.arrayBuffer());
            } catch (e) {
                return await responder.texto('❌ Error descargando URL: ' + e.message);
            }
        } else {
            // Opción 2: imagen del mensaje o quoted
            const m = msg.message || {};
            const img = m.imageMessage || m.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
            if (!img) return await responder.texto('❌ Responde a una imagen o pasa una URL:\n.testapi https://ejemplo.com/foto.jpg');

            await responder.texto('📥 Descargando imagen del chat...');
            try {
                if (img.url) {
                    const r = await fetch(img.url, { timeout: 15000 });
                    if (r.ok) buffer = Buffer.from(await r.arrayBuffer());
                }
                if (!buffer && img.directPath) {
                    const r = await fetch('https://mmg.whatsapp.net' + img.directPath, { timeout: 15000 });
                    if (r.ok) buffer = Buffer.from(await r.arrayBuffer());
                }
            } catch (e) {
                return await responder.texto('❌ Error descargando: ' + e.message);
            }
        }

        if (!buffer || buffer.length < 100) {
            return await responder.texto('❌ No pude obtener la imagen.');
        }

        await responder.texto('🧪 Probando ' + (buffer.length / 1024).toFixed(1) + ' KB contra la API...\n⏳ Esto toma ~30s');

        const base64 = buffer.toString('base64');
        const resultados = [];

        // ---------- LISTA DE FORMATOS A PROBAR ----------
        const pruebas = [
            {
                nombre: '1. multipart "image"',
                fn: async () => {
                    const form = new FormData();
                    form.append('image', new Blob([buffer], { type: 'image/jpeg' }), 'img.jpg');
                    return fetch(API + '?key=' + KEY, { method: 'POST', body: form, timeout: 15000 });
                }
            },
            {
                nombre: '2. multipart "file"',
                fn: async () => {
                    const form = new FormData();
                    form.append('file', new Blob([buffer], { type: 'image/jpeg' }), 'img.jpg');
                    return fetch(API + '?key=' + KEY, { method: 'POST', body: form, timeout: 15000 });
                }
            },
            {
                nombre: '3. multipart "img"',
                fn: async () => {
                    const form = new FormData();
                    form.append('img', new Blob([buffer], { type: 'image/jpeg' }), 'img.jpg');
                    return fetch(API + '?key=' + KEY, { method: 'POST', body: form, timeout: 15000 });
                }
            },
            {
                nombre: '4. multipart "foto"',
                fn: async () => {
                    const form = new FormData();
                    form.append('foto', new Blob([buffer], { type: 'image/jpeg' }), 'img.jpg');
                    return fetch(API + '?key=' + KEY, { method: 'POST', body: form, timeout: 15000 });
                }
            },
            {
                nombre: '5. JSON {image: base64}',
                fn: async () => fetch(API + '?key=' + KEY, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: base64 }),
                    timeout: 15000
                })
            },
            {
                nombre: '6. JSON {image: dataURI}',
                fn: async () => fetch(API + '?key=' + KEY, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: 'data:image/jpeg;base64,' + base64 }),
                    timeout: 15000
                })
            },
            {
                nombre: '7. JSON {url: telegraph}',
                fn: async () => {
                    const f = new FormData();
                    f.append('file', new Blob([buffer], { type: 'image/jpeg' }), 'img.jpg');
                    const up = await fetch('https://telegra.ph/upload', { method: 'POST', body: f, timeout: 15000 });
                    const uj = await up.json();
                    if (!Array.isArray(uj) || !uj[0]?.src) throw new Error('telegraph falló');
                    const url = 'https://telegra.ph' + uj[0].src;
                    return fetch(API + '?key=' + KEY, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url }),
                        timeout: 15000
                    });
                }
            },
            {
                nombre: '8. POST ?url= telegraph',
                fn: async () => {
                    const f = new FormData();
                    f.append('file', new Blob([buffer], { type: 'image/jpeg' }), 'img.jpg');
                    const up = await fetch('https://telegra.ph/upload', { method: 'POST', body: f, timeout: 15000 });
                    const uj = await up.json();
                    if (!Array.isArray(uj) || !uj[0]?.src) throw new Error('telegraph falló');
                    const url = 'https://telegra.ph' + uj[0].src;
                    return fetch(API + '?key=' + KEY + '&url=' + encodeURIComponent(url), { method: 'POST', timeout: 15000 });
                }
            },
            {
                nombre: '9. GET ?url= telegraph',
                fn: async () => {
                    const f = new FormData();
                    f.append('file', new Blob([buffer], { type: 'image/jpeg' }), 'img.jpg');
                    const up = await fetch('https://telegra.ph/upload', { method: 'POST', body: f, timeout: 15000 });
                    const uj = await up.json();
                    if (!Array.isArray(uj) || !uj[0]?.src) throw new Error('telegraph falló');
                    const url = 'https://telegra.ph' + uj[0].src;
                    return fetch(API + '?key=' + KEY + '&url=' + encodeURIComponent(url), { method: 'GET', timeout: 15000 });
                }
            },
            {
                nombre: '10. GET sin params (ver error)',
                fn: async () => fetch(API + '?key=' + KEY, { method: 'GET', timeout: 15000 })
            }
        ];

        // ---------- EJECUTAR PRUEBAS ----------
        for (const p of pruebas) {
            try {
                const res = await p.fn();
                const body = await res.text();
                resultados.push({
                    nombre: p.nombre,
                    status: res.status,
                    body: body.slice(0, 180).replace(/\n/g, ' ')
                });
                // Si alguno funciona, marcarlo
                if (res.ok) {
                    try {
                        const j = JSON.parse(body);
                        if (j.status === true && j.analysis) {
                            resultados[resultados.length - 1].body = '✅✅ FUNCIONA: ' + JSON.stringify(j.analysis).slice(0, 120);
                        }
                    } catch (e) {}
                }
            } catch (e) {
                resultados.push({
                    nombre: p.nombre,
                    status: 'ERR',
                    body: (e.message || String(e)).slice(0, 100)
                });
            }
        }

        // ---------- MOSTRAR RESULTADOS ----------
        let texto = '╭━━〔 🧪 𝐓𝐄𝐒𝐓 𝐀𝐏𝐈 𝐍𝐒𝐅𝐖 〕━━⬣\n┃\n';
        for (const r of resultados) {
            texto += '┃ ' + r.nombre + '\n';
            texto += '┃    HTTP ' + r.status + '\n';
            texto += '┃    ' + r.body + '\n┃\n';
        }
        texto += '╰━━〔  𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

        // Dividir si es muy largo
        if (texto.length > 4000) {
            const partes = texto.match(/[\s\S]{1,3900}/g) || [texto];
            for (let i = 0; i < partes.length; i++) {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: '🧪 *Parte ' + (i + 1) + '/' + partes.length + '*\n\n' + partes[i]
                }, { quoted: msg });
            }
        } else {
            await responder.texto(texto);
        }
    }
};