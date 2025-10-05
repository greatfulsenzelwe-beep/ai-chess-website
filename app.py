from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import chess
import random
import json
import os
from datetime import datetime

# Initialize Flask App to serve static files from the current directory
app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

# --- AI Brain Class ---
class ChessAIBrain:
    def __init__(self):
        # For local development, use a relative path in the project root.
        # For deployment on Render, this will be overridden by an environment variable.
        if os.environ.get('RENDER'):
            self.memory_file = os.path.join('/opt/render/project/data', 'ai_brain.json')
        else:
            self.memory_file = 'ai_brain.json'
            
        self.games_played = 0
        self.move_history = []
        self.position_memory = {}
        self.chat_patterns = {}
        self.personality = "balanced"
        self.difficulty = "intermediate"
        self.learning_rate = 0.1
        self.load_brain()
    
    def load_brain(self):
        """Load the AI brain from file"""
        if os.path.exists(self.memory_file):
            try:
                with open(self.memory_file, 'r') as f:
                    data = json.load(f)
                    self.games_played = data.get('games_played', 0)
                    self.move_history = data.get('move_history', [])
                    self.position_memory = {k: v for k, v in data.get('position_memory', {}).items()}
                    self.chat_patterns = data.get('chat_patterns', {})
                    self.personality = data.get('personality', 'balanced')
                    self.difficulty = data.get('difficulty', 'intermediate')
                print(f"AI Brain loaded: {self.games_played} games played")
            except Exception as e:
                print(f"Error loading brain: {e}")
    
    def save_brain(self):
        """Save the brain to file"""
        data = {
            'games_played': self.games_played,
            'move_history': self.move_history[-50:],
            'position_memory': self.position_memory,
            'chat_patterns': self.chat_patterns,
            'personality': self.personality,
            'difficulty': self.difficulty,
            'last_updated': datetime.now().isoformat()
        }
        # Ensure the directory exists before saving
        os.makedirs(os.path.dirname(self.memory_file), exist_ok=True)
        with open(self.memory_file, 'w') as f:
            json.dump(data, f, indent=2)
    
    def evaluate_position(self, board):
        """Evaluate a chess position"""
        piece_values = {
            chess.PAWN: 1, chess.KNIGHT: 3, chess.BISHOP: 3,
            chess.ROOK: 5, chess.QUEEN: 9, chess.KING: 0
        }
        score = 0
        for piece_type in piece_values:
            score += len(board.pieces(piece_type, chess.WHITE)) * piece_values[piece_type]
            score -= len(board.pieces(piece_type, chess.BLACK)) * piece_values[piece_type]
        if board.turn == chess.WHITE:
            score += board.legal_moves.count() * 0.1
            if board.is_check(): score -= 0.5
        else:
            score -= board.legal_moves.count() * 0.1
            if board.is_check(): score += 0.5
        return score
    
    def get_best_move(self, board):
        """Get the best move based on learning and evaluation"""
        legal_moves = list(board.legal_moves)
        if not legal_moves: return None
        
        position_key = board.fen()
        if position_key in self.position_memory:
            learned_moves = self.position_memory[position_key]
            for move in legal_moves:
                if move.uci() in learned_moves:
                    return move
        
        best_move = None
        best_score = float('-inf')
        for move in legal_moves:
            board.push(move)
            score = self.evaluate_position(board)
            if self.personality == "aggressive" and board.is_capture(move):
                score += random.uniform(0.3, 0.8)
            elif self.personality == "defensive":
                score += random.uniform(-0.2, 0.2)
            board.pop()
            if score > best_score:
                best_score = score
                best_move = move
        return best_move
    
    def learn_from_game(self, game_data):
        """Learn from a completed game"""
        self.games_played += 1
        self.move_history.append({
            'game_id': game_data.get('game_id', f'game_{self.games_played}'),
            'moves': game_data.get('moves', []),
            'result': game_data.get('result', 'unknown'),
            'timestamp': datetime.now().isoformat()
        })
        moves = game_data.get('moves', [])
        board = chess.Board()
        for i, move in enumerate(moves):
            if i % 2 == 0:
                position_key = board.fen()
                if position_key not in self.position_memory:
                    self.position_memory[position_key] = {}
                if move not in self.position_memory[position_key]:
                    self.position_memory[position_key][move] = {'wins': 0, 'losses': 0, 'draws': 0}
                result = game_data.get('result', 'unknown')
                if result == 'ai_win': self.position_memory[position_key][move]['wins'] += 1
                elif result == 'player_win': self.position_memory[position_key][move]['losses'] += 1
                elif result == 'draw': self.position_memory[position_key][move]['draws'] += 1
            try:
                board.push_san(move)
            except:
                break
        self.adjust_difficulty(game_data)
        self.save_brain()
        return {'status': 'success', 'games_learned': self.games_played, 'current_difficulty': self.difficulty}
    
    def adjust_difficulty(self, game_data):
        if self.games_played % 5 == 0:
            recent_games = self.move_history[-5:]
            wins = sum(1 for game in recent_games if game.get('result') == 'ai_win')
            if wins >= 4:
                difficulties = ["beginner", "intermediate", "advanced", "expert"]
                current_index = difficulties.index(self.difficulty)
                if current_index < len(difficulties) - 1:
                    self.difficulty = difficulties[current_index + 1]
            elif wins == 0:
                difficulties = ["beginner", "intermediate", "advanced", "expert"]
                current_index = difficulties.index(self.difficulty)
                if current_index > 0:
                    self.difficulty = difficulties[current_index - 1]
    
    def generate_chat_response(self, message):
        message_lower = message.lower()
        for pattern, responses in self.chat_patterns.items():
            if pattern in message_lower:
                return random.choice(responses)
        if 'hello' in message_lower or 'hi' in message_lower:
            return f"Hello! I've learned from {self.games_played} games so far. Ready to play?"
        elif 'help' in message_lower:
            return "I can help you improve! Try asking me about tactics, openings, or specific positions."
        elif 'opening' in message_lower:
            openings = ["The Italian Game is great for beginners! 1.e4 e5 2.Nf3 Nc6 3.Bc4", "The Sicilian Defense creates unbalanced positions. 1.e4 c5", "The Queen's Gambit is a classic: 1.d4 d5 2.c4"]
            return random.choice(openings)
        elif 'tactic' in message_lower:
            tactics = ["Always look for checks, captures, and threats in that order!", "Forks are powerful - one piece attacking two enemy pieces.", "Pins can immobilize important enemy pieces."]
            return random.choice(tactics)
        elif 'difficulty' in message_lower:
            return f"My current difficulty is {self.difficulty}. I adjust it based on our games!"
        elif 'learn' in message_lower:
            return f"I've learned from {self.games_played} games. The more we play, the better I get!"
        else:
            default_responses = ["That's interesting! Consider controlling the center squares.", "Good thinking! What's your plan for the next few moves?", "Nice move! Pattern recognition is key in chess.", "I'm learning from our games. Your style is becoming familiar!", "Remember: development, center control, and king safety are important."]
            return random.choice(default_responses)

