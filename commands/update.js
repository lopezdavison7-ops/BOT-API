// commands/update.js
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default {
    nombre: 'update',
    categoria: 'Owner',
    alias: ['reiniciar', 'restart'],
    descripcion: 'Actualiza el bot (git pull) y lo reinicia',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {
            // Verificar si es el owner (opcional, ya tienes owner.js)
            // Si quieres restringirlo, puedes agregar una verificación aquí

            await responder.texto(`🔄 *ACTUALIZANDO...*\n\n⏳ Por favor espera, el bot se reiniciará en unos segundos.`);

            // Opcional: hacer git pull si tienes repositorio conectado
            try {
                const { stdout, stderr } = await execAsync('git pull');
                console.log('[UPDATE] git pull:', stdout);
                if (stderr) console.error('[UPDATE] git pull stderr:', stderr);
            } catch (error) {
                console.log('[UPDATE] No se pudo hacer git pull (quizás no hay repo o internet).');
            }

            // Opcional: si quieres esperar un poco antes de reiniciar
            setTimeout(async () => {
                // Reiniciar el proceso (esto mata el proceso actual y lo revive)
                process.exit(0); // Si usas PM2 o nodemon, esto lo reiniciará automáticamente
            }, 3000);

        } catch (error) {
            console.error('[UPDATE] Error:', error);
            await responder.texto('❌ Error al intentar actualizar/reiniciar.');
        }
    }
};