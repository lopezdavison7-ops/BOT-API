// ============================================================
// COMANDO VERDAD (.verdad)
// ============================================================

import { obtenerMencionesFijas } from './utilsJuegos.js';

const VERDADES = [
    "驴Cu谩l es tu mayor miedo?",
    "驴Cu谩l es el peor regalo que has recibido?",
    "驴Has mentido alguna vez para no salir?",
    "驴Cu谩l es tu peor h谩bito?",
    "驴Qu茅 es lo m谩s vergonzoso que te ha pasado?",
    "驴A qui茅n le has enviado el 煤ltimo mensaje?",
    "驴Cu谩l es tu comida favorita?",
    "驴Has llorado por alguien?",
    "驴Cu谩l es tu mayor secreto?",
    "驴Qui茅n es tu crush del grupo?",
    "驴Cu谩l es la peor mentira que has dicho?",
    "驴Qu茅 har铆as si fueras invisible por un d铆a?",
    "驴Cu谩l es tu peor foto?",
    "驴Has stalkeado a alguien en redes?",
    "驴Cu谩l es tu canci贸n m谩s escuchada?",
    "驴Te arrepientes de algo?",
    "驴Cu谩l es tu peor pesadilla?",
    "驴Has robado algo alguna vez?",
    "驴A qui茅n enviar铆as un mensaje a las 3am?",
    "驴Cu谩l es tu mayor inseguridad?"
];

const RETOS = [
    "Manda un audio cantando tu canci贸n favorita",
    "Cambia tu foto de perfil por 1 hora",
    "Escribe un mensaje rom谩ntico al 3er contacto",
    "Haz 10 sentadillas y manda video",
    "Di 'te amo' al 煤ltimo mensaje que recibiste",
    "Manda tu 煤ltima foto de la galer铆a",
    "Habla con acento extranjero por 5 minutos",
    "Cuenta un chiste malo al grupo",
    "Haz una confesi贸n falsa y convence a todos",
    "Manda un selfie con cara de pato",
    "Escribe tu nombre con la nariz en una nota",
    "Baila donde est谩s y manda video",
    "Llama a alguien y c谩ntale feliz cumplea帽os",
    "Dibuja algo con los ojos cerrados y m谩ndalo",
    "Haz 20 saltos y cuenta en voz alta",
    "Manda un audio rapeando",
    "Imita a alguien del grupo por audio",
    "Escribe un poema de 4 versos y m谩ndalo",
    "Haz una cara graciosa y m谩ndala de foto",
    "Cuenta tu peor chiste al grupo"
];

export default {
    nombre: 'verdad',
    categoria: 'Diversi贸n',
    alias: ['reto', 'vrd', 'dare'],

    async ejecutar({ sock, msg, args, prefijo }) {
        const jid = msg?.key?.remoteJid;
        const autorJid = msg?.key?.participant || msg?.key?.remoteJid;
        const num = autorJid.split('@')[0];

        try {
            const { jids: menciones, texto: txtMenciones } = await obtenerMencionesFijas();
            const mencionesTotal = [...new Set([autorJid, ...menciones])];

            const modo = args[0]?.toLowerCase();
            let tipo, contenido;

            if (modo === 'reto' || modo === 'dare') {
                tipo = 'RETO';
                contenido = RETOS[Math.floor(Math.random() * RETOS.length)];
            } else {
                tipo = 'VERDAD';
                contenido = VERDADES[Math.floor(Math.random() * VERDADES.length)];
            }

            let texto = '馃憢 隆Hola @' + num + '! 鉁╘n\n';
            texto += '鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻癨n\n';
            texto += '           馃幁  *' + tipo + '*  馃幁\n';
            texto += '        路 路 路  饾挶饾惛饾憛饾挓饾挏饾挓  饾挭  饾憛饾惛饾挴饾挭  路 路 路\n\n';
            texto += '鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻癨n\n';
            texto += '  馃幆  ' + contenido + '\n\n';
            texto += '  鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹佲攣鈹乗n\n';
            texto += '  馃挕  Usa *' + prefijo + 'verdad* para otra verdad\n';
            texto += '  馃挕  Usa *' + prefijo + 'verdad reto* para un reto\n\n';
            texto += '鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻扳柊鈻�';

            await sock.sendMessage(jid, { text: texto, mentions: mencionesTotal }, { quoted: msg });

        } catch (error) {
            console.error('[VERDAD] Error:', error);
            await sock.sendMessage(jid, { text: '鉂� Error: ' + error.message }, { quoted: msg });
        }
    }
};
