import {
    spawn
} from 'child_process';

const OWNERS_PRINCIPALES = ['50578391933', '50577455383'];

function numeroVisible(jid) {
    return String(jid).split('@')[0].split(':')[0].replace(/\D/g, '');
}

async function esOwner(sock, msg) {
    const candidatos = [
        msg.key.participant, msg.key.senderPn, msg.key.participantAlt,
        msg.key.sender, msg.key.remoteJid
    ].filter(Boolean);

    for (const c of candidatos) {
        if (OWNERS_PRINCIPALES.includes(numeroVisible(c))) return true;
    }

    try {
        for (const c of candidatos) {
            if (String(c).endsWith('@lid') && sock?.signalRepository?.lidMapper?.getPNForLid) {
                const pn = await sock.signalRepository.lidMapper.getPNForLid(c);
                if (pn && OWNERS_PRINCIPALES.includes(numeroVisible(pn))) return true;
            }
        }
    } catch (e) {}

    return false;
}

export default {

    nombre: 'reiniciar',

    categoria: 'Owner',

    alias: [
        'restart',
        'reboot'
    ],

    owner: true,

    descripcion:
        'Reinicia el proceso del bot.',

    ejecutar: async ({
        sock,
        msg,
        responder
    }) => {

        if (!(await esOwner(sock, msg))) {
            return await responder.texto(
                '╭━━〔 🔒 𝐀𝐂𝐂𝐄𝐒𝐎 𝐃𝐄𝐍𝐄𝐆𝐀𝐃𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ ⛔ Este comando es exclusivo\n' +
                '┃    para el *Owner principal*\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        try {

            await responder.texto(
                '╭━━〔 🔄 𝐑𝐄𝐈𝐍𝐈𝐂𝐈𝐀𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ ♻️ Reiniciando BOT-API...\n' +
                '┃ ⏳ Espera unos segundos.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            const hijo =
                spawn(
                    process.execPath,
                    process.argv.slice(1),
                    {
                        cwd: process.cwd(),
                        detached: true,
                        stdio: 'inherit',
                        env: process.env
                    }
                );

            hijo.unref();

            setTimeout(() => {

                process.exit(0);

            }, 1000);

        } catch (error) {

            console.error(
                '[REINICIAR] Error:',
                error
            );

            await responder.texto(
                '❌ *REINICIAR*\n\n' +
                'No se pudo reiniciar el bot.\n\n' +
                `⚠️ ${error.message}`
            );
        }
    }
};