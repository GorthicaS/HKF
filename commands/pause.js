const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Met en pause la chanson en cours de lecture.'),
    async execute(interaction) {
        const queue = interaction.client.player.getQueue(interaction.guildId);
        if (!queue || !queue.playing) {
            return interaction.reply('Aucune chanson en cours de lecture.');
        }

        queue.setPaused(true);
        await interaction.reply('Musique en pause.');
    }
};
