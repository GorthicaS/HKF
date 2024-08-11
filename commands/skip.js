const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Passe à la chanson suivante dans la file d\'attente.'),
    async execute(interaction) {
        const queue = interaction.client.player.getQueue(interaction.guildId);
        if (!queue || !queue.playing) {
            return interaction.reply('Aucune chanson en cours de lecture.');
        }

        queue.skip();
        await interaction.reply('Chanson suivante.');
    }
};
