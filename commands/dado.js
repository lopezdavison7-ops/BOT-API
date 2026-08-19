// commands/dado.js
module.exports = {
  name: 'dado',
  description: 'Tira un dado de 6 caras',
  run: async (client, message, args) => {
    const resultado = Math.floor(Math.random() * 6) + 1;
    
    const respuesta = `
╭〔 🎲 𝐃𝐀𝐃𝐎 〕⬣
┃
┃ ❓ *.dado*
┃
┃ El dado cayó en **${resultado}** 🎯
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣
`;
    await message.reply(respuesta);
  }
};