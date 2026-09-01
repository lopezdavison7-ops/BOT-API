// commands/nsfw/nsfw.js

const nsfwData = {
    spank: ["https://cdn.yuki-wabot.my.id/files/1Sve.mp4", "https://cdn.yuki-wabot.my.id/files/b8M6.mp4"],
    undress: ["https://cdn.yuki-wabot.my.id/files/p2g1.mp4", "https://cdn.yuki-wabot.my.id/files/nELt.mp4"],
    yuri: ["https://cdn.yuki-wabot.my.id/files/2GIM.mp4", "https://cdn.yuki-wabot.my.id/files/tVgt.mp4"],
    sixnine: ["https://cdn.yuki-wabot.my.id/files/kkqs.mp4", "https://cdn.yuki-wabot.my.id/files/QnUE.mp4"],
    anal: ["https://cdn.yuki-wabot.my.id/files/8d8D.mp4", "https://cdn.yuki-wabot.my.id/files/g8Mm.mp4"],
    fuck: ["https://cdn.yuki-wabot.my.id/files/GWLs.mp4", "https://cdn.yuki-wabot.my.id/files/cCQZ.mp4"],
    suckboobs: ["https://cdn.yuki-wabot.my.id/files/3bV7.mp4", "https://cdn.yuki-wabot.my.id/files/BT7m.mp4"],
    cummoth: ["https://cdn.yuki-wabot.my.id/files/LnRN.mp4", "https://cdn.yuki-wabot.my.id/files/h7YA.mp4"],
    cumshot: ["https://cdn.yuki-wabot.my.id/files/vkSu.mp4", "https://cdn.yuki-wabot.my.id/files/rj61.mp4"],
    cum: ["https://cdn.yuki-wabot.my.id/files/WgY8.mp4", "https://cdn.yuki-wabot.my.id/files/Sfg2.mp4"],
    lickpussy: ["https://cdn.yuki-wabot.my.id/files/YOkd.mp4", "https://cdn.yuki-wabot.my.id/files/8Ztq.mp4"],
    lickdick: ["https://cdn.yuki-wabot.my.id/files/Q3Wi.mp4", "https://cdn.yuki-wabot.my.id/files/XAwW.mp4"],
    lickass: ["https://cdn.yuki-wabot.my.id/files/1IHj.mp4", "https://cdn.yuki-wabot.my.id/files/9uiB.mp4"],
    handjob: ["https://cdn.yuki-wabot.my.id/files/vARz.mp4", "https://cdn.yuki-wabot.my.id/files/huzl.mp4"],
    grope: ["https://cdn.yuki-wabot.my.id/files/R66C.mp4", "https://cdn.yuki-wabot.my.id/files/x751.mp4"],
    grabboobs: ["https://cdn.yuki-wabot.my.id/files/0U8R.mp4", "https://cdn.yuki-wabot.my.id/files/BadN.mp4"],
    blowjob: ["https://cdn.yuki-wabot.my.id/files/3YNF.mp4", "https://cdn.yuki-wabot.my.id/files/ld7h.mp4"],
    boobjob: ["https://cdn.yuki-wabot.my.id/files/wNm2.mp4", "https://cdn.yuki-wabot.my.id/files/mtsj.mp4"],
    fap: ["https://cdn.yuki-wabot.my.id/files/VuiC.mp4", "https://cdn.yuki-wabot.my.id/files/7j6s.mp4"],
    footjob: ["https://cdn.yuki-wabot.my.id/files/0Yf0.mp4", "https://cdn.yuki-wabot.my.id/files/OsoL.mp4"],
    fingering: ["https://cdn.yuki-wabot.my.id/files/pw4t.mp4", "https://cdn.yuki-wabot.my.id/files/wclJ.mp4"],
    creampie: ["https://cdn.yuki-wabot.my.id/files/2i3e.mp4", "https://cdn.yuki-wabot.my.id/files/H26A.mp4"],
    facesitting: ["https://cdn.yuki-wabot.my.id/files/gVMP.mp4", "https://cdn.yuki-wabot.my.id/files/uWys.mp4"],
    futanari: ["https://cdn.yuki-wabot.my.id/files/sRkO.mp4", "https://cdn.yuki-wabot.my.id/files/j0ry.mp4"],
    pegging: ["https://cdn.yuki-wabot.my.id/files/J6pL.mp4", "https://cdn.yuki-wabot.my.id/files/lvZG.mp4"],
    bondage: ["https://cdn.yuki-wabot.my.id/files/LByq.mp4", "https://cdn.yuki-wabot.my.id/files/h5bF.mp4"],
    deepthroat: ["https://cdn.yuki-wabot.my.id/files/1Nog.mp4", "https://cdn.yuki-wabot.my.id/files/gEfE.mp4"],
    thighjob: ["https://cdn.yuki-wabot.my.id/files/XHTZ.mp4", "https://cdn.yuki-wabot.my.id/files/ZaiI.mp4"],
    yaoi: ["https://cdn.yuki-wabot.my.id/files/4saj.mp4", "https://cdn.yuki-wabot.my.id/files/q67x.mp4"],
    bukkake: ["https://cdn.yuki-wabot.my.id/files/wDKv.mp4", "https://cdn.yuki-wabot.my.id/files/TGjj.mp4"],
    orgy: ["https://cdn.yuki-wabot.my.id/files/W3lc.mp4", "https://cdn.yuki-wabot.my.id/files/hIvF.mp4"],
    squirting: ["https://cdn.yuki-wabot.my.id/files/j0in.mp4", "https://cdn.yuki-wabot.my.id/files/zRAF.mp4"],
    69: ["https://cdn.yuki-wabot.my.id/files/kkqs.mp4", "https://cdn.yuki-wabot.my.id/files/QnUE.mp4"]
};

