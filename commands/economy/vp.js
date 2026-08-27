import fs from 'fs/promises';
import path from 'path';

export default {
    nombre: 'debug',
    ejecutar: async ({ sock, msg }) => {
        const RUTA = path.join(process.cwd(), 'database', 'gacha.json');
        const db = JSON.parse(await fs.readFile(RUTA, 'utf-8'));
        
        const nombres = Object.keys(db).join('\n- ')
        await sock.sendMessage(msg.key.remoteJid, { 
            text: `Personajes en gacha.json:\n- ${nombres}`
        }, { quoted: msg });
    }
}