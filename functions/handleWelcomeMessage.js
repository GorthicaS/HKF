const { ChannelType } = require('discord.js');
const axios = require('axios');

const chatGPTApiKey = 'TOKEN';  // Remplacez par votre clé API OpenAI

async function generateWelcomeMessage(username, nickname) {
    const prompt = `
    Tu es un bot Discord français d'un serveur de gamers appelé "Happy Kill Friends". Accueille un nouveau membre nommé ${nickname} avec un message humoristique en étant sarcastique et clasheur et inclut un jeu de mots pourri sur son pseudo si possible. 
    Refait moi entièrement le message ci dessous en t'inspirant de notre ancien message d'accueil :
    "Oyé les trou d'uc, un nouveau/nouvelle, ou une chèvre ascendant radiateur vient de nous rejoindre : @${nickname}. Accueillez-le à coup de savonnettes, etc."
    Donne-lui l'envie de répondre.
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

async function handleWelcomeMessage(member) {
    const generalChannelId = '1189330115881074730';  // ID du canal général
    const generalChannel = member.guild.channels.cache.get(generalChannelId);

    if (!generalChannel) {
        console.error('Canal général non trouvé.');
        return;
    }

    const nickname = member.nickname || member.user.username;
    const welcomeMessage = await generateWelcomeMessage(member.user.username, nickname);
    const message = `Oyé les trou d'uc, un nouveau/nouvelle, ou une chèvre ascendant radiateur vient de nous rejoindre : ${member}. ${welcomeMessage}\nAccueillez-le à coup de savonnettes, etc.`;

    generalChannel.send(message).catch(console.error);
}

module.exports = { handleWelcomeMessage };
