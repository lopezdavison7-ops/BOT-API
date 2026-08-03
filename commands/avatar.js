export default {
    nombre: 'avatar',
    alias: ['foto', 'pfp'],
    descripcion: 'Foto de perfil de un número. Uso: .avatar 549XXXXXXXX',
    ejecutar: async ({ sock, responder, argumento }) => {
        const numero = argumento.replace(/[^0-9]/g, '');
        if (!numero) return responder.texto('Manda un número con código de país. Ej: .avatar 50499999999');
        try {
            const url = await sock.profilePictureUrl(`${numero}@s.whatsapp.net`, 'image');
            await responder.imagen(url, `Foto de perfil de ${numero}`);
        } catch (e) {
            await responder.texto('No se pudo obtener la foto (puede ser privada o el número no está en WhatsApp).');
        }
    }
};