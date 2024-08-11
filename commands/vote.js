const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const path = require('path');

const votesPath = path.join(__dirname, '../votes.json');

if (!fs.existsSync(votesPath)) {
    fs.writeFileSync(votesPath, JSON.stringify({}, null, 2));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vote')
        .setDescription('Vote pour une chanson.')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type de vote')
                .setRequired(true)
                .addChoices(
                    { name: 'J\'aime', value: 'up' },
                    { name: 'Je n\'aime pas', value: 'down' }
                )),
    async execute(interaction) {
        const userId = interaction.user.id;
        const currentSong = require('./play').getCurrentSong();

        if (!currentSong) {
            return interaction.reply('Aucune chanson en cours de lecture.');
        }

        let votes = JSON.parse(fs.readFileSync(votesPath));
        if (!votes[currentSong]) {
            votes[currentSong] = { up: [], down: [] };
        }

        votes[currentSong].up = votes[currentSong].up.filter(id => id !== userId);
        votes[currentSong].down = votes[currentSong].down.filter(id => id !== userId);

        const voteType = interaction.options.getString('type');
        if (voteType === 'up') {
            votes[currentSong].up.push(userId);
        } else {
            votes[currentSong].down.push(userId);
        }

        fs.writeFileSync(votesPath, JSON.stringify(votes, null, 2));

        await interaction.reply(`Votre vote a été enregistré: ${voteType === 'up' ? '👍' : '👎'}`);
    }
};
