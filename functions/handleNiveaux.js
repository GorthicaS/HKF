const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const trackingDataPath = path.join(__dirname, '../trackingData.json');

let trackingData = loadTrackingData();

function loadTrackingData() {
    if (!fs.existsSync(trackingDataPath)) {
        return {};
    }
    const data = fs.readFileSync(trackingDataPath);
    return JSON.parse(data);
}

function saveTrackingData() {
    fs.writeFileSync(trackingDataPath, JSON.stringify(trackingData, null, 2));
}

function addExperience(userId, amount) {
    if (!trackingData[userId]) {
        trackingData[userId] = {
            experience: 0,
            niveau: 1
        };
    }
    trackingData[userId].experience += amount;
    saveTrackingData();
}

function getUserLevel(userId, callback) {
    if (!trackingData[userId]) {
        callback(new Error('User not found'));
    } else {
        callback(null, trackingData[userId]);
    }
}

function levelUp(userId) {
    if (trackingData[userId]) {
        trackingData[userId].niveau += 1;
        saveTrackingData();
    }
}

// Définition de la fonction trackVoiceActivity
function trackVoiceActivity(client) {
    client.on('voiceStateUpdate', async (oldState, newState) => {
        if (newState.member.user.bot) return;

        const userId = newState.member.id;

        if (!trackingData[userId]) {
            trackingData[userId] = { joinedAt: null, voiceTime: 0, roleAssigned: false };
        }

        if (!oldState.channel && newState.channel) {
            trackingData[userId].voiceJoin = moment();
        } else if (oldState.channel && !newState.channel) {
            const voiceDuration = moment().diff(trackingData[userId].voiceJoin, 'seconds');
            trackingData[userId].voiceTime += voiceDuration;
            delete trackingData[userId].voiceJoin;
        }

        saveTrackingData();
    });
}

const addExperienceCommand = {
    data: new SlashCommandBuilder()
        .setName('addexperience')
        .setDescription('Ajoute de l\'expérience à un utilisateur')
        .addUserOption(option => option.setName('utilisateur').setDescription('Utilisateur cible').setRequired(true))
        .addIntegerOption(option => option.setName('amount').setDescription('Quantité d\'expérience').setRequired(true)),
    async execute(interaction) {
        const userId = interaction.options.getUser('utilisateur').id;
        const amount = interaction.options.getInteger('amount');
        addExperience(userId, amount);
        await interaction.reply(`Ajouté ${amount} points d'expérience à ${interaction.options.getUser('utilisateur').username}.`);
    }
};

module.exports = {
    trackVoiceActivity,
    addExperience,
    getUserLevel,
    levelUp,
    addExperienceCommand
};
