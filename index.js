const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { Player } = require('discord-player');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// Importation des commandes et fonctions
const { setAnniversaireCommand, getProchainsAnniversairesCommand, deleteAnniversaireCommand, checkAnniversaires } = require('./functions/handleAnniversaires');
const { addExperienceCommand, trackVoiceActivity, getUserLevel, levelUp, addExperience } = require('./functions/handleNiveaux');
const handleMention = require('./functions/handleMention');
const { handleWelcomeMessage } = require('./functions/handleWelcomeMessage');
const playCommand = require('./commands/play');
const pauseCommand = require('./commands/pause');
const resumeCommand = require('./commands/resume');
const skipCommand = require('./commands/skip');
const voteCommand = require('./commands/vote');
const handleMpallCommand = require('./functions/handleMpallCommand');
const newsCommand = require('./commands/news');
const { trackNewMembers, trackVoiceActivity: trackVoiceRoles, checkRoleDuration, updateNewFriendsRole } = require('./functions/handleRoles');
const lfgCommand = require('./commands/lfg'); // Nouvelle commande LFG

// Configuration des identifiants et des clés
const token = 'TOKEN';
const clientId = 'TOKEN';
const guildId = 'TOKEN';
const feedbackChannelId = 'TOKEN';
const openaiApiKey = 'TOKEN';

// Initialisation du client Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences
    ]
});

client.commands = new Collection();

const openai = new OpenAI({
    apiKey: openaiApiKey,
});

client.player = new Player(client, {
    ytdlOptions: {
        quality: 'highestaudio',
        highWaterMark: 1 << 25
    }
});

// Enregistrement des commandes
const commands = [
    { data: setAnniversaireCommand, execute: require('./functions/handleAnniversaires').setAnniversaire },
    { data: getProchainsAnniversairesCommand, execute: require('./functions/handleAnniversaires').getProchainsAnniversaires },
    { data: deleteAnniversaireCommand, execute: require('./functions/handleAnniversaires').deleteAnniversaire },
    { data: addExperienceCommand.data, execute: addExperienceCommand.execute },
    { data: playCommand.data, execute: playCommand.execute },
    { data: pauseCommand.data, execute: pauseCommand.execute },
    { data: resumeCommand.data, execute: resumeCommand.execute },
    { data: skipCommand.data, execute: skipCommand.execute },
    { data: voteCommand.data, execute: voteCommand.execute },
    { data: handleMpallCommand.data, execute: handleMpallCommand.execute },
    { data: newsCommand.data, execute: newsCommand.execute },
    { data: lfgCommand.data, execute: lfgCommand.execute }
];

commands.forEach(command => {
    client.commands.set(command.data.name, command);
});

client.once('ready', async () => {
    console.log(`Bot connecté en tant que ${client.user.tag}!`);

    const rest = new REST({ version: '9' }).setToken(token);

    try {
        console.log('Démarrage de la mise à jour des commandes de l\'application (/)');
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands.map(command => command.data.toJSON()) });
        console.log('Commandes de l\'application (/) mises à jour avec succès.');
    } catch (error) {
        console.error(error);
    }

    checkAnniversaires(client);
    setInterval(() => checkAnniversaires(client), 24 * 60 * 60 * 1000);
    trackVoiceActivity(client);
    trackNewMembers(client);
    trackVoiceRoles(client);

    await client.guilds.fetch();

    const guild = client.guilds.cache.get(guildId);
    if (guild) {
        console.log(`Le bot est membre de la guilde : ${guild.name}`);
        const botMember = guild.members.cache.get(client.user.id);
        if (botMember) {
            console.log(`Permissions du bot : ${JSON.stringify(botMember.permissions.toArray())}`);
            await updateNewFriendsRole(client);
        } else {
            console.error('Impossible de récupérer les informations du bot après la récupération des guildes.');
        }
    } else {
        console.error('Guilde non trouvée après la récupération des guildes.');
    }

    setInterval(() => {
        checkRoleDuration(client);
        updateNewFriendsRole(client);
    }, 60 * 60 * 1000);
});

// Gestion des nouveaux membres
client.on('guildMemberAdd', async member => {
    await handleWelcomeMessage(member);
});

// Gestion des interactions
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'Une erreur s\'est produite lors de l\'exécution de cette commande!', ephemeral: true });
    }
});

// Gestion des messages
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (message.mentions.has(client.user)) {
        await handleMention(message, client);
    }

    const words = message.content.split(/\s+/).length;
    addExperience(message.author.id, words * 0.25);  // Assurez-vous que cette fonction est bien importée
    getUserLevel(message.author.id, (err, user) => {
        if (err) {
            console.error('Erreur lors de la récupération du niveau:', err);
            return;
        }
        const requiredExperience = user.niveau * 100;
        if (user.experience >= requiredExperience) {
            levelUp(message.author.id);
            message.reply(`Félicitations, vous avez atteint le niveau ${user.niveau + 1} !`);
        }
    });
});

// Connexion du bot
client.login(token);