const messages = {
    spank: { target: '🔥 @user1 le dio una buena nalgada a @user2 🍑', solo: '😳 @user1 se dio una nalgada a sí mismo/a...' },
    undress: { target: '😳 @user1 le está quitando la ropa a @user2 👀', solo: '👀 @user1 se quitó la ropa solo/a...' },
    yuri: { target: '👭 @user1 y @user2 están teniendo un momento yuri apasionado 🌸', solo: '🌸 @user1 está disfrutando de algo de yuri solo/a...' },
    sixnine: { target: '⚡ @user1 y @user2 están haciendo el 69 🥵', solo: '🤸 @user1 intentó hacer el 69 solo/a...' },
    anal: { target: '🔥 @user1 le está dando por el culo a @user2 🔞', solo: '👀 @user1 está pensando cosas anales...' },
    fuck: { target: '🔞 @user1 se está follando durísimo a @user2 🔥', solo: '😈 @user1 quiere follar con alguien...' },
    suckboobs: { target: '🤤 @user1 le está chupando los pechos a @user2 🍒', solo: '🤤 @user1 quiere chupar unos pechos...' },
    cummoth: { target: '💦 @user1 le llenó la boca de cum a @user2 🤤', solo: '😳 @user1 se vino en su propia boca...' },
    cumshot: { target: '💦 @user1 le lanzó una descarga de cum a @user2 🔥', solo: '💦 @user1 lanzó un chorro de cum al aire...' },
    cum: { target: '💦 @user1 se vino sobre @user2 🥵', solo: '💦 @user1 se vino solo/a...' },
    lickpussy: { target: '👅 @user1 le está lamiendo el coño a @user2 🤤', solo: '👅 @user1 quiere lamer un coño...' },
    lickdick: { target: '👅 @user1 le está lamiendo el pene a @user2 🤤', solo: '👅 @user1 quiere lamer un pene...' },
    lickass: { target: '👅 @user1 le está lamiendo el culo a @user2 🍑', solo: '👅 @user1 quiere lamer un culo...' },
    handjob: { target: '✋ @user1 le está haciendo una paja a @user2 ⚡', solo: '✋ @user1 se está haciendo una paja solo/a...' },
    grope: { target: '😈 @user1 le está manoseando todo a @user2 🥵', solo: '😈 @user1 se está manoseando solo/a...' },
    grabboobs: { target: '🍒 @user1 le agarró los pechos a @user2 😳', solo: '🍒 @user1 se agarró los pechos solo/a...' },
    blowjob: { target: '😮‍💨 @user1 le está haciendo una mamada a @user2 💦', solo: '😮‍💨 @user1 quiere dar una buena mamada...' },
    boobjob: { target: '🍒 @user1 le está haciendo una cubana a @user2 ⚡', solo: '🍒 @user1 quiere hacer una cubana...' },
    fap: { target: '✊ @user1 se está pajeando pensando en @user2 🥵', solo: '✊ @user1 se está pajeando solo/a...' },
    footjob: { target: '🦶 @user1 le está haciendo una paja con los pies a @user2 🤤', solo: '🦶 @user1 quiere hacer una paja con los pies...' },
    fingering: { target: '🖐️ @user1 le está metiendo los dedos a @user2 🌊', solo: '🖐️ @user1 se está masturbando con los dedos...' },
    creampie: { target: '🥧 @user1 le dejó una buena creampie a @user2 💦', solo: '🥧 @user1 sueña con hacer una creampie...' },
    facesitting: { target: '🍑 @user1 se le sentó en la cara a @user2 😮‍💨', solo: '🍑 @user1 quiere sentarse en la cara de alguien...' },
    futanari: { target: '🔥 @user1 y @user2 están disfrutando de algo de futanari ⚡', solo: '🔥 @user1 está viendo futanari solo/a...' },
    pegging: { target: '🍆 @user1 le está haciendo pegging a @user2 😈', solo: '🍆 @user1 busca a alguien para hacerle pegging...' },
    bondage: { target: '🪢 @user1 dejó amarrado/a a @user2 😈', solo: '🪢 @user1 se amarró solo/a...' },
    deepthroat: { target: '😮‍💨 @user1 le hace una garganta profunda a @user2 💦', solo: '😮‍💨 @user1 practica garganta profunda solo/a...' },
    thighjob: { target: '🍗 @user1 le hace una paja con los muslos a @user2 🤤', solo: '🍗 @user1 presume de muslos...' },
    yaoi: { target: '👬 @user1 y @user2 están en un momento yaoi muy caliente 🔥', solo: '👬 @user1 está viendo algo de yaoi solo/a...' },
    bukkake: { target: '💦 @user1 le dio un bukkake completo a @user2 🤤', solo: '💦 @user1 está organizando un bukkake...' },
    orgy: { target: '🔥 @user1 metió a @user2 en una orgía 🔞', solo: '🔥 @user1 quiere armar una orgía...' },
    squirting: { target: '🌊 @user1 hizo hacer squirt a @user2 💦', solo: '🌊 @user1 tuvo un squirt intenso solo/a...' },
    69: { target: '⚡ @user1 y @user2 están haciendo el 69 🥵', solo: '🤸 @user1 intentó hacer el 69 solo/a...' }
};

