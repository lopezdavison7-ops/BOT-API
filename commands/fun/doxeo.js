// commands/fun/doxeo.js
export default {
    nombre: 'doxeo',
    categoria: 'Diversión',
    alias: ['dox', 'fakedox', 'info'],
    descripcion: 'Simula un doxeo falso realista basado en el número del usuario',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {
            let target = null;
            let numeroBase = '';

            // FORMA 1: Respondiendo a un mensaje
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
            if (quoted) {
                target = quoted;
                numeroBase = target.split('@')[0];
            }

            // FORMA 2: Mención (@usuario)
            const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            if (mentioned.length > 0) {
                target = mentioned[0];
                numeroBase = target.split('@')[0];
                if (quoted && mentioned.length > 0) {
                    target = mentioned[0];
                    numeroBase = target.split('@')[0];
                }
            }

            // Si no hay mención ni respuesta, usar al que ejecuta
            if (!target) {
                target = msg.key.participant || msg.key.remoteJid;
                numeroBase = target.split('@')[0];
            }

            // 🔥 GENERAR DATOS ÚNICOS BASADOS EN EL NÚMERO COMPLETO
            // Usamos el número como semilla para que siempre dé el mismo resultado
            const seed = parseInt(numeroBase.slice(-4)) || 1234;

            // Listas ampliadas y realistas
            const nombresReales = [
                'Carlos Andrés Martínez', 'María Fernanda García', 'Jorge Luis Pérez',
                'Ana Sofía López', 'Luis Enrique Rodríguez', 'Laura Valentina Fernández',
                'Pedro Alejandro Sánchez', 'Carla Gabriela Díaz', 'Andrés Felipe Ruiz',
                'Valentina Sofía Torres', 'Diego Armando Reyes', 'Paula Andrea Castro',
                'Juan Pablo Morales', 'Natalia Andrea Rojas', 'Oscar Eduardo Mendoza'
            ];

            const edades = ['18', '21', '24', '26', '29', '32', '35', '38', '41', '44', '47'];

            const ciudades = [
                'Bogotá D.C.', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena',
                'Bucaramanga', 'Pereira', 'Santa Marta', 'Manizales', 'Villavicencio',
                'Cúcuta', 'Ibagué', 'Pasto', 'Neiva', 'Popayán'
            ];

            const telefonosReales = [
                '300 123 4567', '310 987 6543', '320 456 7890', '301 234 5678',
                '315 789 1234', '313 456 7890', '317 234 5678', '314 987 6543'
            ];

            const dominiosCorreo = ['@gmail.com', '@hotmail.com', '@yahoo.com', '@outlook.com', '@live.com'];

            const ips = [
                '192.168.1.45', '10.0.0.112', '172.16.0.89', '8.8.8.8', '1.1.1.1',
                '192.168.0.15', '10.10.10.10', '172.31.0.1'
            ];

            const redesSociales = ['Facebook', 'Instagram', 'TikTok', 'Twitter/X', 'Snapchat', 'Discord'];

            const bancosReales = [
                'Bancolombia', 'Davivienda', 'BBVA', 'Banco de Bogotá', 'Nequi',
                'Daviplata', 'Bancaribe', 'Coomeva', 'Banco Popular'
            ];

            const gustosReales = [
                'Anime y manga', 'Fútbol', 'Videojuegos', 'Música urbana', 'Comer en restaurantes',
                'Dormir y ver series', 'Programar y tecnología', 'Hacer ejercicio', 'Viajar'
            ];

            const estadosCiviles = ['Soltero/a', 'Casado/a', 'Union Libre', 'Viudo/a', 'En pareja'];

            // 🔥 SELECCIONAR DATOS SEGÚN EL NÚMERO
            // Usamos operaciones matemáticas simples con el seed
            const nombre = nombresReales[seed % nombresReales.length];
            const edad = edades[seed % edades.length];
            const ciudad = ciudades[seed % ciudades.length];
            const telefono = telefonosReales[seed % telefonosReales.length];
            const email = `${nombre.toLowerCase().replace(/\s/g, '.')}${dominiosCorreo[seed % dominiosCorreo.length]}`;
            const ip = ips[seed % ips.length];
            const red = redesSociales[seed % redesSociales.length];
            const banco = bancosReales[seed % bancosReales.length];
            const gusto = gustosReales[seed % gustosReales.length];
            const estadoCivil = estadosCiviles[seed % estadosCiviles.length];

            // 🔥 GENERAR FECHA DE NACIMIENTO REALISTA
            const dia = (seed % 28) + 1;
            const mes = (seed % 12) + 1;
            const año = new Date().getFullYear() - parseInt(edad);
            const fechaNacimiento = `${dia.toString().padStart(2, '0')}/${mes.toString().padStart(2, '0')}/${año}`;

            // 🔥 GENERAR CÉDULA (número de identificación)
            const cedula = `1.${seed.toString().padStart(8, '0')}`;

            // Mensaje final con formato ultra realista
            const respuesta = `
╭〔 🔒 𝐈𝐍𝐅𝐎𝐑𝐌𝐀𝐂𝐈𝐎𝐍 𝐂𝐎𝐍𝐅𝐈𝐃𝐄𝐍𝐂𝐈𝐀𝐋 〕⬣
┃
┃ 👤 Usuario: @${numeroBase}
┃
┃ 📄 Nombre completo: ${nombre}
┃
┃ 🪪 Documento: ${cedula}
┃
┃ 🎂 Fecha de nacimiento: ${fechaNacimiento}
┃
┃ 📍 Ciudad de residencia: ${ciudad}
┃
┃ 💍 Estado civil: ${estadoCivil}
┃
┃ 📱 Teléfono: ${telefono}
┃
┃ 📧 Correo electrónico: ${email}
┃
┃ 🌐 Dirección IP: ${ip}
┃
┃ 💳 Entidad bancaria: ${banco}
┃
┃ 🎮 Intereses: ${gusto}
┃
┃ 🐦 Red social principal: ${red}
┃
┃ ⚠️ *ESTA INFORMACIÓN ES GENERADA ALEATORIAMENTE*
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣
`;

            await sock.sendMessage(msg.key.remoteJid, {
                text: respuesta,
                mentions: [target]
            }, { quoted: msg });

        } catch (error) {
            console.error('[DOXEO] Error:', error);
            await responder.texto('❌ Error al generar la información.');
        }
    }
};