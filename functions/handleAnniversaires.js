const fs = require('fs');
const { EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const moment = require('moment');
const anniversairesPath = './anniversaires.json';

module.exports = {
    setAnniversaireCommand: new SlashCommandBuilder()
        .setName('setanniversaire')
        .setDescription('Ajouter ou mettre à jour un anniversaire')
        .addStringOption(option => 
            option.setName('date')
                .setDescription('Date de l\'anniversaire (JJ/MM/AAAA)')
                .setRequired(true)),
    getProchainsAnniversairesCommand: new SlashCommandBuilder()
        .setName('prochains_anniversaires')
        .setDescription('Afficher les 10 prochains anniversaires'),
    deleteAnniversaireCommand: new SlashCommandBuilder()
        .setName('deleteanniversaire')
        .setDescription('Supprimer un anniversaire')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('Utilisateur à supprimer')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async setAnniversaire(interaction) {
        const dateStr = interaction.options.getString('date');
        const userId = interaction.user.id;

        const date = moment(dateStr, 'DD/MM/YYYY').format('YYYY-MM-DD');
        if (!moment(date, 'YYYY-MM-DD', true).isValid()) {
            return interaction.reply('Le format de la date est invalide. Utilisez JJ/MM/AAAA.');
        }

        let data = JSON.parse(fs.readFileSync(anniversairesPath));
        let anniversaires = data.anniversaires;
        const index = anniversaires.findIndex(a => a.user_id === userId);

        if (index !== -1) {
            anniversaires[index].date = date;
        } else {
            anniversaires.push({ user_id: userId, date: date });
        }

        fs.writeFileSync(anniversairesPath, JSON.stringify({ anniversaires: anniversaires }, null, 2));
        interaction.reply('Anniversaire ajouté ou mis à jour avec succès.');
    },

    async getProchainsAnniversaires(interaction) {
        const data = JSON.parse(fs.readFileSync(anniversairesPath));
        const anniversaires = data.anniversaires.sort((a, b) => {
            return new Date(a.date) - new Date(b.date);
        }).slice(0, 10);

        if (anniversaires.length > 0) {
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Les 10 prochains anniversaires')
                .setDescription(anniversaires.map(row => `<@${row.user_id}> - ${moment(row.date, 'YYYY-MM-DD').format('DD/MM/YYYY')}`).join('\n'));

            interaction.reply({ embeds: [embed] });
        } else {
            interaction.reply('Aucun anniversaire trouvé.');
        }
    },

    async deleteAnniversaire(interaction) {
        const userId = interaction.options.getUser('user').id;

        let data = JSON.parse(fs.readFileSync(anniversairesPath));
        let anniversaires = data.anniversaires.filter(a => a.user_id !== userId);

        fs.writeFileSync(anniversairesPath, JSON.stringify({ anniversaires: anniversaires }, null, 2));
        interaction.reply('Anniversaire supprimé avec succès.');
    },

    async checkAnniversaires(client) {
        const now = moment().format('YYYY-MM-DD');
        const data = JSON.parse(fs.readFileSync(anniversairesPath));
        const anniversaires = data.anniversaires.filter(a => moment(a.date, 'YYYY-MM-DD').format('MM-DD') === moment(now, 'YYYY-MM-DD').format('MM-DD'));

        if (anniversaires.length > 0) {
            const channel = client.channels.cache.get('1253335820882939935');
            const users = anniversaires.map(row => `<@${row.user_id}>`).join(', ');

            const message = `
            🎉🔪 **Avis à la Communauté HKF !** 🔪🎉

            Ce soir, nous avons une grande nouvelle à partager ! Nous célébrons **l'anniversaire d'un(e) membre** très spécial(e) de notre communauté ! 🥳

            En l'honneur de cet événement, nous allons **sacrifier...** *oups*, je veux dire, fêter 🎂 l'anniversaire de ${users} !!

            Préparez-vous à une soirée de folie avec des défis hilarants, des jeux mortels (mais pas trop) et, bien sûr, des moments de pur chaos comme seuls les HKF savent les organiser !

            🔪**__Au programme :__**

            **Jeu de massacre :** "Qui va trouver la savonette ?" 🧼
            Course folle à travers les latrines du serveur 🏃‍♂️
            Et bien d'autres surprises sanglantes... euh... amusantes ! 🎮 

            L'équipe HKF te souhaite une bonne mort, heu.. Anniversaire*
            `;

            channel.send(message);
        }
    }
};