export default {
    nombre: 'nsfw',
    categoria: 'NSFW',
    alias: Object.keys(nsfwData),
    descripcion: 'Envía videos NSFW (spank, blowjob, 69, etc.)',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {
            // Obtener el comando usado. Tu estructura puede usar argumento o msg.command
            const cmd = (argumento || msg.text || '').split(' ')[0].replace(/[!./#]/g, '').toLowerCase();
            
            // Verificar si el comando existe en la lista (o usar el comando original del bot)
            const commandName = Object.keys(nsfwData).find(k => k === cmd) || msg.command;

            if (!commandName || !nsfwData[commandName]) {
                await responder.texto('❌ Comando NSFW no reconocido.');
                return;
            }

            const urls = nsfwData[commandName];
            const randomUrl = urls[Math.floor(Math.random() * urls.length)];
            const isImage = randomUrl.endsWith('.jpeg') || randomUrl.endsWith('.jpg') || randomUrl.endsWith('.png');

            // Obtener remitente
            const sender = msg.sender || msg.key.participant;
            const senderTag = `@${sender.split('@')[0]}`;

            // Obtener mencionado (si responde o menciona)
            let target = null;
            if (msg.mentionedJid && msg.mentionedJid.length > 0) {
                target = msg.mentionedJid[0];
            } else if (msg.quoted && msg.quoted.sender) {
                target = msg.quoted.sender;
            }

            let captionText = '';
            let mentionsArr = [sender];

            if (target && target !== sender) {
                const targetTag = `@${target.split('@')[0]}`;
                captionText = messages[commandName].target.replace('@user1', senderTag).replace('@user2', targetTag);
                mentionsArr.push(target);
            } else {
                captionText = messages[commandName].solo.replace('@user1', senderTag);
            }

            const content = isImage 
                ? { image: { url: randomUrl }, caption: captionText, mentions: mentionsArr }
                : { video: { url: randomUrl }, gifPlayback: true, caption: captionText, mentions: mentionsArr };

            await sock.sendMessage(msg.chat, content, { quoted: msg });

        } catch (error) {
            console.error('[NSFW] Error:', error);
            await responder.texto('❌ Error al ejecutar el comando NSFW.');
        }
    }
};