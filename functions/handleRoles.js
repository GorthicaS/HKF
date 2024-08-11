const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const moment = require('moment');
const axios = require('axios');

const trackingDataPath = './trackingData.json';
const congratulationChannelId = '1192443559840849940'; // ID du canal pour les messages de félicitations
const chatGPTApiKey = 'TOKEN';  // Remplacez par votre clé API OpenAI

function loadTrackingData() {
    if (!fs.existsSync(trackingDataPath)) {
        return {};
    }
    const data = fs.readFileSync(trackingDataPath);
    return JSON.parse(data);
}

function saveTrackingData(data) {
    fs.writeFileSync(trackingDataPath, JSON.stringify(data, null, 2));
}

async function generateCongratulationMessage(username, nickname) {
    const prompt = `
    Tu es un bot Discord français d'un serveur de gamers appelé "Happy Kill Friends". Félicite un membre nommé ${nickname} pour avoir atteint 120 minutes en vocal avec un message humoristique et sarcastique, en utilisant un jeu de mots pourri sur son pseudo si possible. 
    Utilise ce style pour les félicitations :
    "Oyé les trou d'uc, félicitations à ${nickname} pour avoir survécu 120 minutes en vocal avec nous ! C'est un exploit digne d'une chèvre ascendant radiateur."
    `;

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
        n: 1,
        stop: null,
        temperature: 0.7,
    }, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${chatGPTApiKey}`
        }
    });

    return response.data.choices[0].message.content.trim();
}

function trackNewMembers(client) {
    client.on('guildMemberAdd', async member => {
        const joinedAt = moment().format();
        let trackingData = loadTrackingData();
        trackingData[member.id] = { joinedAt, voiceTime: 0, roleAssigned: true };
        saveTrackingData(trackingData);

        const role = member.guild.roles.cache.find(r => r.name === 'New Friends');
        if (role) {
            const botMember = member.guild.members.cache.get(client.user.id);
            if (botMember) {
                console.log(`Permissions du bot : ${JSON.stringify(botMember.permissions.toArray())}`);
                if (botMember.permissions.has('MANAGE_ROLES')) {
                    await member.roles.add(role).catch(console.error);
                    console.log(`Rôle "New Friends" attribué à ${member.user.tag}`);
                } else {
                    console.error(`Permissions manquantes pour attribuer le rôle à ${member.user.tag}.`);
                }
            } else {
                console.error('Impossible de récupérer les informations du bot.');
            }
        } else {
            console.error('Rôle "New Friends" non trouvé');
        }
    });
}

function trackVoiceActivity(client) {
    client.on('voiceStateUpdate', async (oldState, newState) => {
        if (newState.member.user.bot) return;

        let trackingData = loadTrackingData();
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

        if (trackingData[userId].voiceTime >= 2 * 60 * 60 && trackingData[userId].roleAssigned) {
            const role = newState.guild.roles.cache.find(r => r.name === 'New Friends');
            if (role) {
                const botMember = newState.guild.members.cache.get(client.user.id);
                if (botMember && botMember.permissions.has('MANAGE_ROLES')) {
                    await newState.member.roles.remove(role).catch(console.error);
                    trackingData[userId].roleAssigned = false;
                    console.log(`Rôle "New Friends" retiré de ${newState.member.user.tag} après 2 heures en canal vocal`);

                    // Générer et envoyer le message de félicitations
                    const congratulationMessage = await generateCongratulationMessage(newState.member.user.username, newState.member.nickname || newState.member.user.username);
                    const congratulationChannel = newState.guild.channels.cache.get(congratulationChannelId);
                    if (congratulationChannel) {
                        congratulationChannel.send(congratulationMessage).catch(console.error);
                    }
                } else {
                    console.error(`Permissions manquantes pour retirer le rôle de ${newState.member.user.tag}.`);
                }
            }
        }

        saveTrackingData(trackingData);
    });
}

async function updateNewFriendsRole(client) {
    const guild = client.guilds.cache.first();
    if (!guild) {
        console.error('Guild non trouvée.');
        return;
    }

    const role = guild.roles.cache.find(r => r.name === 'New Friends');
    if (!role) {
        console.error('Rôle "New Friends" non trouvé');
        return;
    }

    let trackingData = loadTrackingData();
    const now = moment();

    const members = await guild.members.fetch();
    const botMember = guild.members.cache.get(client.user.id);
    if (botMember) {
        console.log(`Permissions du bot : ${JSON.stringify(botMember.permissions.toArray())}`);
    } else {
        console.error('Impossible de récupérer les informations du bot.');
        return;
    }

    members.forEach(member => {
        const joinedAt = moment(member.joinedAt);
        if (!trackingData[member.id]) {
            trackingData[member.id] = { joinedAt: joinedAt.format(), voiceTime: 0, roleAssigned: false };
        }

        const isNew = now.diff(joinedAt, 'weeks') < 2;
        if (isNew && !member.roles.cache.has(role.id)) {
            if (botMember.permissions.has('MANAGE_ROLES')) {
                member.roles.add(role).catch(console.error);
                trackingData[member.id].roleAssigned = true;
                console.log(`Rôle "New Friends" attribué à ${member.user.tag}`);
            } else {
                console.error(`Permissions manquantes pour attribuer le rôle à ${member.user.tag}.`);
            }
        } else if (!isNew && member.roles.cache.has(role.id)) {
            if (botMember.permissions.has('MANAGE_ROLES')) {
                member.roles.remove(role).catch(console.error);
                trackingData[member.id].roleAssigned = false;
                console.log(`Rôle "New Friends" retiré de ${member.user.tag}`);
            } else {
                console.error(`Permissions manquantes pour retirer le rôle de ${member.user.tag}.`);
            }
        }
    });

    saveTrackingData(trackingData);
}

function checkRoleDuration(client) {
    let trackingData = loadTrackingData();
    const now = moment();

    Object.keys(trackingData).forEach(async userId => {
        const memberData = trackingData[userId];

        if (memberData.joinedAt && memberData.roleAssigned) {
            const joinedDuration = now.diff(moment(memberData.joinedAt), 'weeks');

            if (joinedDuration >= 2) {
                const guild = client.guilds.cache.first();
                const member = guild.members.cache.get(userId);

                if (member) {
                    const role = guild.roles.cache.find(r => r.name === 'New Friends');
                    if (role) {
                        const botMember = guild.members.cache.get(client.user.id);
                        if (botMember && botMember.permissions.has('MANAGE_ROLES')) {
                            await member.roles.remove(role).catch(console.error);
                            trackingData[userId].roleAssigned = false;
                            console.log(`Rôle "New Friends" retiré de ${member.user.tag} après 2 semaines`);
                        } else {
                            console.error(`Permissions manquantes pour retirer le rôle de ${member.user.tag}.`);
                        }
                    }
                }
            }
        }
    });

    saveTrackingData(trackingData);
}

module.exports = { trackNewMembers, trackVoiceActivity, checkRoleDuration, updateNewFriendsRole };
