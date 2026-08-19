// commands/chiste.js
module.exports = {
  name: 'chiste',
  description: 'Cuenta un chiste aleatorio',
  run: async (client, message, args) => {
    const chistes = [
      '¿Qué le dice un taco a otro? ¿Vamos a la fiesta? ¡No, estamos en la salsa!',
      '¿Cuál es el animal más antiguo? La cebra, porque está en blanco y negro.',
      '¿Qué hace una abeja en el gimnasio? ¡Zum-ba!',
      '¿Cómo se llama el campeón de buceo japonés? Tokofondo.',
      '¿Por qué los pájaros no usan Facebook? Porque ya tienen Twitter.'
    ];
    const random = chistes[Math.floor(Math.random() * chistes.length)];
    
    const respuesta = `
╭〔 😂 𝐂𝐇𝐈𝐒𝐓𝐄 〕⬣
┃
┃ ❓ *.chiste*
┃
┃ ${random}
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣
`;
    await message.reply(respuesta);
  }
};