const fs = require('fs');
const path = require('path');
const generateLeaderboardImage = require('./generateLeaderboardImage');

const postLeaderboard = async (client, channelId, leaderboardData, startCell, endCell) => {
    const filePath = generateLeaderboardImage(leaderboardData, startCell, endCell);

    const channel = await client.channels.fetch(channelId);
    if (!channel) {
        console.error('Channel not found');
        return;
    }

    const message = await channel.send({ files: [filePath] });
    console.log(`Leaderboard posted: ${message.url}`);

    fs.unlinkSync(filePath); // Remove the file after posting
};

module.exports = postLeaderboard;
