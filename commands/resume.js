const { SlashCommandBuilder } = require('@discordjs/builders');
const { getVoiceConnection } = require('@discordjs/voice');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Reprend la musique.'),
    async execute(interaction) {
        const connection = getVoiceConnection(interaction.guild.id);
        if (!connection) {
            return interaction.reply('Je ne suis pas connecté à un canal vocal.');
        }

        const player = connection.state.subscription.player;
        player.unpause();

        await interaction.reply('Musique reprise.');
    }
};