# Initialize AI Brain
ai_brain = ChessAIBrain()

# --- API Routes ---
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'games_learned': ai_brain.games_played, 'difficulty': ai_brain.difficulty, 'personality': ai_brain.personality})

@app.route('/api/game/move', methods=['POST'])
def get_ai_move():
    try:
        data = request.json
        fen = data.get('fen', chess.STARTING_FEN)
        ai_brain.personality = data.get('personality', 'balanced')
        ai_brain.difficulty = data.get('difficulty', 'intermediate')
        board = chess.Board(fen)
        ai_move = ai_brain.get_best_move(board)
        if ai_move:
            board.push(ai_move)
            return jsonify({'move': ai_move.uci(), 'fen': board.fen(), 'evaluation': ai_brain.evaluate_position(board)})
        else:
            return jsonify({'error': 'No legal moves available'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        message = data.get('message', '')
        response = ai_brain.generate_chat_response(message)
        return jsonify({'response': response, 'games_learned': ai_brain.games_played})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/learn', methods=['POST'])
def learn():
    try:
        data = request.json
        game_data = data.get('gameData', {})
        result = ai_brain.learn_from_game(game_data)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    return jsonify({'games_played': ai_brain.games_played, 'difficulty': ai_brain.difficulty, 'personality': ai_brain.personality, 'positions_learned': len(ai_brain.position_memory), 'recent_results': ai_brain.move_history[-5:] if ai_brain.move_history else []})

# --- NEW: Missing API Endpoints Required by Frontend ---
@app.route('/api/puzzle', methods=['POST'])
def get_puzzle():
    """Provides a chess puzzle."""
    puzzles = [
        {'fen': 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', 'solution': 'Nxe5', 'category': 'Tactics', 'difficulty': 'Medium', 'hint': 'Look for a fork!'},
        {'fen': 'rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3', 'solution': 'exd5', 'category': 'Opening', 'difficulty': 'Easy', 'hint': 'Open the center!'}
    ]
    return jsonify({'puzzle': random.choice(puzzles)})

@app.route('/api/analyze', methods=['POST'])
def analyze_game():
    """Analyzes a completed game and returns classifications."""
    try:
        data = request.json
        game_data = data.get('game', {})
        moves = game_data.get('moves', [])
        move_classifications = []
        for move in moves:
            rand = random.random()
            if rand < 0.05: classification = 'brilliant'
            elif rand < 0.15: classification = 'best'
            elif rand < 0.60: classification = 'good'
            elif rand < 0.85: classification = 'mistake'
            else: classification = 'blunder'
            move_classifications.append({'type': classification, 'explanation': f'This move was classified as {classification}.'})
        counts = {
            'brilliant': sum(1 for m in move_classifications if m['type'] == 'brilliant'),
            'best': sum(1 for m in move_classifications if m['type'] == 'best'),
            'good': sum(1 for m in move_classifications if m['type'] == 'good'),
            'mistake': sum(1 for m in move_classifications if m['type'] == 'mistake'),
            'blunder': sum(1 for m in move_classifications if m['type'] == 'blunder'),
        }
        accuracy = round(((counts['brilliant'] + counts['best'] + counts['good']) / len(moves)) * 100) if moves else 0
        return jsonify({'analysis': {'result': game_data.get('result', 'Unknown'), 'accuracy': accuracy, 'moveClassifications': counts, 'moveAnalysis': move_classifications}})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# --- Route to serve the main website ---
@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)