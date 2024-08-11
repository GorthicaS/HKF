const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');
const moment = require('moment');
const fs = require('fs');
const path = require('path');

const trackingDataPath = path.join(__dirname, '../trackingData.json');

function loadTrackingData() {
    if (!fs.existsSync(trackingDataPath)) {
        return {};
    }
    const data = fs.readFileSync(trackingDataPath);
    return JSON.parse(data);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('news')
        .setDescription('Liste les nouveaux membres avec le rôle "New Friends".'),
    async execute(interaction) {
        const guild = interaction.guild;
        const role = guild.roles.cache.find(r => r.name === 'New Friends');

        if (!role) {
            return interaction.reply('Rôle "New Friends" non trouvé.');
        }

        let trackingData = loadTrackingData();
        let newMembers = [];

        const members = await guild.members.fetch();
        members.forEach(member => {
            if (member.roles.cache.has(role.id)) {
                const memberData = trackingData[member.id];
                if (memberData) {
                    const joinedAt = moment(memberData.joinedAt).format('DD/MM/YYYY');
                    const endDate = moment(memberData.joinedAt).add(2, 'weeks').format('DD/MM/YYYY');
                    const voiceTime = Math.floor(memberData.voiceTime / 60); // Convertir le temps vocal en minutes
                    newMembers.push({
                        tag: member.user.tag,
                        nickname: member.nickname || member.user.username,
                        joinedAt: joinedAt,
                        endDate: endDate,
                        voiceTime: voiceTime
                    });
                }
            }
        });

        if (newMembers.length === 0) {
            return interaction.reply('Aucun nouveau membre trouvé.');
        }

        const embeds = [];
        const chunkSize = 25;
        for (let i = 0; i < newMembers.length; i += chunkSize) {
            const chunk = newMembers.slice(i, i + chunkSize);
            const embed = new EmbedBuilder()
                .setTitle('Nouveaux membres')
                .setColor(0x00AE86)
                .setDescription('Liste des membres avec le rôle "New Friends".')
                .addFields(
                    chunk.map(member => ({
                        name: member.nickname,
                        value: `Date d'arrivée : ${member.joinedAt}\nFin de nouveau : ${member.endDate}\nTemps en vocal : ${member.voiceTime} minutes`
                    }))
                );
            embeds.push(embed);
        }

        for (const embed of embeds) {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [embed] });
            } else {
                await interaction.reply({ embeds: [embed] });
            }
        }
    }
};
