// netlify/functions/chat.js
module.exports = async (req, res) => {
    try {
        const { message, context } = req.body;
        
        // Simple chatbot responses (you can enhance this)
        const responses = [
            "That's a great question! In chess, it's important to control the center.",
            "Have you tried studying classic games? They teach us a lot about strategy.",
            "Remember, every move should have a purpose. What are you trying to achieve?",
            "Tactics are important, but don't forget about strategy and long-term planning.",
            "The best way to improve is to analyze your games and learn from your mistakes."
        ];
        
        // Simple keyword-based responses
        let response = responses[Math.floor(Math.random() * responses.length)];
        
        if (message.toLowerCase().includes('opening')) {
            response = "For openings, I recommend starting with 1.e4 or 1.d4. They lead to open games and are great for learning.";
        } else if (message.toLowerCase().includes('tactic')) {
            response = "Tactics are crucial! Try solving puzzles daily to improve your tactical vision.";
        } else if (message.toLowerCase().includes('endgame')) {
            response = "Endgames require precision. Remember: king activity is key in the endgame!";
        }
        
        res.json({ response });
    } catch (error) {
        console.error('Error in chat:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};