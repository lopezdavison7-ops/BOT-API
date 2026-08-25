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

async function scrapeURL(url) {
    const res = await fetch(url, {
        signal: AbortSignal.timeout(15_000),
        headers: UA
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    // Scrape básico con regex porque no usamos cheerio
    const titulo = html.match(/<title>(.*?)<\/title>/i)?.[1] || 'Sin título';
    const desc = html.match(/<meta name="description" content="(.*?)"/i)?.[1] || 'Sin descripción';

    const links = [...html.matchAll(/<a[^>]+href="([^"]*)"/gi)]
       .map(m => m[1])
       .filter(l => l.startsWith('http'))
       .slice(0, 10);

    const imgs = [...html.matchAll(/<img[^>]+src="([^"]*)"/gi)]
       .map(m => m[1])
       .filter(i => i.startsWith('http'))
       .slice(0, 5);

    return { titulo, desc, links, imgs };
}

export default {
    nombre: 'scrape',

    categoria: 'tools',

    alias: ['scrap'],

    owner: false,

    descripcion: '🌐 Scrapea cualquier página web y devuelve info básica.',

    ejecutar: async ({ msg, responder, argumento }) => {

        const url = (argumento || '').trim();
        if (!url) {
            await responder.texto(caja('❓', 'AYUDA', [
                'Uso: *.scrape <url>*',
                '',
                'Ej: *.scrape https://google.com*',
                'Saca: Título, Descripción, Links e Imgs'
            ]));
            return;
        }

        if (!/^https?:\/\//.test(url)) {
            await responder.texto(caja('⚠️', 'ERROR', ['Manda un link válido que empiece con http:// o https://']));
            return;
        }

        await responder.texto(caja('🔍', 'SCRAPEANDO', [`URL: ${url}`, 'Esto puede tardar unos segundos...']));

        try {
            const { titulo, desc, links, imgs } = await scrapeURL(url);

            const cuerpo = [
                `*TÍTULO:* ${titulo}`,
                `*DESC:* ${desc}`,
                '',
                `*📎 LINKS [${links.length}]:*`,
               ...links.map(l => `• ${l}`),
                '',
                `*🖼️ IMGS [${imgs.length}]:*`,
               ...imgs.map(i => `• ${i}`)
            ];

            await responder.texto(caja('✅', 'COMPLETADO', cuerpo, 'Scrape terminado'));

        } catch (e) {
            await responder.texto(caja('❌', 'ERROR', [`No se pudo scrapear: ${e.message}`]));
        }
    },
};