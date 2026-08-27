import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import util from 'util';

const execAsync = util.promisify(exec);

export default {
    nombre: 'tiktok',
    ejecutar: async ({ sock, msg }) => {
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        const query = text.split(' ').slice(1).join(' ').trim();

        if(!query) return await sock.sendMessage(msg.key.remoteJid, {text: '❌ Uso:.tiktok gatos graciosos'}, {quoted: msg});

        await sock.sendMessage(msg.key.remoteJid, {text: `🔍 Buscando videos de: *${query}*...\nEsto tarda 20s bro`}, {quoted: msg});

        try {
            // Guardamos un scraper temporal
            const scriptPath = path.join(process.cwd(), 'temp_scraper.py');
            const scraperCode = `
import asyncio, time, sys
from urllib.parse import quote
BUSQUEDA = "${query}"
SCROLLS = 2
ARCHIVO_SALIDA = f"tiktok_links_{BUSQUEDA.replace(' ', '_')}.txt"

def metodo_ytdlp(query):
    try:
        import yt_dlp
        ydl_opts = {'quiet': True, 'extract_flat': True, 'no_warnings': True}
        search_url = f"ytsearch10:{query} tiktok"
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(search_url, download=False)
            entries = info.get('entries', [])
            links = []
            for entry in entries:
                url = entry.get('url') or entry.get('webpage_url')
                if url and 'tiktok.com' in url:
                    links.append(url.split('?')[0])
            return links
    except: return []

links = metodo_ytdlp(BUSQUEDA)
with open(ARCHIVO_SALIDA, 'w', encoding='utf-8') as f:
    for link in links[:5]:
        f.write(link + '\\n')
print("OK")
`;
            await fs.writeFile(scriptPath, scraperCode);

            // Ejecutar scraper
            await execAsync(`python3 ${scriptPath}`);

            // Leer resultados
            const data = await fs.readFile(path.join(process.cwd(), `tiktok_links_${query.replace(/ /g, '_')}.txt`), 'utf-8');
            const links = data.split('\n').filter(l => l.trim());

            if(links.length === 0) throw new Error('No se encontraron videos');

            // Diseño con tu estilo
            let texto = `╭─「 *BOT APPING* 」─╮\n`;
            texto += `│ 🔎 Búsqueda: *${query}*\n`;
            texto += `│ ✅ Encontrados: *${links.length}* videos\n`;
            texto += `╰───────────────────╯\n\n`;

            texto += `*TOP VIDEOS:*\n`;
            links.slice(0, 5).forEach((link, i) => {
                texto += `${i+1}. ${link}\n`;
            });

            texto += `\n_Le enviaré los videos en un momento..._ 👇`;

            await sock.sendMessage(msg.key.remoteJid, {text: texto}, {quoted: msg});

            // Enviar los primeros 3 videos
            for(let i = 0; i < Math.min(3, links.length); i++) {
                await sock.sendMessage(msg.key.remoteJid, {text: links[i]}, {quoted: msg});
                await new Promise(r => setTimeout(r, 1500));
            }

            await fs.unlink(scriptPath).catch(()=>{});

        } catch(e) {
            await sock.sendMessage(msg.key.remoteJid, {text: `❌ Error: ${e.message}\n\nPrueba con otra búsqueda bro`}, {quoted: msg});
        }
    }
};