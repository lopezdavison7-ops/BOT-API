// commands/owner/eval.js
import util from "util";

export default {

    nombre: 'eval',

    categoria: 'Owner',

    alias: [
        'evaluar',
        'ev'
    ],

    owner: true,

    descripcion:
        'Evalúa código JavaScript.',

    ejecutar: async ({
        sock,
        msg,
        responder,
        argumento
    }) => {

        if (!argumento) {

            await responder.texto(
                '⚙️ *ᴇᴠᴀʟ*\n\n' +
                '> Ingresa código JavaScript!\n\n' +
                'Ejemplo:\n' +
                '> .eval 1 + 1\n' +
                '> .eval msg.key\n' +
                '> .eval sock.user'
            );

            return;

        }

        let result;
        let isError = false;

        try {

            result = await eval("(async () => { " + argumento + " })()");

        } catch (e) {

            isError = true;
            result = e;

        }

        let output;

        if (typeof result === "undefined") {

            output = "undefined";

        } else if (result === null) {

            output = "null";

        } else if (typeof result === "object") {

            try {

                output = util.inspect(result, {
                    depth: 3,
                    maxArrayLength: 50
                });

            } catch {

                output = String(result);

            }

        } else {

            output = String(result);

        }

        if (output.length > 3000) {

            output = output.slice(0, 3000) + "\n... truncado";

        }

        const status = isError
            ? "❌ Error"
            : "✅ Success";

        const type = isError
            ? result?.name || "Error"
            : typeof result;

        await responder.texto(
            `⚙️ *ᴇᴠᴀʟ ʀᴇsᴜʟᴛ*\n\n` +
            `╭┈┈⬡「 📋 *ɪɴғᴏ* 」\n` +
            `┃ ${status}\n` +
            `┃ Type: ${type}\n` +
            `╰┈┈┈┈┈┈┈┈⬡\n\n` +
            `\`\`\`\n${output}\n\`\`\``
        );

    }
};
