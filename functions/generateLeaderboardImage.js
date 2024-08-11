const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const generateLeaderboardImage = (leaderboardData, startCell, endCell) => {
    const width = 800;
    const height = 600;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#2c2f33';
    ctx.fillRect(0, 0, width, height);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = '30px Arial';
    ctx.fillText('Leaderboard', 50, 50);

    // Entries
    ctx.font = '20px Arial';
    leaderboardData.slice(startCell, endCell + 1).forEach((entry, index) => {
        ctx.fillText(`${startCell + index + 1}. ${entry.username} - ${entry.points} points`, 50, 100 + index * 30);
    });

    const buffer = canvas.toBuffer('image/png');
    const filePath = path.join(__dirname, 'leaderboard.png');
    fs.writeFileSync(filePath, buffer);

    return filePath;
};

module.exports = generateLeaderboardImage;
