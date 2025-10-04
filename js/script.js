// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    // Navigation functionality
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all links and sections
            navLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            
            // Add active class to clicked link
            this.classList.add('active');
            
            // Show corresponding section
            const targetId = this.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add('active');
            }
        });
    });
    
    // Mobile menu toggle
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    hamburger.addEventListener('click', function() {
        navMenu.classList.toggle('active');
    });
    
    // Chess board initialization
    let board = null;
    let game = new Chess();
    let boardEl = document.getElementById('chess-board');
    
    if (boardEl) {
        board = Chessboard(boardEl, {
            position: 'start',
            draggable: true,
            onDragStart: onDragStart,
            onDrop: onDrop,
            onSnapEnd: onSnapEnd
        });
    }
    
    // Chess drag and drop functions
    function onDragStart(source, piece, position, orientation) {
        if (game.game_over()) return false;
        
        // Only allow dragging of pieces for the side to move
        if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
            (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
            return false;
        }
    }
    
    function onDrop(source, target) {
        // See if the move is legal
        var move = game.move({
            from: source,
            to: target,
            promotion: 'q' // NOTE: always promote to a queen for simplicity
        });
        
        // If illegal move, snapback
        if (move === null) return 'snapback';
        
        // Update the board
        updateBoard();
        
        // Make AI move after a short delay
        setTimeout(makeAIMove, 250);
    }
    
    function onSnapEnd() {
        board.position(game.fen());
    }
    
    // Update board and game status
    function updateBoard() {
        board.position(game.fen());
        updateStatus();
        updateMoveHistory();
    }
    
    function updateStatus() {
        const statusEl = document.getElementById('game-status');
        if (!statusEl) return;
        
        let status = '';
        
        if (game.in_checkmate()) {
            status = 'Game over, ' + (game.turn() === 'w' ? 'Black' : 'White') + ' wins by checkmate.';
        } else if (game.in_draw()) {
            status = 'Game over, drawn position';
        } else if (game.in_check()) {
            status = (game.turn() === 'w' ? 'White' : 'Black') + ' is in check!';
        } else {
            status = (game.turn() === 'w' ? 'White' : 'Black') + ' to move';
        }
        
        statusEl.textContent = status;
    }
    
    function updateMoveHistory() {
        const moveListEl = document.getElementById('move-list');
        if (!moveListEl) return;
        
        const history = game.history({ verbose: true });
        
        if (history.length === 0) {
            moveListEl.innerHTML = '<div class="no-moves">No moves yet</div>';
            return;
        }
        
        let html = '';
        for (let i = 0; i < history.length; i += 2) {
            const moveNumber = Math.floor(i / 2) + 1;
            const whiteMove = history[i];
            const blackMove = history[i + 1];
            
            html += `<div class="move-pair">
                <span class="move-number">${moveNumber}.</span>
                <span class="white-move">${whiteMove.san}</span>`;
            
            if (blackMove) {
                html += `<span class="black-move">${blackMove.san}</span>`;
            }
            
            html += '</div>';
        }
        
        moveListEl.innerHTML = html;
    }
    
    // Simple AI move (random legal move for now)
    function makeAIMove() {
        if (game.game_over()) return;
        
        const legalMoves = game.moves();
        if (legalMoves.length === 0) return;
        
        // For now, make a random move
        // Later, this will call your Python AI backend
        const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
        game.move(randomMove);
        
        updateBoard();
    }
    
    // Game controls
    const newGameBtn = document.getElementById('new-game-btn');
    if (newGameBtn) {
        newGameBtn.addEventListener('click', function() {
            game.reset();
            board.position('start');
            updateStatus();
            updateMoveHistory();
        });
    }
    
    const resignBtn = document.getElementById('resign-btn');
    if (resignBtn) {
        resignBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to resign?')) {
                const winner = game.turn() === 'w' ? 'Black' : 'White';
                alert(`${winner} wins by resignation!`);
                game.reset();
                board.position('start');
                updateStatus();
                updateMoveHistory();
            }
        });
    }
    
    // Chat functionality
    const chatInput = document.getElementById('chat-input');
    const sendChatBtn = document.getElementById('send-chat-btn');
    const chatMessages = document.getElementById('chat-messages');
    
    function addChatMessage(message, isUser = false) {
        if (!chatMessages) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${isUser ? 'user' : 'ai'}`;
        
        messageDiv.innerHTML = `
            <div class="message-avatar ${isUser ? 'user-avatar' : 'ai-avatar'}">
                <i class="fas fa-${isUser ? 'user' : 'robot'}"></i>
            </div>
            <div class="message-content">
                <p>${message}</p>
            </div>
        `;
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    function sendChatMessage() {
        if (!chatInput) return;
        
        const message = chatInput.value.trim();
        if (!message) return;
        
        // Add user message
        addChatMessage(message, true);
        
        // Clear input
        chatInput.value = '';
        
        // Simulate AI response (for now)
        setTimeout(() => {
            const responses = [
                "That's an interesting question! Let me think about it.",
                "Good thinking! Have you considered the center control?",
                "Nice strategy! What's your plan for the next few moves?",
                "I'm learning from our games. Your style is becoming familiar to me!",
                "Great question! In chess, it's important to control the center."
            ];
            
            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            addChatMessage(randomResponse);
        }, 1000);
    }
    
    if (sendChatBtn) {
        sendChatBtn.addEventListener('click', sendChatMessage);
    }
    
    if (chatInput) {
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendChatMessage();
            }
        });
    }
    
    // Start game button
    const startGameBtn = document.getElementById('start-game-btn');
    if (startGameBtn) {
        startGameBtn.addEventListener('click', function() {
            // Switch to game section
            navLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            
            document.querySelector('[href="#game"]').classList.add('active');
            document.getElementById('game').classList.add('active');
            
            // Initialize board if not already done
            if (!board && boardEl) {
                board = Chessboard(boardEl, {
                    position: 'start',
                    draggable: true,
                    onDragStart: onDragStart,
                    onDrop: onDrop,
                    onSnapEnd: onSnapEnd
                });
            }
        });
    }
    
    // Hero buttons
    const startLearningBtn = document.getElementById('start-learning-btn');
    if (startLearningBtn) {
        startLearningBtn.addEventListener('click', function() {
            navLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            
            document.querySelector('[href="#game-settings"]').classList.add('active');
            document.getElementById('game-settings').classList.add('active');
        });
    }
    
    const statsBtn = document.getElementById('stats-btn');
    if (statsBtn) {
        statsBtn.addEventListener('click', function() {
            navLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            
            document.querySelector('[href="#stats"]').classList.add('active');
            document.getElementById('stats').classList.add('active');
        });
    }
    
    const startPlayingBtn = document.getElementById('start-playing-btn');
    if (startPlayingBtn) {
        startPlayingBtn.addEventListener('click', function() {
            navLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            
            document.querySelector('[href="#game"]').classList.add('active');
            document.getElementById('game').classList.add('active');
            
            // Initialize board if not already done
            if (!board && boardEl) {
                board = Chessboard(boardEl, {
                    position: 'start',
                    draggable: true,
                    onDragStart: onDragStart,
                    onDrop: onDrop,
                    onSnapEnd: onSnapEnd
                });
            }
        });
    }
    
    // Settings: Time control custom input
    const timeControlSelect = document.getElementById('time-control-select');
    const customTimeDiv = document.getElementById('custom-time');
    
    if (timeControlSelect && customTimeDiv) {
        timeControlSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                customTimeDiv.classList.remove('hidden');
            } else {
                customTimeDiv.classList.add('hidden');
            }
        });
    }
});