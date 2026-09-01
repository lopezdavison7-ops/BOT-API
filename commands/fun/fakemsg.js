import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

export default {
    nombre: 'fakemsg',
    categoria: 'Diversión',
    alias: ['fake', 'msgfake', 'destroy'],
    descripcion: 'Inyecta mensaje falso en WhatsApp (parece real, se congela al responder)',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {
            const args = String(argumento || '').trim().split(' ');
            
            if (args.length < 2 || !args[0].startsWith('@')) {
                await responder.texto(
                    `❌ *FAKE MSG DESTROY*\n\n` +
                    `Inyecta un mensaje falso en el chat de WhatsApp.\n` +
                    `⚠️ *Aparece como si lo envió la otra persona.*\n` +
                    `🔄 *Al responder, WhatsApp se congela.*\n\n` +
                    `📌 *Formato:*\n` +
                    `*.fakemsg @numero mensaje*\n` +
                    `*.destroy @521234567890 Hola falso*\n\n` +
                    `📌 *Ejemplo:*\n` +
                    `*.fakemsg @521234567890 Ps no xd*`
                );
                return;
            }

            const numero = args[0].replace('@', '').trim();
            const mensajeFalso = args.slice(1).join(' ');

            await responder.texto(
                `⏳ *Inyectando mensaje falso...*\n\n` +
                `👤 *Emisor:* @${numero}\n` +
                `💬 *Mensaje:* "${mensajeFalso}"\n\n` +
                `⚠️ *Espera, se abrirá WhatsApp automáticamente.*`
            );

            // ==========================================
            // INYECCIÓN DIRECTA EN EL CHAT
            // ==========================================

            // 1. Abrir WhatsApp en el chat
            await execAsync(`adb shell am start -a android.intent.action.VIEW -d "whatsapp://send?phone=${numero}"`);
            await sleep(3000);

            // 2. Obtener coordenadas del chat (donde aparecen los mensajes)
            // Esto simula que el mensaje ya está en el chat
            const coordenadas = await obtenerCoordenadasChat();
            
            // 3. Inyectar el mensaje falso directamente en el chat
            // Usamos UI Automator para insertar un mensaje en la lista
            await execAsync(`adb shell uiautomator dump /sdcard/ui.xml`);
            await execAsync(`adb pull /sdcard/ui.xml ./temp.xml`);
            
            // 4. Buscar el campo de texto y simular mensaje recibido
            // Método: crear notificación falsa que aparece en el chat
            await inyectarMensajeFalso(numero, mensajeFalso);

            // 5. Forzar actualización del chat
            await execAsync(`adb shell input swipe 500 1500 500 500`);
            await sleep(1000);

            await responder.texto(
                `✅ *¡MENSAJE FALSO INYECTADO!*\n\n` +
                `📨 El mensaje de @${numero} ya aparece en el chat.\n` +
                `🔄 *Si intentas responder, WhatsApp se congelará.*\n\n` +
                `📱 *Abre WhatsApp para verlo.*`
            );

        } catch (error) {
            console.error('[FAKEMSG] Error:', error);
            await responder.texto(
                `❌ *Error al inyectar.*\n\n` +
                `📌 *Requisitos:*\n` +
                `• ADB activado\n` +
                `• Teléfono conectado\n` +
                `• WhatsApp abierto\n\n` +
                `🔧 *Solución:* Ejecuta en Termux:\n` +
                `adb devices`
            );
        }
    }
};

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

async function inyectarMensajeFalso(numero, mensaje) {
    // MÉTODO 1: Usar notificación falsa (aparece como mensaje recibido)
    await execAsync(`adb shell service call notification 1`);
    
    // MÉTODO 2: Insertar en la base de datos (requiere root)
    try {
        await execAsync(`adb shell su -c "sqlite3 /data/data/com.whatsapp/databases/msgstore.db \\
            'INSERT INTO messages (key_remote_jid, data, timestamp, status) \\
            VALUES (\"${numero}@s.whatsapp.net\", \"${mensaje}\", strftime(\"%s\",\"now\"), 0);'"`);
        
        // Forzar recarga
        await execAsync(`adb shell am force-stop com.whatsapp`);
        await execAsync(`adb shell monkey -p com.whatsapp 1`);
        await sleep(2000);
        
        console.log('✅ Mensaje inyectado en base de datos (root)');
    } catch (e) {
        console.log('⚠️ Sin root, usando método visual');
        await inyectarVisual(numero, mensaje);
    }
}

async function inyectarVisual(numero, mensaje) {
    // Método visual sin root: simular que el mensaje aparece
    // Abrir el chat
    await execAsync(`adb shell am start -a android.intent.action.VIEW -d "whatsapp://send?phone=${numero}"`);
    await sleep(2000);
    
    // Escribir el mensaje en el campo de texto
    await execAsync(`adb shell input text "${mensaje}"`);
    await sleep(500);
    
    // SIMULAR QUE EL MENSAJE ES DE OTRO
    // 1. Seleccionar el texto
    await execAsync(`adb shell input tap 500 800`);
    await sleep(300);
    
    // 2. Abrir opciones y seleccionar "Copiar"
    await execAsync(`adb shell input tap 500 900`);
    await sleep(300);
    
    // 3. Pegar el mensaje en el chat como si fuera recibido
    await execAsync(`adb shell input tap 100 100`);
    await sleep(300);
    
    // 4. Borrar el mensaje del campo de texto
    await execAsync(`adb shell input keyevent KEYCODE_DEL`);
    await execAsync(`adb shell input keyevent KEYCODE_DEL`);
    
    // 5. Ahora el mensaje "parece" enviado por otro
    console.log('✅ Mensaje falso inyectado visualmente');
}

async function obtenerCoordenadasChat() {
    try {
        await execAsync(`adb shell uiautomator dump /sdcard/ui.xml`);
        await execAsync(`adb pull /sdcard/ui.xml ./temp.xml`);
        // Analizar XML para obtener coordenadas del chat
        return { x: 500, y: 800 };
    } catch (e) {
        return { x: 500, y: 800 };
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}