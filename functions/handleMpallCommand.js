const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mpall')
        .setDescription('Envoyer un message privé à tous les membres d\'un rôle spécifique')
        .addStringOption(option =>
            option.setName('role')
                .setDescription('Le rôle auquel envoyer le message')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Le message à envoyer en MP')
                .setRequired(true)),
    async execute(interaction) {
        const { options, member, guild } = interaction;

        // Vérification des permissions
        if (!member.roles.cache.some(role => role.name === 'Tyran')) {
            return interaction.reply({ content: 'Vous n\'avez pas la permission d\'utiliser cette commande.', ephemeral: true });
        }

        const roleId = options.getString('role');
        const messageContent = options.getString('message');
        const role = guild.roles.cache.find(role => role.id === roleId || role.name === roleId);

        if (!role) {
            return interaction.reply({ content: 'Rôle non trouvé.', ephemeral: true });
        }

        // Répondre à l'interaction pour éviter qu'elle n'expire
        await interaction.reply({ content: `Envoi des messages privés en cours...`, ephemeral: true });

        const membersWithRole = role.members;
        let sentMessages = 0;
        let failedMessages = 0;

        // Log de début d'envoi de messages
        console.log(`Envoi de messages à ${membersWithRole.size} membres du rôle ${role.name}`);

        for (const [memberId, member] of membersWithRole) {
            if (member && !member.user.bot) {
                try {
                    await member.send(messageContent);
                    sentMessages++;
                    // Attendre 1 seconde entre chaque envoi pour éviter les limites de taux
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (error) {
                    failedMessages++;
                    console.error(`Impossible d'envoyer un DM à ${member.user.tag}: ${error}`);
                }
            }
        }

        // Log de fin d'envoi de messages
        console.log(`Messages envoyés à ${sentMessages} membres sur ${membersWithRole.size}`);
        console.log(`Échecs d'envoi à ${failedMessages} membres`);

        // Mise à jour du message initial pour indiquer la fin de l'opération
        await interaction.editReply({ content: `Message envoyé à ${sentMessages} membres. Échec d'envoi à ${failedMessages} membres.` });
    }
};
