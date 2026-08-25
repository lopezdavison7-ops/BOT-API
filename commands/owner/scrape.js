import { esOwner } from '../../lib/owner.js';

const UA = { 'User-Agent': 'BOT-API-scraper/1.0' };

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function caja(emoji, titulo, cuerpo = [], pie) {
    const lineas = Array.isArray(cuerpo)? cuerpo : [cuerpo];
    let texto = `╭〔 ${emoji} 𝐒𝐂𝐑𝐀𝐏𝐄 › ${titulo} 〕⬣\n┃\n`;
    for (const l of lineas) {
        texto += l === ''? '┃\n' : `┃ ${l}\n`;
    }
    texto += '┃\n╰━━━━━━━━⬣';
    if (pie) texto += `\n\n> ${pie}`;
    texto += '\n\n╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣';
    return texto;
}

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"');

async function scrapeURL(url, modo = 'normal') {
    const res = await fetch(url, {
        signal: AbortSignal.timeout(15_000),
        headers: UA
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    if(modo === 'json'){
        try {
            return await res.json(); // Si la url ya es json como konachan
        } catch {
            return { error: 'La página no devolvió JSON válido' }
        }
    }

    const html = await res.text();

    // Modo Konachan API
    if (url.includes('konachan.net/post.json')) {
        const data = JSON.parse(html);
        return {
            titulo: `Konachan API - ${data.length} posts`,
            desc: 'Respuesta directa de Konachan',
            links: data.slice(0,5).map(p => p.file_url).filter(Boolean),
            imgs: data.slice(0,5).map(p => p.sample_url).filter(Boolean),
            raw: data.slice(0,3) // guardamos 3 crudos
        }
    }

    const titulo = html.match(/<title>(.*?)<\/title>/i)?.[1] || 'Sin título';
    const desc = html.match(/<meta name="description" content="(.*?)"/i)?.[1] || 'Sin descripción';

    const links = [...html.matchAll(/<a[^>]+href="([^"]*)"/gi)]
      .map(m => decode(m[1]))
      .filter(l => l.startsWith('http'))
      .slice(0, 10);

    const imgs = [...html.matchAll(/<img[^>]+src="([^"]*)"/gi)]
      .map(m => decode(m[1]))
      .filter(i => i.startsWith('http'))
      .slice(0, 5);

    return { titulo, desc, links, imgs };
}

export default {
    nombre: 'scrape',

    categoria: 'tools',

    alias: ['scrap'],

    owner: false,

    descripcion: '🌐 Scrapea cualquier página. Usa "json" para ver el raw.',

    ejecutar: async ({ msg, responder, argumento }) => {

        const partes = (argumento || '').trim().split(/\s+/);
        let modo = 'normal';
        let url = partes[0];

        if(partes[0] === 'json'){
            modo = 'json';
            url = partes[1];
        }

        if (!url) {
            await responder.texto(caja('❓', 'AYUDA', [
                'Uso: *.scrape <url>*',
                'Uso: *.scrape json <url>*',
                '',
                'Ej: *.scrape https://google.com*',
                'Ej: *.scrape json https://konachan.net/post.json?tags=rem*'
            ]));
            return;
        }

        if (!/^https?:\/\//.test(url)) {
            await responder.texto(caja('⚠️', 'ERROR', ['Manda un link válido']));
            return;
        }

        await responder.texto(caja('🔍', 'SCRAPEANDO', [`Modo: ${modo}`, `URL: ${url}`]));

        try {
            const data = await scrapeURL(url, modo);

            if(modo === 'json'){
                const jsonStr = JSON.stringify(data, null, 2).slice(0, 3000); // recortamos pa que no crashee wa
                await responder.texto(caja('📦', 'JSON RAW', [
                    '```json',
                    jsonStr,
                    '```'
                ], 'Primeros 3000 caracteres'));
                return;
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

            if(data.raw){
                cuerpo.push('', `*RAW:* Se encontraron ${data.raw.length} objetos`)
            }

            await responder.texto(caja('✅', 'COMPLETADO', cuerpo, 'Scrape terminado'));

        } catch (e) {
            await responder.texto(caja('❌', 'ERROR', [`No se pudo scrapear: ${e.message}`]));
        }
    },
};