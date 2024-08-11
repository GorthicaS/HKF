const { SlashCommandBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('@discordjs/builders');
const { QueryType } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Joue une chanson à partir d\'un lien ou d\'un titre.')
        .addStringOption(option =>
            option.setName('input')
                .setDescription('Le lien ou le titre de la chanson')
                .setRequired(true)),
    async execute(interaction) {
        const input = interaction.options.getString('input');

        const channel = interaction.member.voice.channel;
        if (!channel) {
            return interaction.reply('Vous devez être dans un canal vocal pour utiliser cette commande.');
        }

        const queue = interaction.client.player.createQueue(interaction.guild.id, {
            metadata: {
                channel: interaction.channel
            }
        });

        try {
            if (!queue.connection) await queue.connect(channel);
        } catch {
            queue.destroy();
            return interaction.reply('Erreur lors de la connexion au canal vocal.');
        }

        const result = await interaction.client.player.search(input, {
            requestedBy: interaction.user,
            searchEngine: QueryType.AUTO
        });

        if (!result || !result.tracks.length) return interaction.reply('Aucune chanson trouvée.');

        const track = result.tracks[0];
        queue.addTrack(track);

        if (!queue.playing) await queue.play();

        // Création des boutons
        const pauseButton = new ButtonBuilder()
            .setCustomId('pause')
            .setLabel('Pause')
            .setStyle(ButtonStyle.Primary);

        const skipButton = new ButtonBuilder()
            .setCustomId('skip')
            .setLabel('Skip')
            .setStyle(ButtonStyle.Primary);

        const voteUpButton = new ButtonBuilder()
            .setCustomId('vote_up')
            .setLabel('👍')
            .setStyle(ButtonStyle.Success);

        const voteDownButton = new ButtonBuilder()
            .setCustomId('vote_down')
            .setLabel('👎')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder()
            .addComponents(pauseButton, skipButton, voteUpButton, voteDownButton);

        await interaction.reply({ content: `Lecture de ${track.title}`, components: [row] });
    }
};
