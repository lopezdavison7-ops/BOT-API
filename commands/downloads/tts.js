import axios from 'axios';

export default {
    nombre: 'tts',
    categoria: 'ai',
    alias: ['voz', 'decir'],
    ejecutar: async ({ args, msg, conn, responder }) => {
        let texto = args.join(' ');
        if (!texto) return responder.texto(`❌ Usa: .tts Hola bro`);

        await responder.texto(`🔊 *GENERANDO CON YO SOY YO API...*`);

        let API_KEY = 'yosoyyo_sk_gincmnk3'; // La que me pasaste
        let URL = `https://apiyosoyyo-ofc.onrender.com/api/tts?text=${encodeURIComponent(texto)}&apiKey=${API_KEY}`;

        try {
            let res = await axios.get(URL, { responseType: 'arraybuffer' });
            
            await conn.sendMessage(msg.key.remoteJid, {
                audio: res.data,
                mimetype: 'audio/wav',
                ptt: true // para que salga como nota de voz
            });

        } catch(e) {
            await responder.texto(`❌ Error: ${e.response?.data || e.message}`);
        }
    }
};