// netlify/functions/game-move.js
const Chess = require('chess.js');

module.exports = async (req, res) => {
    try {
        const { fen, personality, difficulty } = req.body;
        
        if (!fen) {
            return res.status(400).json({ error: 'FEN is required' });
        }
        
        const game = new Chess(fen);
        
        // Simple AI logic (you can replace with your actual AI)
        const moves = game.moves();
        if (moves.length === 0) {
            return res.status(400).json({ error: 'No legal moves' });
        }
        
        // Select move based on difficulty
        let selectedMove;
        switch (difficulty) {
            case 'beginner':
                // Make random moves
                selectedMove = moves[Math.floor(Math.random() * moves.length)];
                break;
            case 'intermediate':
                // Prefer captures and checks
                const goodMoves = moves.filter(move => {
                    const tempGame = new Chess(fen);
                    tempGame.move(move);
                    return tempGame.in_check() || move.includes('x');
                });
                selectedMove = goodMoves.length > 0 ? 
                    goodMoves[Math.floor(Math.random() * goodMoves.length)] :
                    moves[Math.floor(Math.random() * moves.length)];
                break;
            case 'advanced':
            case 'expert':
                // Use a simple evaluation (you can enhance this)
                selectedMove = moves[Math.floor(Math.random() * moves.length)];
                break;
            default:
                selectedMove = moves[Math.floor(Math.random() * moves.length)];
        }
        
        res.json({ move: selectedMove });
    } catch (error) {
        console.error('Error in game-move:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};