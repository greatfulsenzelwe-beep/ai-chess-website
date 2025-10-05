// netlify/functions/puzzle.js
module.exports = async (req, res) => {
    try {
        const { difficulty, category, fromHistory } = req.body;
        
        // Predefined puzzles (you can expand this)
        const puzzles = [
            {
                fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
                solution: 'Nxe5',
                category: 'Tactics',
                difficulty: 'Medium',
                hint: 'Look for a fork!'
            },
            {
                fen: 'rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3',
                solution: 'exd5',
                category: 'Opening',
                difficulty: 'Easy',
                hint: 'Open the center!'
            },
            {
                fen: '6k1/5ppp/8/8/8/8/5PPP/6K1 w - - 0 1',
                solution: 'h4',
                category: 'Endgame',
                difficulty: 'Easy',
                hint: 'Create space for your king!'
            }
        ];
        
        // Filter by difficulty if specified
        let availablePuzzles = puzzles;
        if (difficulty && difficulty !== 'mixed') {
            availablePuzzles = puzzles.filter(p => p.difficulty === difficulty);
        }
        
        // Select random puzzle
        const puzzle = availablePuzzles[Math.floor(Math.random() * availablePuzzles.length)];
        
        res.json({ puzzle });
    } catch (error) {
        console.error('Error in puzzle:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};