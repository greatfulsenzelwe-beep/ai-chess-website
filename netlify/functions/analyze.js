// netlify/functions/analyze.js
const Chess = require('chess.js');

module.exports = async (req, res) => {
    try {
        const { game: gameData } = req.body;
        
        if (!gameData || !gameData.moves) {
            return res.status(400).json({ error: 'Game data is required' });
        }
        
        // Simulate analysis (replace with your actual analysis logic)
        const analysis = {
            result: gameData.result || 'Ongoing',
            playerAccuracy: Math.floor(Math.random() * 30) + 70, // 70-100%
            moveClassifications: {
                brilliant: Math.floor(Math.random() * 3),
                best: Math.floor(Math.random() * 5) + 2,
                good: Math.floor(Math.random() * 8) + 5,
                mistake: Math.floor(Math.random() * 5) + 2,
                blunder: Math.floor(Math.random() * 3)
            },
            moveAnalysis: generateMoveAnalysis(gameData.moves)
        };
        
        res.json({ analysis });
    } catch (error) {
        console.error('Error in analyze:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

function generateMoveAnalysis(moves) {
    const classifications = ['brilliant', 'best', 'good', 'mistake', 'blunder'];
    return moves.map((move, index) => ({
        move: move,
        type: classifications[Math.floor(Math.random() * classifications.length)],
        explanation: `This move was ${classifications[Math.floor(Math.random() * classifications.length)]}`
    }));
}