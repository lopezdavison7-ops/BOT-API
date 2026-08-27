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

        if(!query) return await sock.sendMessage(msg.key.remoteJid, {text: '❌ Uso:.tiktok baile'}, {quoted: msg});

        await sock.sendMessage(msg.key.remoteJid, {text: `🔍 Buscando videos de: *${query}*...\nProbando métodos...`}, {quoted: msg});

        let links = [];

        // ========== MÉTODO 1: YT-DLP ==========
        try {
            await sock.sendMessage(msg.key.remoteJid, {text: `Probando método 1: yt-dlp...`}, {quoted: msg});
            const scriptPath = path.join(process.cwd(), 'temp_scraper.py');
            const scraperCode = `
import yt_dlp
BUSQUEDA = "${query}"
ydl_opts = {'quiet': True, 'extract_flat': True}
search_url = f"ytsearch15:{BUSQUEDA}"
with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    info = ydl.extract_info(search_url, download=False)
    links = [e.get('webpage_url').split('?')[0] for e in info.get('entries', []) if 'tiktok.com' in e.get('webpage_url','')]
    with open('links.txt','w') as f: f.write('\\n'.join(links[:5]))
print("OK")
`;
            await fs.writeFile(scriptPath, scraperCode);
            await execAsync(`python3 ${scriptPath}`);
            const data = await fs.readFile('links.txt', 'utf-8');
            links = data.split('\n').filter(l => l);
            await fs.unlink(scriptPath).catch(()=>{});
        } catch(e){}

        // ========== MÉTODO 2: PLAYWRIGHT ==========
        if(links.length === 0){
            try {
                await sock.sendMessage(msg.key.remoteJid, {text: `Método 1 falló. Probando método 2: Playwright...`}, {quoted: msg});
                const { chromium } = await import('playwright');
                const browser = await chromium.launch({headless: true, args: ['--no-sandbox']});
                const page = await browser.newPage();
                await page.goto(`https://www.tiktok.com/search?q=${encodeURIComponent(query)}&t=video`, {waitUntil: 'domcontentloaded', timeout: 30000});
                await page.waitForTimeout(6000);
                links = await page.$$eval('a[href*="/video/"]', els => [...new Set(els.map(el => el.href.split('?')[0]))].slice(0,5));
                await browser.close();
            } catch(e){}
        }

        if(links.length === 0){
            return await sock.sendMessage(msg.key.remoteJid, {text: `❌ Ningún método funcionó bro\nPrueba con:.tiktok baile\n.tiktok tendencia\nO TikTok te bloqueó. Espera 10 min`}, {quoted: msg});
        }

        // ========== DISEÑO ==========
        let texto = `╭─「 *BOT APPING* 」─╮\n`;
        texto += `│ 🔎 Búsqueda: *${query}*\n`;
        texto += `│ ✅ Encontrados: *${links.length}* videos\n`;
        texto += `╰───────────────────╯\n\n`;
        texto += `*TOP VIDEOS:*\n`;
        links.forEach((link, i) => { texto += `${i+1}. ${link}\n`; });
        texto += `\n_Enviando los videos..._ 👇`;

        await sock.sendMessage(msg.key.remoteJid, {text: texto}, {quoted: msg});

        // Enviar links
        for(const link of links.slice(0,3)){
            await sock.sendMessage(msg.key.remoteJid, {text: link}, {quoted: msg});
            await new Promise(r => setTimeout(r, 1200));
        }
    }
};