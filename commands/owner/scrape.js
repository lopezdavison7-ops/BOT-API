import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { esOwner } from '../../lib/owner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCRAPE_DIR = path.join(__dirname, '../../media/scrape');

const UA = { 'User-Agent': 'BOT-API-HACKER/2.0' };
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function caja(emoji, titulo, cuerpo = [], pie) {
    const lineas = Array.isArray(cuerpo)? cuerpo : [cuerpo];
    let texto = `╭〔 ${emoji} 𝐒𝐂𝐑𝐀𝐏𝐄-𝐇𝐀𝐂𝐊 › ${titulo} 〕⬣\n┃\n`;
    for (const l of lineas) texto += l === ''? '┃\n' : `┃ ${l}\n`;
    texto += '┃\n╰━━━━━━━━⬣';
    if (pie) texto += `\n\n> ${pie}`;
    texto += '\n\n╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣';
    return texto;
}

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;/g, "'");

function stripHTML(html) {
    return html.replace(/<script.*?>.*?<\/script>/gs, '')
              .replace(/<style.*?>.*?<\/style>/gs, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
}

async function scrapeURL(url, modo = 'normal') {
    if (!url.startsWith('http')) url = 'https://' + url;

    const res = await fetch(url, { signal: AbortSignal.timeout(20_000), headers: UA });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const contentType = res.headers.get('content-type') || '';

    // MODO JSON: Si es API o lo convertimos
    if(modo === 'json'){
        if(contentType.includes('application/json')){
            return await res.json();
        } else {
            const html = await res.text();
            return {
                url, status: res.status, content_type: contentType,
                titulo: html.match(/<title>(.*?)<\/title>/i)?.[1] || 'Sin título',
                longitud: html.length,
                meta_description: html.match(/<meta name="description" content="(.*?)"/i)?.[1] || null,
                snippet: html.slice(0, 1000)
            }
        }
    }

    const html = await res.text();

    // MODO TEXT: Solo texto limpio
    if(modo === 'text'){
        return { texto: stripHTML(html).slice(0, 4000) }
    }

    // MODO DOWNLOAD: Baja todas las imgs
    if(modo === 'download'){
        if(!fs.existsSync(SCRAPE_DIR)) fs.mkdirSync(SCRAPE_DIR, { recursive: true });
        const imgs = [...html.matchAll(/<img[^>]+src="([^"]*)"/gi)].map(m => decode(m[1])).filter(i => i.startsWith('http')).slice(0, 10);
        const descargadas = [];
        for(let i = 0; i < imgs.length; i++){
            try{
                const imgRes = await fetch(imgs[i], { headers: UA });
                const buffer = Buffer.from(await imgRes.arrayBuffer());
                const file = `scrape_${Date.now()}_${i}.jpg`;
                fs.writeFileSync(path.join(SCRAPE_DIR, file), buffer);
                descargadas.push(file);
                await delay(500);
            }catch{}
        }
        return { descargadas, total: imgs.length }
    }

    // MODO NORMAL
    const titulo = html.match(/<title>(.*?)<\/title>/i)?.[1] || 'Sin título';
    const desc = html.match(/<meta name="description" content="(.*?)"/i)?.[1] || 'Sin descripción';
    const links = [...html.matchAll(/<a[^>]+href="([^"]*)"/gi)].map(m => decode(m[1])).filter(l => l.startsWith('http')).slice(0, 15);
    const imgs = [...html.matchAll(/<img[^>]+src="([^"]*)"/gi)].map(m => decode(m[1])).filter(i => i.startsWith('http')).slice(0, 8);

    return { titulo, desc, links, imgs };
}

export default {
    nombre: 'scrape',
    categoria: 'tools',
    alias: ['scrap', 'hack'],
    owner: false,
    descripcion: '💻 Scraper PRO. Modos: normal, json, text, download',

    ejecutar: async ({ msg, responder, argumento }) => {
        const partes = (argumento || '').trim().split(/\s+/);
        let modo = 'normal';
        let url = partes[0];

        if(['json', 'text', 'download'].includes(partes[0])){
            modo = partes[0];
            url = partes[1];
        }

        if (!url) {
            await responder.texto(caja('❓', 'AYUDA', [
                'Uso: *.scrape <url>*',
                'Uso: *.scrape json <url>*',
                'Uso: *.scrape text <url>*',
                'Uso: *.scrape download <url>*',
                '',
                'Ej: *.scrape google.com*',
                'Ej: *.scrape json konachan.net/post.json?tags=rem*'
            ]));
            return;
        }

        await responder.texto(caja('🔍', 'HACKEANDO', [`Modo: ${modo}`, `Target: ${url}`]));

        try {
            const data = await scrapeURL(url, modo);

            if(modo === 'json'){
                const jsonStr = JSON.stringify(data, null, 2).slice(0, 4000);
                return await responder.texto(caja('📦', 'JSON DUMP', ['```json', jsonStr, '```']));
            }
            if(modo === 'text'){
                return await responder.texto(caja('📄', 'TEXTO LIMPIO', [data.texto]));
            }
            if(modo === 'download'){
                const lista = data.descargadas.map(f => `• ${f}`).join('\n');
                return await responder.texto(caja('💾', 'DOWNLOAD', [`${data.descargadas.length}/${data.total} imgs guardadas`, '', lista], `En: /media/scrape`));
            }

            const cuerpo = [
                `*TÍTULO:* ${data.titulo}`,
                `*DESC:* ${data.desc}`,
                '',
                `*📎 LINKS [${data.links.length}]:*`,
             ...data.links.map(l => `• ${l}`),
                '',
                `*🖼️ IMGS [${data.imgs.length}]:*`,
             ...data.imgs.map(i => `• ${i}`)
            ];
            await responder.texto(caja('✅', 'COMPLETADO', cuerpo));

        } catch (e) {
            await responder.texto(caja('❌', 'ERROR', [`Falló el hack: ${e.message}`]));
        }
    },
};