const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const moment = require('moment');

const lfgSessions = {}; // Stocker les sessions par message ID

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lfg')
        .setDescription('Créer un groupe de jeu')
        .addStringOption(option =>
            option.setName('jeu')
                .setDescription('Nom du jeu')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('participants')
                .setDescription('Nombre de participants')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('time')
                .setDescription('Heure de début')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('date')
                .setDescription('Date du jeu')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('mode')
                .setDescription('Mode du jeu')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('map')
                .setDescription('Nom de la map')
                .setRequired(false)),

    async execute(interaction) {
        const jeu = interaction.options.getString('jeu');
        const maxParticipants = interaction.options.getInteger('participants');
        const time = interaction.options.getString('time');
        const date = interaction.options.getString('date');
        const mode = interaction.options.getString('mode') || 'Standard';
        const map = interaction.options.getString('map') || 'Non spécifiée';

        // Créer une session unique pour cette interaction
        const sessionId = interaction.id;
        lfgSessions[sessionId] = {
            participantsList: [],
            unsureList: [],
            declineList: [],
            history: []
        };

        const embed = new EmbedBuilder()
            .setTitle(`📅 **${jeu}**`)
            .setDescription(`**Date:** ${date}\n**Heure:** ${time}\n**Mode:** ${mode}\n**Map:** ${map}`)
            .setColor('#00AAFF')
            .addFields(
                { name: `👥 Participants (0/${maxParticipants})`, value: 'Aucun participant pour le moment.', inline: false },
                { name: '🤔 Incertains', value: 'Aucun utilisateur incertain pour le moment.', inline: false },
                { name: '⛔ Historique des déclinaisons', value: 'Aucun utilisateur n\'a décliné pour le moment.', inline: false }
            )
            .setFooter({ text: 'Rejoignez, quittez ou marquez-vous comme incertain' });

        const joinButton = new ButtonBuilder()
            .setCustomId(`join_${sessionId}`)
            .setLabel('Rejoindre')
            .setStyle(ButtonStyle.Success);

        const unsureButton = new ButtonBuilder()
            .setCustomId(`unsure_${sessionId}`)
            .setLabel('Je ne sais pas')
            .setStyle(ButtonStyle.Secondary);

        const leaveButton = new ButtonBuilder()
            .setCustomId(`leave_${sessionId}`)
            .setLabel('Quitter')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(joinButton, unsureButton, leaveButton);

        const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

        const filter = i => i.customId.endsWith(`_${sessionId}`) && !i.user.bot;
        const collector = message.createMessageComponentCollector({ filter, time: 24 * 60 * 60 * 1000 });

        collector.on('collect', async i => {
            const usernameWithTime = `${i.user.tag} (${moment().format('HH:mm')})`;

            if (i.customId.startsWith('join')) {
                if (lfgSessions[sessionId].participantsList.some(p => p.startsWith(i.user.tag))) {
                    await i.reply({ content: 'Vous êtes déjà dans le groupe.', ephemeral: true });
                } else {
                    if (lfgSessions[sessionId].participantsList.length < maxParticipants) {
                        lfgSessions[sessionId].participantsList.push(usernameWithTime);
                        lfgSessions[sessionId].history.push(`${i.user.tag} a rejoint le groupe à ${moment().format('HH:mm')}`);
                        lfgSessions[sessionId].unsureList = lfgSessions[sessionId].unsureList.filter(u => !u.startsWith(i.user.tag));
                        lfgSessions[sessionId].declineList = lfgSessions[sessionId].declineList.filter(d => !d.startsWith(i.user.tag));
                        await i.deferUpdate(); // Marque l'interaction comme traitée
                    } else {
                        await i.reply({ content: 'Le groupe est complet.', ephemeral: true });
                    }
                }
            } else if (i.customId.startsWith('leave')) {
                if (lfgSessions[sessionId].participantsList.some(p => p.startsWith(i.user.tag))) {
                    lfgSessions[sessionId].participantsList = lfgSessions[sessionId].participantsList.filter(p => !p.startsWith(i.user.tag));
                    lfgSessions[sessionId].declineList.push(usernameWithTime);
                    lfgSessions[sessionId].history.push(`${i.user.tag} a quitté le groupe à ${moment().format('HH:mm')}`);
                    await i.deferUpdate(); // Marque l'interaction comme traitée
                } else if (lfgSessions[sessionId].unsureList.some(u => u.startsWith(i.user.tag))) {
                    lfgSessions[sessionId].unsureList = lfgSessions[sessionId].unsureList.filter(u => !u.startsWith(i.user.tag));
                    lfgSessions[sessionId].declineList.push(usernameWithTime);
                    lfgSessions[sessionId].history.push(`${i.user.tag} a quitté le groupe en étant incertain à ${moment().format('HH:mm')}`);
                    await i.deferUpdate(); // Marque l'interaction comme traitée
                } else {
                    // Permettre de décliner même si l'utilisateur n'a pas rejoint ou marqué comme incertain
                    lfgSessions[sessionId].declineList.push(usernameWithTime);
                    lfgSessions[sessionId].history.push(`${i.user.tag} a décliné l'invitation à ${moment().format('HH:mm')}`);
                    await i.deferUpdate(); // Marque l'interaction comme traitée
                }
            } else if (i.customId.startsWith('unsure')) {
                if (lfgSessions[sessionId].unsureList.some(u => u.startsWith(i.user.tag))) {
                    await i.reply({ content: 'Vous êtes déjà marqué comme incertain.', ephemeral: true });
                } else {
                    lfgSessions[sessionId].unsureList.push(usernameWithTime);
                    lfgSessions[sessionId].participantsList = lfgSessions[sessionId].participantsList.filter(p => !p.startsWith(i.user.tag));
                    lfgSessions[sessionId].declineList = lfgSessions[sessionId].declineList.filter(d => !d.startsWith(i.user.tag));
                    lfgSessions[sessionId].history.push(`${i.user.tag} est incertain depuis ${moment().format('HH:mm')}`);
                    await i.deferUpdate(); // Marque l'interaction comme traitée
                }
            }

            const participantsField = lfgSessions[sessionId].participantsList.length > 0 ? lfgSessions[sessionId].participantsList.join('\n') : 'Aucun participant pour le moment.';
            const unsureField = lfgSessions[sessionId].unsureList.length > 0 ? lfgSessions[sessionId].unsureList.join('\n') : 'Aucun utilisateur incertain pour le moment.';
            const declineField = lfgSessions[sessionId].declineList.length > 0 ? lfgSessions[sessionId].declineList.join('\n') : 'Aucun utilisateur n\'a décliné pour le moment.';

            embed.spliceFields(0, 3,
                { name: `👥 Participants (${lfgSessions[sessionId].participantsList.length}/${maxParticipants})`, value: participantsField, inline: false },
                { name: '🤔 Incertains', value: unsureField, inline: false },
                { name: '⛔ Historique des déclinaisons', value: declineField, inline: false },
            );

            try {
                await i.editReply({ embeds: [embed] });
            } catch (error) {
                if (error.code === 10008) {
                    console.error("Le message n'existe plus. Impossible de mettre à jour.");
                } else {
                    console.error("Une erreur s'est produite lors de la mise à jour du message : ", error);
                }
            }
        });

        collector.on('end', async () => {
            try {
                joinButton.setDisabled(true);
                unsureButton.setDisabled(true);
                leaveButton.setDisabled(true);
                await interaction.editReply({ components: [new ActionRowBuilder().addComponents(joinButton, unsureButton, leaveButton)] });
            } catch (error) {
                if (error.code === 10008) {
                    console.error("Le message n'existe plus. Impossible de mettre à jour.");
                } else if (error.code === 50027) {
                    console.error("Erreur de token Webhook invalide, ignorée car la période d'interaction est probablement expirée.");
                } else {
                    console.error("Une erreur s'est produite lors de la mise à jour du message après la fin du collecteur : ", error);
                }
            }
            // Supprimer la session une fois terminée
            delete lfgSessions[sessionId];
        });
    },
};
