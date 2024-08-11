// functions/handlePlanningCommand.js
const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('planning')
        .setDescription('Proposez des jeux pour une animation')
        .addStringOption(option =>
            option.setName('jeu1')
                .setDescription('Nom du jeu 1')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('mode1')
                .setDescription('Mode du jeu 1 (Débutant, Chill, Tryhard)')
                .setRequired(false)
                .addChoices(
                    { name: 'Débutant', value: 'Débutant' },
                    { name: 'Chill', value: 'Chill' },
                    { name: 'Tryhard', value: 'Tryhard' }
                ))
        .addStringOption(option =>
            option.setName('jeu2')
                .setDescription('Nom du jeu 2')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('mode2')
                .setDescription('Mode du jeu 2 (Débutant, Chill, Tryhard)')
                .setRequired(false)
                .addChoices(
                    { name: 'Débutant', value: 'Débutant' },
                    { name: 'Chill', value: 'Chill' },
                    { name: 'Tryhard', value: 'Tryhard' }
                )),
    async execute(interaction) {
        const { options, member } = interaction;
        if (!member.roles.cache.some(role => role.name === 'Animateur')) {
            return interaction.reply({ content: 'Vous n\'avez pas la permission d\'utiliser cette commande.', ephemeral: true });
        }

        const jeu1 = options.getString('jeu1');
        const mode1 = options.getString('mode1') || 'Non spécifié';
        const jeu2 = options.getString('jeu2');
        const mode2 = options.getString('mode2') || 'Non spécifié';

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Participeriez-vous ?')
            .setDescription(`**Jeu 1: ${jeu1} (${mode1})**`)
            .addFields({ name: '1️⃣ Jeu 1 (0 participants):', value: 'Aucun participant', inline: false });

        if (jeu2) {
            embed.setDescription(embed.data.description + `\n**Jeu 2: ${jeu2} (${mode2})**`);
            embed.addFields(
                { name: '2️⃣ Jeu 2 (0 participants):', value: 'Aucun participant', inline: false },
                { name: '🔁 Les deux jeux (0 participants):', value: 'Aucun participant', inline: false }
            );
        }

        embed.addFields({ name: '❌ Pas intéressé (0 participants):', value: 'Aucun participant', inline: false });

        const planningMessage = await interaction.reply({ embeds: [embed], fetchReply: true });
        await planningMessage.react('1️⃣');
        if (jeu2) {
            await planningMessage.react('2️⃣');
            await planningMessage.react('🔁');
        }
        await planningMessage.react('❌');

        const filter = (reaction, user) => {
            return ['1️⃣', '2️⃣', '🔁', '❌'].includes(reaction.emoji.name) && !user.bot;
        };

        const collector = planningMessage.createReactionCollector({ filter, dispose: true });

        collector.on('collect', async (reaction, user) => {
            if (!user.bot) {
                await handleReaction(reaction, user, planningMessage, false);
            }
        });

        collector.on('remove', async (reaction, user) => {
            if (!user.bot) {
                await handleReaction(reaction, user, planningMessage, true);
            }
        });
    }
};

async function handleReaction(reaction, user, message, isRemove) {
    const embed = message.embeds[0];
    const fields = embed.fields.map(field => {
        const parts = field.value.split('\n');
        let users = parts.filter(u => u !== 'Aucun participant' && u !== user.username);

        if (!isRemove && reaction.emoji.name === field.name[0]) {
            users.push(user.username);
        }

        const newCount = users.length;
        return {
            name: field.name.replace(/\(\d+ participants\)/, `(${newCount} participants)`),
            value: `${users.length > 0 ? users.join('\n') : 'Aucun participant'}`,
            inline: false
        };
    });

    embed.fields = fields;
    await message.edit({ embeds: [embed] });
}
