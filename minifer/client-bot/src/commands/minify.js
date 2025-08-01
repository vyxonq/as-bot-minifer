const { MessageEmbed } = require('discord.js');
const luaMinifierService = require('../services/luaMinifierService');

module.exports = {
    name: 'minify',
    description: 'Minify Lua code provided in a message or as an attachment.',
    async execute(message) {
        if (message.attachments.size > 0) {
            const attachment = message.attachments.first();
            if (attachment.name.endsWith('.lua')) {
                const luaCode = await fetch(attachment.url).then(res => res.text());
                const minifiedCode = await luaMinifierService.minify(luaCode);
                const embed = new MessageEmbed()
                    .setColor('#0099ff')
                    .setTitle('Minified Lua Code')
                    .setDescription(`\`\`\`lua\n${minifiedCode}\n\`\`\``);
                message.channel.send({ embeds: [embed] });
            } else {
                message.reply('Please upload a valid Lua file.');
            }
        } else if (message.content) {
            const luaCode = message.content;
            const minifiedCode = await luaMinifierService.minify(luaCode);
            const embed = new MessageEmbed()
                .setColor('#0099ff')
                .setTitle('Minified Lua Code')
                .setDescription(`\`\`\`lua\n${minifiedCode}\n\`\`\``);
            message.channel.send({ embeds: [embed] });
        } else {
            message.reply('Please provide Lua code to minify.');
        }
    },
};