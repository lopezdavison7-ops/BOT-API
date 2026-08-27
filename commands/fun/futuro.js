export default {
    nombre: 'futuro',
    categoria: 'fun',
    alias: ['predecir', 'futuro', 'oraculo'],
    descripcion: 'Predicción gratis.prediccion @user',
    ejecutar: async ({ sock, msg, jid }) => {
        const s = global.conns?.[0] || Object.values(global.conns)[0];
        const jugador = msg.key.participant || msg.key.remoteJid;
        const mencionado = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        const objetivo = mencionado || jugador;

        const predicciones = [
            // BUENAS
            "🔮 *Predicción:* Veo éxito en tu futuro",
            "🌟 *Predicción:* Algo bueno viene pronto",
            "💫 *Predicción:* Una sorpresa te espera",
            "💰 *Predicción:* El dinero llegará a tu vida",
            "💑 *Predicción:* El amor tocará tu puerta",
            "🎲 *Predicción:* Tendrás suerte en los juegos",
            "👑 *Predicción:* Serás el más rico del grupo",
            "🌈 *Predicción:* Se cumplen tus deseos",
            "🚀 *Predicción:* Vas a subir de nivel pronto",
            "💎 *Predicción:* Encontrarás algo valioso",

            // AMOR/AMISTAD
            "💌 *Predicción:* Alguien piensa mucho en ti",
            "💕 *Predicción:* Un ex volverá a hablarte",
            "👥 *Predicción:* Harás un nuevo mejor amigo",
            "💍 *Predicción:* Boda a la vista en tu familia",

            // PLATA/TRABAJO
            "💼 *Predicción:* Te ofrecen un mejor trabajo",
            "📈 *Predicción:* Tu negocio va a explotar",
            "🎁 *Predicción:* Recibirás un regalo costoso",
            "🏦 *Predicción:* Te cae plata inesperada",

            // MALAS/GRACIOSAS
            "💀 *Predicción:* Veo que perderás apostando",
            "🍀 *Predicción:* Tu suerte está dormida hoy",
            "😈 *Predicción:* Te van a trolear en el grupo",
            "🤡 *Predicción:* Harás el ridículo esta semana",
            "🥲 *Predicción:* Te quedas sin saldo mañana",
            "🧠 *Predicción:* Se te olvida algo importante",

            // MISTERIOSAS
            "🌙 *Predicción:* Tendrás un sueño revelador",
            "⚡ *Predicción:* Algo inesperado pasará hoy",
            "🔥 *Predicción:* Tu energía atrae cosas grandes",
            "🌀 *Predicción:* Un giro inesperado cambia todo",
            "👁️ *Predicción:* Alguien te está stalkeando",
            "🎭 *Predicción:* Descubrirás un secreto",
            "🏆 *Predicción:* Ganarás una competencia",
            "📱 *Predicción:* Te llega un mensaje importante"
        ];

        const prediccion = predicciones[Math.floor(Math.random() * predicciones.length)];

        const texto = `📜 *ORÁCULO DEL DEMI BOT* 📜\n\nPara @${objetivo.split('@')[0]}\n\n${prediccion}`;

        await s.sendMessage(jid, {
            text: texto,
            mentions: [objetivo]
        });
    }
}