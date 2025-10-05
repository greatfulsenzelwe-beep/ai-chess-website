// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing chess game...');
    
    // API Configuration - Connect to your AI backend
    const API_URL = 'http://127.0.0.1:5000/api';
    
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
                
                // Initialize appropriate board based on section
                if (targetId === 'game' && !boardInitialized) {
                    setTimeout(initializeChessBoard, 100);
                } else if (targetId === 'puzzles' && !puzzleBoardInitialized) {
                    setTimeout(initializePuzzleBoard, 100);
                }
            }
        });
    });
    
    // Chess game variables
    let board = null;
    let game = null;
    let gameHistory = [];
    let boardInitialized = false;
    let playerColor = 'white';
    let selectedSquare = null;
    let moveAnalysis = [];
    
    // Puzzle variables
    let puzzleBoard = null;
    let puzzleGame = null;
    let currentPuzzle = null;
    let puzzlesSolved = 0;
    let currentStreak = 0;
    let bestStreak = 0;
    let puzzleBoardInitialized = false;
    
    // Move history variables
    let moveHistoryIndex = 0;
    let isPlayingMoves = false;
    let playInterval = null;
    
    // Game analysis variables
    let gameAnalysis = null;
    let adaptiveDifficultyEnabled = true;
    let playerPerformanceHistory = [];
    
    // Time control variables
    let timeControl = null;
    let playerTime = 0;
    let aiTime = 0;
    let timeInterval = null;
    
    // Stats tracking
    let gamesPlayed = 0;
    let gamesWon = 0;
    let gamesLost = 0;
    let gamesDrawn = 0;
    
    // NEW: Import game variables
    let importedGame = null;
    let importedGameAnalysis = null;
    let importType = null; // 'pgn', 'fen', or 'file'
    
    // FIX: Enhanced Window resize handler for responsive board
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(resizeBoards, 250);
    });
    
    // FIX: Improved resizeBoards function to handle responsive sizing
    function resizeBoards() {
        if (board) {
            // Calculate appropriate board size based on viewport
            const boardContainer = document.querySelector('.game-board');
            if (boardContainer) {
                const containerWidth = boardContainer.offsetWidth;
                const boardSize = Math.min(containerWidth, window.innerHeight * 0.6);
                
                // Update board size
                board.resize();
                
                // Update piece sizes proportionally
                const pieces = document.querySelectorAll('#chess-board .piece');
                const pieceSize = Math.floor(boardSize / 8 * 0.8);
                pieces.forEach(piece => {
                    piece.style.fontSize = pieceSize + 'px';
                    piece.style.width = pieceSize + 'px';
                    piece.style.height = pieceSize + 'px';
                    piece.style.lineHeight = pieceSize + 'px';
                });
            }
        }
        
        if (puzzleBoard) {
            // Calculate appropriate board size based on viewport
            const puzzleContainer = document.querySelector('.puzzle-board');
            if (puzzleContainer) {
                const containerWidth = puzzleContainer.offsetWidth;
                const boardSize = Math.min(containerWidth, window.innerHeight * 0.5);
                
                // Update board size
                puzzleBoard.resize();
                
                // Update piece sizes proportionally
                const pieces = document.querySelectorAll('#puzzle-board .piece');
                const pieceSize = Math.floor(boardSize / 8 * 0.8);
                pieces.forEach(piece => {
                    piece.style.fontSize = pieceSize + 'px';
                    piece.style.width = pieceSize + 'px';
                    piece.style.height = pieceSize + 'px';
                    piece.style.lineHeight = pieceSize + 'px';
                });
            }
        }
    }
    
    // Initialize chess board
    function initializeChessBoard() {
        console.log('Initializing chess board...');
        
        // Check if chess.js is loaded
        if (typeof Chess === 'undefined') {
            console.error('Chess.js library not loaded!');
            return;
        }
        
        // Check if chessboardjs is loaded
        if (typeof Chessboard === 'undefined') {
            console.error('Chessboard.js library not loaded!');
            return;
        }
        
        // Determine player color
        const colorSelect = document.getElementById('color-select');
        if (colorSelect.value === 'random') {
            playerColor = Math.random() < 0.5 ? 'white' : 'black';
        } else {
            playerColor = colorSelect.value;
        }
        
        // Initialize game
        game = new Chess();
        gameHistory = [];
        moveHistoryIndex = 0;
        moveAnalysis = [];
        
        // Get board element
        const boardEl = document.getElementById('chess-board');
        if (!boardEl) {
            console.error('Chess board element not found!');
            return;
        }
        
        // Check if board already exists
        if (board) {
            console.log('Board already exists, destroying it first');
            board.destroy();
        }
        
        // FIX: Add orientation parameter to flip board when playing as black
        // FIX: Remove custom onSquareClick and let chessboard.js handle click-to-move automatically
        console.log('Creating chessboard...');
        board = Chessboard(boardEl, {
            position: 'start',
            draggable: true,
            // FIX: Set board orientation based on player color
            orientation: playerColor,
            pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png',
            onDragStart: onDragStart,
            onDrop: onDrop,
            onSnapEnd: onSnapEnd,
            // FIX: Remove custom mouse handlers since chessboard.js handles highlighting
            // onMouseoutSquare: onMouseoutSquare,
            // onMouseoverSquare: onMouseoverSquare,
            // FIX: Remove custom click handler - chessboard.js handles this automatically
            // onSquareClick: onSquareClick
        });
        
        boardInitialized = true;
        
        console.log('Chess board created:', board);
        console.log('Board position:', board.position());
        
        updateStatus();
        updateMoveHistory();
        
        // If player is black, make AI move first
        if (playerColor === 'black') {
            setTimeout(makeAIMove, 500);
        }
        
        // Start timer if time control is set
        const timeControlValue = document.getElementById('time-control-select').value;
        if (timeControlValue !== 'none') {
            startTimeControl(timeControlValue);
        }
        
        // FIX: Initial board sizing
        setTimeout(resizeBoards, 100);
        
        console.log('=== CHESS BOARD INITIALIZATION COMPLETE ===');
    }
    
    // Initialize puzzle board
    function initializePuzzleBoard() {
        console.log('Initializing puzzle board...');
        
        // Check if chess.js is loaded
        if (typeof Chess === 'undefined') {
            console.error('Chess.js library not loaded!');
            return;
        }
        
        // Check if chessboardjs is loaded
        if (typeof Chessboard === 'undefined') {
            console.error('Chessboard.js library not loaded!');
            return;
        }
        
        // Initialize puzzle game
        puzzleGame = new Chess();
        
        // Get board element
        const boardEl = document.getElementById('puzzle-board');
        if (!boardEl) {
            console.error('Puzzle board element not found!');
            return;
        }
        
        // Check if board already exists
        if (puzzleBoard) {
            console.log('Puzzle board already exists, destroying it first');
            puzzleBoard.destroy();
        }
        
        // Initialize board
        console.log('Creating puzzle chessboard...');
        puzzleBoard = Chessboard(boardEl, {
            position: 'start',
            draggable: true,
            pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png',
            onDragStart: onPuzzleDragStart,
            onDrop: onPuzzleDrop,
            onSnapEnd: onPuzzleSnapEnd,
            // FIX: Remove custom click handler for puzzle board too
            // onMouseoutSquare: onMouseoutSquare,
            // onMouseoverSquare: onMouseoverSquare,
            // onSquareClick: onSquareClick
        });
        
        puzzleBoardInitialized = true;
        
        // Load first puzzle
        loadNextPuzzle();
        
        // Load puzzle stats from localStorage
        const savedPuzzlesSolved = localStorage.getItem('puzzlesSolved');
        const savedBestStreak = localStorage.getItem('bestStreak');
        
        if (savedPuzzlesSolved) puzzlesSolved = parseInt(savedPuzzlesSolved);
        if (savedBestStreak) bestStreak = parseInt(savedBestStreak);
        
        updatePuzzleStats();
        
        // FIX: Initial board sizing
        setTimeout(resizeBoards, 100);
        
        console.log('=== PUZZLE BOARD INITIALIZATION COMPLETE ===');
    }
    
    // Chess drag and drop functions
    function onDragStart(source, piece, position, orientation) {
        console.log('Drag start:', source, piece);
        if (game.game_over()) return false;
        
        // Check if it's player's turn
        const isPlayerTurn = (game.turn() === 'w' && playerColor === 'white') || 
                           (game.turn() === 'b' && playerColor === 'black');
        
        if (!isPlayerTurn) return false;
        
        // Only allow dragging of pieces for the side to move
        if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
            (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
            return false;
        }
    }
    
    function onDrop(source, target) {
        console.log('Drop:', source, 'to', target);
        
        // See if the move is legal
        var move = game.move({
            from: source,
            to: target,
            promotion: 'q'
        });
        
        // If illegal move, snapback
        if (move === null) return 'snapback';
        
        console.log('Legal move:', move);
        
        // Add to game history
        gameHistory.push(move.san);
        moveHistoryIndex = gameHistory.length;
        
        // Update the board
        updateBoard();
        
        // Make AI move after a short delay
        if (!game.game_over()) {
            setTimeout(makeAIMove, 250);
        } else {
            // Game ended, show analysis
            clearInterval(timeInterval);
            setTimeout(analyzeGame, 1000);
        }
    }
    
    function onSnapEnd() {
        console.log('Snap end');
        board.position(game.fen());
    }
    
    // FIX: Remove custom mouse handlers since chessboard.js handles highlighting
    // function onMouseoverSquare(square, piece) {
    //     // Get all legal moves for the selected piece
    //     if (selectedSquare) {
    //         const moves = game.moves({
    //             square: selectedSquare,
    //             verbose: true
    //         });
    //         
    //         // Highlight possible target squares
    //         moves.forEach(move => {
    //             if (move.to === square) {
    //                 $(`.square-${square}`).addClass('highlight-valid');
    //             }
    //         });
    //     }
    // }
    
    // function onMouseoutSquare(square, piece) {
    //     // Remove highlights
    //     $(`.square-${square}`).removeClass('highlight-valid');
    // }
    
    // FIX: Remove custom onSquareClick - chessboard.js handles this automatically
    // function onSquareClick(square) {
    //     // This is now handled by chessboard.js automatically
    // }
    
    // Puzzle drag and drop functions
    function onPuzzleDragStart(source, piece, position, orientation) {
        if (!currentPuzzle) return false;
        
        // Only allow the player to move the side they're supposed to in the puzzle
        const puzzleFen = currentPuzzle.fen;
        const turn = puzzleFen.split(' ')[1];
        
        if ((turn === 'w' && piece.search(/^b/) !== -1) ||
            (turn === 'b' && piece.search(/^w/) !== -1)) {
            return false;
        }
    }
    
    function onPuzzleDrop(source, target) {
        if (!currentPuzzle) return 'snapback';
        
        const move = puzzleGame.move({
            from: source,
            to: target,
            promotion: 'q'
        });
        
        if (move === null) return 'snapback';
        
        // Check if the move is correct
        if (move.san === currentPuzzle.solution) {
            document.getElementById('puzzle-status').textContent = 'Correct! Well done!';
            puzzlesSolved++;
            currentStreak++;
            if (currentStreak > bestStreak) {
                bestStreak = currentStreak;
            }
            updatePuzzleStats();
            setTimeout(() => {
                loadNextPuzzle();
            }, 2000);
        } else {
            document.getElementById('puzzle-status').textContent = 'Not quite right. Try again!';
            puzzleGame.undo();
        }
        
        puzzleBoard.position(puzzleGame.fen());
    }
    
    function onPuzzleSnapEnd() {
        puzzleBoard.position(puzzleGame.fen());
    }
    
    // Update board and game status
    function updateBoard() {
        console.log('Updating board...');
        board.position(game.fen());
        updateStatus();
        updateMoveHistory();
    }
    
    function updateStatus() {
        const statusEl = document.getElementById('game-status');
        if (!statusEl) return;
        
        let status = '';
        
        if (game.in_checkmate()) {
            const winner = game.turn() === 'w' ? 'Black' : 'White';
            status = 'Game over, ' + winner + ' wins by checkmate.';
            
            // Update stats
            gamesPlayed++;
            if ((winner === 'White' && playerColor === 'white') || 
                (winner === 'Black' && playerColor === 'black')) {
                gamesWon++;
            } else {
                gamesLost++;
            }
            
            // Teach AI the result
            if (winner === 'Black') {
                teachAI('ai_win');
            } else {
                teachAI('player_win');
            }
        } else if (game.in_draw()) {
            status = 'Game over, drawn position';
            gamesPlayed++;
            gamesDrawn++;
            teachAI('draw');
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
                <span class="white-move" data-move-index="${i}" data-move="${whiteMove.san}">${whiteMove.san}</span>`;
            
            if (blackMove) {
                html += `<span class="black-move" data-move-index="${i+1}" data-move="${blackMove.san}">${blackMove.san}</span>`;
            }
            
            html += '</div>';
        }
        
        moveListEl.innerHTML = html;
        
        // Add click listeners to moves for classification display
        document.querySelectorAll('.white-move, .black-move').forEach(moveEl => {
            moveEl.addEventListener('click', function() {
                const moveIndex = parseInt(this.dataset.moveIndex);
                showMoveClassification(moveIndex);
            });
        });
        
        updateMoveHistoryHighlight();
    }
    
    function updateMoveHistoryHighlight() {
        const movePairs = document.querySelectorAll('.move-pair');
        
        movePairs.forEach((pair, index) => {
            const whiteMove = index * 2;
            const blackMove = whiteMove + 1;
            
            const whiteMoveEl = pair.querySelector('.white-move');
            const blackMoveEl = pair.querySelector('.black-move');
            
            if (whiteMoveEl) {
                whiteMoveEl.classList.toggle('highlight', whiteMove === moveHistoryIndex - 1);
            }
            
            if (blackMoveEl) {
                blackMoveEl.classList.toggle('highlight', blackMove === moveHistoryIndex - 1);
            }
        });
    }
    
    function showMoveClassification(moveIndex) {
        if (!moveAnalysis[moveIndex]) return;
        
        const classification = moveAnalysis[moveIndex];
        const tooltip = document.getElementById('move-tooltip');
        const tooltipTitle = document.getElementById('tooltip-title');
        const tooltipContent = document.getElementById('tooltip-content');
        
        // Set tooltip content
        tooltipTitle.textContent = classification.type.charAt(0).toUpperCase() + classification.type.slice(1);
        tooltipContent.textContent = classification.explanation || 'This move was classified as ' + classification.type;
        
        // Position tooltip near the clicked move
        const moveEl = document.querySelector(`[data-move-index="${moveIndex}"]`);
        if (moveEl) {
            const rect = moveEl.getBoundingClientRect();
            tooltip.style.left = rect.left + 'px';
            tooltip.style.top = (rect.bottom + 5) + 'px';
        }
        
        // Show tooltip
        tooltip.classList.add('show');
        
        // Hide tooltip after 3 seconds
        setTimeout(() => {
            tooltip.classList.remove('show');
        }, 3000);
    }
    
    // Move history controls
    function goToMove(index) {
        if (index < 0 || index > gameHistory.length) return;
        
        moveHistoryIndex = index;
        
        // Create a new game to replay moves
        const tempGame = new Chess();
        
        for (let i = 0; i < index; i++) {
            tempGame.move(gameHistory[i]);
        }
        
        board.position(tempGame.fen());
        
        // Update move history highlighting
        updateMoveHistoryHighlight();
    }
    
    function goToPreviousMove() {
        if (moveHistoryIndex > 0) {
            goToMove(moveHistoryIndex - 1);
        }
    }
    
    function goToNextMove() {
        if (moveHistoryIndex < gameHistory.length) {
            goToMove(moveHistoryIndex + 1);
        }
    }
    
    function togglePlayMoves() {
        const playBtn = document.getElementById('play-pause-btn');
        
        if (isPlayingMoves) {
            clearInterval(playInterval);
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
            isPlayingMoves = false;
        } else {
            playBtn.innerHTML = '<i class="fas fa-pause"></i>';
            isPlayingMoves = true;
            
            playInterval = setInterval(() => {
                if (moveHistoryIndex < gameHistory.length) {
                    goToNextMove();
                } else {
                    togglePlayMoves();
                }
            }, 1000);
        }
    }
    
    // Time control functions
    function startTimeControl(timeControlValue) {
        // Parse time control value
        const parts = timeControlValue.split('-');
        const minutes = parseInt(parts[1]);
        const increment = parts.length > 2 ? parseInt(parts[2]) : 0;
        
        // Set initial times
        playerTime = minutes * 60;
        aiTime = minutes * 60;
        
        // Update display
        updateTimeDisplay();
        
        // Clear any existing interval
        if (timeInterval) clearInterval(timeInterval);
        
        // Start timer
        timeInterval = setInterval(() => {
            const currentPlayer = playerColor === 'white' ? 'w' : 'b';
            const currentAI = playerColor === 'white' ? 'b' : 'w';
            
            if (game.turn() === currentPlayer) {
                playerTime -= 1;
            } else if (game.turn() === currentAI) {
                aiTime -= 1;
            }
            
            updateTimeDisplay();
            
            // Check for timeout
            if (playerTime <= 0) {
                clearInterval(timeInterval);
                alert('Time out! You lose on time.');
                gamesPlayed++;
                gamesLost++;
                teachAI('ai_win');
                newGame();
            } else if (aiTime <= 0) {
                clearInterval(timeInterval);
                alert('Time out! AI loses on time. You win!');
                gamesPlayed++;
                gamesWon++;
                teachAI('player_win');
                newGame();
            }
            
            // Add increment after move
            if (increment > 0 && game.history().length > 0) {
                const lastMove = game.history()[game.history().length - 1];
                if (lastMove) {
                    if (game.turn() === currentPlayer) {
                        aiTime += increment;
                    } else {
                        playerTime += increment;
                    }
                }
            }
        }, 1000);
    }
    
    function updateTimeDisplay() {
        const playerTimeEl = document.getElementById('player-time');
        const aiTimeEl = document.getElementById('ai-time');
        
        if (playerTimeEl) {
            playerTimeEl.textContent = formatTime(playerTime);
        }
        
        if (aiTimeEl) {
            aiTimeEl.textContent = formatTime(aiTime);
        }
    }
    
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    
    // Puzzle functions
    function loadNextPuzzle() {
        // NEW: Try to get puzzle from AI brain first
        getPuzzleFromAI()
            .then(puzzle => {
                if (puzzle) {
                    currentPuzzle = puzzle;
                    puzzleGame.load(puzzle.fen);
                    puzzleBoard.position(puzzle.fen);
                    
                    document.getElementById('puzzle-status').textContent = 'Solve this puzzle';
                    document.getElementById('puzzle-category').textContent = puzzle.category || 'Tactics';
                    document.getElementById('puzzle-difficulty').textContent = puzzle.difficulty || 'Medium';
                    document.getElementById('puzzle-hint').style.display = 'none';
                } else {
                    // Fallback to predefined puzzles
                    loadPredefinedPuzzle();
                }
            })
            .catch(error => {
                console.error('Error getting puzzle from AI:', error);
                // Fallback to predefined puzzles
                loadPredefinedPuzzle();
            });
    }
    
    // NEW: Function to get puzzles from AI brain
    async function getPuzzleFromAI() {
        try {
            const response = await fetch(`${API_URL}/puzzle`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    difficulty: document.getElementById('difficulty-select').value,
                    category: 'mixed',
                    fromHistory: true // Try to get puzzles from game history
                })
            });
            
            const data = await response.json();
            return data.puzzle || null;
        } catch (error) {
            console.error('Error getting puzzle from AI:', error);
            return null;
        }
    }
    
    // NEW: Function to load predefined puzzles as fallback
    function loadPredefinedPuzzle() {
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
        
        currentPuzzle = puzzles[Math.floor(Math.random() * puzzles.length)];
        
        puzzleGame.load(currentPuzzle.fen);
        puzzleBoard.position(puzzleGame.fen());
        
        document.getElementById('puzzle-status').textContent = 'Solve this puzzle';
        document.getElementById('puzzle-category').textContent = currentPuzzle.category;
        document.getElementById('puzzle-difficulty').textContent = currentPuzzle.difficulty;
        document.getElementById('puzzle-hint').style.display = 'none';
    }
    
    function showPuzzleHint() {
        if (!currentPuzzle) return;
        
        document.getElementById('puzzle-hint').style.display = 'flex';
        document.getElementById('puzzle-hint-text').textContent = currentPuzzle.hint;
    }
    
    function updatePuzzleStats() {
        document.getElementById('puzzles-solved').textContent = puzzlesSolved;
        document.getElementById('puzzle-streak').textContent = currentStreak;
        document.getElementById('best-streak').textContent = bestStreak;
        
        // Save to localStorage
        localStorage.setItem('puzzlesSolved', puzzlesSolved);
        localStorage.setItem('bestStreak', bestStreak);
    }
    
    // Game Analysis - Connected to AI
    async function analyzeGame() {
        if (!game) return;
        
        // Get current ELO ratings
        const playerElo = parseInt(localStorage.getItem('playerElo') || '1200');
        const aiElo = parseInt(document.getElementById('difficulty-select').value === 'beginner' ? '800' : 
                             document.getElementById('difficulty-select').value === 'intermediate' ? '1200' : 
                             document.getElementById('difficulty-select').value === 'advanced' ? '1600' : '2000');
        
        try {
            // Send game to AI for analysis
            const response = await fetch(`${API_URL}/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    game: {
                        moves: game.history(),
                        result: game.in_checkmate() ? (game.turn() === 'w' ? 'Black wins' : 'White wins') : 
                               game.in_draw() ? 'Draw' : 'Ongoing',
                        playerColor: playerColor,
                        difficulty: document.getElementById('difficulty-select').value
                    }
                })
            });
            
            const data = await response.json();
            
            if (data.analysis) {
                gameAnalysis = {
                    result: data.analysis.result,
                    playerAccuracy: data.analysis.accuracy,
                    moveClassifications: data.analysis.moveClassifications,
                    playerElo: playerElo,
                    aiElo: aiElo,
                    moveAnalysis: data.analysis.moveAnalysis || []
                };
                
                // Store move analysis for tooltips
                moveAnalysis = gameAnalysis.moveAnalysis;
            } else {
                // Fallback to simulated analysis
                gameAnalysis = {
                    result: game.in_checkmate() ? (game.turn() === 'w' ? 'Black wins' : 'White wins') : 'Draw',
                    playerAccuracy: Math.floor(Math.random() * 30) + 70,
                    moveClassifications: {
                        brilliant: Math.floor(Math.random() * 3),
                        best: Math.floor(Math.random() * 5) + 2,
                        good: Math.floor(Math.random() * 8) + 5,
                        mistake: Math.floor(Math.random() * 5) + 2,
                        blunder: Math.floor(Math.random() * 3)
                    },
                    playerElo: playerElo,
                    aiElo: aiElo,
                    moveAnalysis: []
                };
            }
        } catch (error) {
            console.error('Error getting AI analysis:', error);
            // Fallback to simulated analysis
            gameAnalysis = {
                result: game.in_checkmate() ? (game.turn() === 'w' ? 'Black wins' : 'White wins') : 'Draw',
                playerAccuracy: Math.floor(Math.random() * 30) + 70,
                moveClassifications: {
                    brilliant: Math.floor(Math.random() * 3),
                    best: Math.floor(Math.random() * 5) + 2,
                    good: Math.floor(Math.random() * 8) + 5,
                    mistake: Math.floor(Math.random() * 5) + 2,
                    blunder: Math.floor(Math.random() * 3)
                },
                playerElo: playerElo,
                aiElo: aiElo,
                moveAnalysis: []
            };
        }
        
        // Calculate new ELO based on game result
        let newPlayerElo = playerElo;
        if (gameAnalysis.result === 'White wins' || gameAnalysis.result === 'Black wins') {
            const isPlayerWin = (gameAnalysis.result === 'White wins' && playerColor === 'white') ||
                               (gameAnalysis.result === 'Black wins' && playerColor === 'black');
            
            if (isPlayerWin) {
                // Player won - gain ELO
                newPlayerElo = playerElo + Math.floor(32 * (1 - 1 / (1 + Math.pow(10, (aiElo - playerElo) / 400))));
            } else {
                // Player lost - lose ELO
                newPlayerElo = playerElo + Math.floor(32 * (0 - 1 / (1 + Math.pow(10, (aiElo - playerElo) / 400))));
            }
            
            // Save new ELO
            localStorage.setItem('playerElo', newPlayerElo.toString());
        }
        
        gameAnalysis.newPlayerElo = Math.floor(newPlayerElo);
        
        // Update adaptive difficulty based on performance
        if (adaptiveDifficultyEnabled) {
            updateAdaptiveDifficulty();
        }
        
        // Store performance history
        playerPerformanceHistory.push({
            date: new Date(),
            accuracy: gameAnalysis.playerAccuracy,
            result: gameAnalysis.result,
            elo: newPlayerElo
        });
        
        // Update stats
        updateStats();
        
        // Show the analysis modal
        showAnalysisModal();
    }
    
    // NEW: Function to analyze imported games
    async function analyzeImportedGame() {
        if (!importedGame) return;
        
        try {
            // Send imported game to AI for analysis
            const response = await fetch(`${API_URL}/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    game: {
                        moves: importedGame.history(),
                        result: importedGame.in_checkmate() ? (importedGame.turn() === 'w' ? 'Black wins' : 'White wins') : 
                               importedGame.in_draw() ? 'Draw' : 'Ongoing',
                        isImported: true, // Flag to indicate this is an imported game
                        doNotLearn: true // Flag to prevent AI from learning
                    }
                })
            });
            
            const data = await response.json();
            
            if (data.analysis) {
                importedGameAnalysis = {
                    result: data.analysis.result,
                    playerAccuracy: data.analysis.accuracy,
                    moveClassifications: data.analysis.moveClassifications,
                    moveAnalysis: data.analysis.moveAnalysis || []
                };
                
                // Show analysis modal with imported game data
                showImportedAnalysisModal();
            } else {
                // Fallback to simulated analysis
                importedGameAnalysis = {
                    result: importedGame.in_checkmate() ? (importedGame.turn() === 'w' ? 'Black wins' : 'White wins') : 'Draw',
                    playerAccuracy: Math.floor(Math.random() * 30) + 70,
                    moveClassifications: {
                        brilliant: Math.floor(Math.random() * 3),
                        best: Math.floor(Math.random() * 5) + 2,
                        good: Math.floor(Math.random() * 8) + 5,
                        mistake: Math.floor(Math.random() * 5) + 2,
                        blunder: Math.floor(Math.random() * 3)
                    },
                    moveAnalysis: []
                };
                
                // Show analysis modal with imported game data
                showImportedAnalysisModal();
            }
        } catch (error) {
            console.error('Error getting AI analysis for imported game:', error);
            alert('Error analyzing imported game. Please try again.');
        }
    }
    
    // NEW: Function to show analysis modal for imported games
    function showImportedAnalysisModal() {
        // Update modal title
        document.querySelector('#game-analysis-modal .modal-header h2').innerHTML = '<i class="fas fa-file-import"></i> Imported Game Analysis';
        
        // Update modal content with imported game analysis
        document.getElementById('game-result').textContent = importedGameAnalysis.result;
        document.getElementById('player-accuracy').textContent = importedGameAnalysis.playerAccuracy + '%';
        document.getElementById('player-elo').textContent = 'N/A (Imported Game)';
        document.getElementById('ai-elo').textContent = 'N/A (Imported Game)';
        
        document.getElementById('brilliant-count').textContent = importedGameAnalysis.moveClassifications.brilliant;
        document.getElementById('best-count').textContent = importedGameAnalysis.moveClassifications.best;
        document.getElementById('good-count').textContent = importedGameAnalysis.moveClassifications.good;
        document.getElementById('mistake-count').textContent = importedGameAnalysis.moveClassifications.mistake;
        document.getElementById('blunder-count').textContent = importedGameAnalysis.moveClassifications.blunder;
        
        // Add a note that AI won't learn from this game
        const note = document.createElement('p');
        note.textContent = 'Note: The AI will not learn from this imported game.';
        note.style.color = 'var(--warning-color)';
        note.style.marginTop = '1rem';
        note.style.fontStyle = 'italic';
        
        // Remove any existing note
        const existingNote = document.querySelector('#game-analysis-modal .import-note');
        if (existingNote) {
            existingNote.remove();
        }
        
        // Add the note to the modal
        note.className = 'import-note';
        document.querySelector('#game-analysis-modal .modal-body').appendChild(note);
        
        // Show the modal
        document.getElementById('game-analysis-modal').style.display = 'block';
    }
    
    function showAnalysisModal() {
        // Reset modal title in case it was changed for imported game
        document.querySelector('#game-analysis-modal .modal-header h2').innerHTML = '<i class="fas fa-chart-line"></i> Game Analysis';
        
        // Remove any existing import note
        const existingNote = document.querySelector('#game-analysis-modal .import-note');
        if (existingNote) {
            existingNote.remove();
        }
        
        document.getElementById('game-result').textContent = gameAnalysis.result;
        document.getElementById('player-accuracy').textContent = gameAnalysis.playerAccuracy + '%';
        document.getElementById('player-elo').textContent = gameAnalysis.playerElo + ' → ' + gameAnalysis.newPlayerElo;
        document.getElementById('ai-elo').textContent = gameAnalysis.aiElo;
        
        document.getElementById('brilliant-count').textContent = gameAnalysis.moveClassifications.brilliant;
        document.getElementById('best-count').textContent = gameAnalysis.moveClassifications.best;
        document.getElementById('good-count').textContent = gameAnalysis.moveClassifications.good;
        document.getElementById('mistake-count').textContent = gameAnalysis.moveClassifications.mistake;
        document.getElementById('blunder-count').textContent = gameAnalysis.moveClassifications.blunder;
        
        // Add click listeners to move classification stats
        document.querySelectorAll('.move-stat').forEach(statEl => {
            statEl.addEventListener('click', function() {
                const type = this.dataset.type;
                showMovesByClassification(type);
            });
        });
        
        // Draw accuracy chart
        drawAccuracyChart();
        
        document.getElementById('game-analysis-modal').style.display = 'block';
    }
    
    function showMovesByClassification(type) {
        // Find all moves of this classification
        const moves = [];
        const analysis = gameAnalysis || importedGameAnalysis;
        
        if (!analysis || !analysis.moveAnalysis) {
            alert(`No ${type} moves found in this game.`);
            return;
        }
        
        analysis.moveAnalysis.forEach((analysisItem, index) => {
            if (analysisItem.type === type) {
                const gameHistory = game ? game.history() : importedGame.history();
                moves.push({
                    move: gameHistory[index],
                    index: index,
                    explanation: analysisItem.explanation
                });
            }
        });
        
        if (moves.length === 0) {
            alert(`No ${type} moves found in this game.`);
            return;
        }
        
        // Create a list of moves
        let moveList = `${type.charAt(0).toUpperCase() + type.slice(1)} moves:\n\n`;
        moves.forEach(m => {
            moveList += `${m.index + 1}. ${m.move} - ${m.explanation}\n`;
        });
        
        alert(moveList);
    }
    
    function closeAnalysisModal() {
        document.getElementById('game-analysis-modal').style.display = 'none';
    }
    
    function downloadAnalysis() {
        // Create a text file with the analysis
        const analysis = gameAnalysis || importedGameAnalysis;
        const gameHistory = game ? game.history() : importedGame.history();
        
        let analysisText = `Game Analysis - ${new Date().toLocaleString()}\n\n`;
        analysisText += `Result: ${analysis.result}\n`;
        analysisText += `Player Accuracy: ${analysis.playerAccuracy}%\n`;
        
        if (gameAnalysis) {
            analysisText += `Player ELO: ${gameAnalysis.playerElo} → ${gameAnalysis.newPlayerElo}\n`;
            analysisText += `AI ELO: ${gameAnalysis.aiElo}\n`;
        } else {
            analysisText += `Player ELO: N/A (Imported Game)\n`;
            analysisText += `AI ELO: N/A (Imported Game)\n`;
        }
        
        analysisText += `\nMove Classifications:\n`;
        analysisText += `Brilliant: ${analysis.moveClassifications.brilliant}\n`;
        analysisText += `Best: ${analysis.moveClassifications.best}\n`;
        analysisText += `Good: ${analysis.moveClassifications.good}\n`;
        analysisText += `Mistake: ${analysis.moveClassifications.mistake}\n`;
        analysisText += `Blunder: ${analysis.moveClassifications.blunder}\n\n`;
        analysisText += `Move History:\n`;
        analysisText += gameHistory.join(', ');
        
        // Create a download link
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(analysisText));
        element.setAttribute('download', `chess-analysis-${Date.now()}.txt`);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }
    
    function drawAccuracyChart() {
        // This would normally use a charting library like Chart.js
        // For now, we'll just create a simple representation
        const canvas = document.getElementById('accuracy-chart');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw a simple line chart showing accuracy over time
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        const width = canvas.width;
        const height = canvas.height;
        const padding = 20;
        
        // Draw axes
        ctx.strokeStyle = '#555';
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();
        
        // Draw data points (simulated)
        ctx.fillStyle = '#3498db';
        const dataPoints = playerPerformanceHistory.slice(-10); // Last 10 games
        
        if (dataPoints.length > 0) {
            const xStep = (width - 2 * padding) / Math.max(dataPoints.length - 1, 1);
            const yScale = (height - 2 * padding) / 100;
            
            dataPoints.forEach((point, index) => {
                const x = padding + index * xStep;
                const y = height - padding - point.accuracy * yScale;
                
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
                
                // Draw point
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, 2 * Math.PI);
                ctx.fill();
            });
            
            ctx.strokeStyle = '#3498db';
            ctx.stroke();
        }
    }
    
    // Adaptive Difficulty
    function updateAdaptiveDifficulty() {
        if (!adaptiveDifficultyEnabled) return;
        
        const difficultySelect = document.getElementById('difficulty-select');
        const currentDifficulty = difficultySelect.value;
        const accuracy = gameAnalysis.playerAccuracy;
        
        // Adjust difficulty based on performance
        if (accuracy > 90 && currentDifficulty !== 'expert') {
            // Player is doing very well, increase difficulty
            const difficulties = ['beginner', 'intermediate', 'advanced', 'expert'];
            const currentIndex = difficulties.indexOf(currentDifficulty);
            if (currentIndex < difficulties.length - 1) {
                difficultySelect.value = difficulties[currentIndex + 1];
                showNotification(`Difficulty increased to ${difficulties[currentIndex + 1]}`);
            }
        } else if (accuracy < 60 && currentDifficulty !== 'beginner') {
            // Player is struggling, decrease difficulty
            const difficulties = ['beginner', 'intermediate', 'advanced', 'expert'];
            const currentIndex = difficulties.indexOf(currentDifficulty);
            if (currentIndex > 0) {
                difficultySelect.value = difficulties[currentIndex - 1];
                showNotification(`Difficulty decreased to ${difficulties[currentIndex - 1]}`);
            }
        }
    }
    
    function showNotification(message) {
        // Create a notification element
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        
        // Style the notification
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.right = '20px';
        notification.style.backgroundColor = '#3498db';
        notification.style.color = 'white';
        notification.style.padding = '15px 20px';
        notification.style.borderRadius = '8px';
        notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        notification.style.zIndex = '3000';
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        
        document.body.appendChild(notification);
        
        // Fade in
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 10);
        
        // Fade out and remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
    
    // Stats Management
    function loadStats() {
        // Load stats from localStorage
        const savedGamesPlayed = localStorage.getItem('gamesPlayed');
        const savedGamesWon = localStorage.getItem('gamesWon');
        const savedGamesLost = localStorage.getItem('gamesLost');
        const savedGamesDrawn = localStorage.getItem('gamesDrawn');
        const savedRating = localStorage.getItem('playerElo') || localStorage.getItem('rating');
        const savedLearningScore = localStorage.getItem('learningScore');
        
        if (savedGamesPlayed) {
            gamesPlayed = parseInt(savedGamesPlayed);
            document.getElementById('games-played').textContent = gamesPlayed;
        }
        if (savedGamesWon) gamesWon = parseInt(savedGamesWon);
        if (savedGamesLost) gamesLost = parseInt(savedGamesLost);
        if (savedGamesDrawn) gamesDrawn = parseInt(savedGamesDrawn);
        
        // Calculate and display win rate
        if (gamesPlayed > 0) {
            const winRate = Math.round((gamesWon / gamesPlayed) * 100);
            document.getElementById('win-rate').textContent = winRate + '%';
        }
        
        if (savedRating) document.getElementById('rating').textContent = savedRating;
        if (savedLearningScore) document.getElementById('learning-score').textContent = savedLearningScore;
    }
    
    function updateStats() {
        // Update games played
        document.getElementById('games-played').textContent = gamesPlayed;
        localStorage.setItem('gamesPlayed', gamesPlayed);
        
        // Update win rate
        if (gamesPlayed > 0) {
            const winRate = Math.round((gamesWon / gamesPlayed) * 100);
            document.getElementById('win-rate').textContent = winRate + '%';
            localStorage.setItem('gamesWon', gamesWon);
            localStorage.setItem('gamesLost', gamesLost);
            localStorage.setItem('gamesDrawn', gamesDrawn);
        }
        
        // Update learning score
        const learningScoreEl = document.getElementById('learning-score');
        let learningScore = parseInt(learningScoreEl.textContent);
        learningScore += Math.floor(gameAnalysis.playerAccuracy / 10);
        learningScoreEl.textContent = learningScore;
        localStorage.setItem('learningScore', learningScore);
    }
    
    // AI Move Function - Now uses your AI backend!
    async function makeAIMove() {
        if (game.game_over()) return;
        
        console.log('Getting AI move from backend...');
        
        try {
            const response = await fetch(`${API_URL}/game/move`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fen: game.fen(),
                    personality: document.getElementById('personality-select').value,
                    difficulty: document.getElementById('difficulty-select').value
                })
            });
            
            const data = await response.json();
            
            if (data.move) {
                console.log('AI responded with move:', data.move);
                
                // Make the AI's move
                const move = game.move({
                    from: data.move.substring(0, 2),
                    to: data.move.substring(2, 4),
                    promotion: data.move.length > 4 ? data.move.substring(4, 5) : 'q'
                });
                
                if (move) {
                    gameHistory.push(move.san);
                    moveHistoryIndex = gameHistory.length;
                    updateBoard();
                    console.log('AI move completed:', move.san);
                } else {
                    console.error('Invalid AI move:', data.move);
                }
            } else {
                console.error('AI did not return a move');
            }
        } catch (error) {
            console.error('Error getting AI move:', error);
            // Fallback to random move if API fails
            const legalMoves = game.moves();
            if (legalMoves.length > 0) {
                const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
                game.move(randomMove);
                gameHistory.push(randomMove);
                moveHistoryIndex = gameHistory.length;
                updateBoard();
            }
        }
    }
    
    // Teach AI from completed game
    async function teachAI(result) {
        console.log('Teaching AI - Game result:', result);
        
        try {
            const response = await fetch(`${API_URL}/learn`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    gameData: {
                        game_id: `game_${Date.now()}`,
                        moves: game.history(),
                        result: result,
                        playerColor: playerColor,
                        difficulty: document.getElementById('difficulty-select').value
                    }
                })
            });
            
            const data = await response.json();
            console.log('AI learned from game:', data);
        } catch (error) {
            console.error('Error teaching AI:', error);
        }
    }
    
    // Game controls
    function newGame() {
        if (game) {
            game.reset();
            gameHistory = [];
            moveHistoryIndex = 0;
            moveAnalysis = [];
            selectedSquare = null;
            if (board) {
                board.position('start');
            }
            updateStatus();
            updateMoveHistory();
            
            // Clear timer
            if (timeInterval) {
                clearInterval(timeInterval);
            }
            
            // Determine player color for new game
            const colorSelect = document.getElementById('color-select');
            if (colorSelect.value === 'random') {
                playerColor = Math.random() < 0.5 ? 'white' : 'black';
            } else {
                playerColor = colorSelect.value;
            }
            
            // FIX: Update board orientation when starting a new game
            if (board && playerColor === 'black') {
                board.orientation('black');
            } else if (board) {
                board.orientation('white');
            }
            
            // If player is black, make AI move first
            if (playerColor === 'black') {
                setTimeout(makeAIMove, 500);
            }
            
            // Start timer if time control is set
            const timeControlValue = document.getElementById('time-control-select').value;
            if (timeControlValue !== 'none') {
                startTimeControl(timeControlValue);
            }
        } else {
            initializeChessBoard();
        }
    }
    
    // Chat functionality - Connected to AI
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
    
    async function sendChatMessage() {
        if (!chatInput) return;
        
        const message = chatInput.value.trim();
        if (!message) return;
        
        // Add user message
        addChatMessage(message, true);
        
        // Clear input
        chatInput.value = '';
        
        try {
            const response = await fetch(`${API_URL}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    message: message,
                    context: {
                        currentGame: game ? game.fen() : null,
                        playerColor: playerColor,
                        gameHistory: gameHistory
                    }
                })
            });
            
            const data = await response.json();
            
            if (data.response) {
                addChatMessage(data.response);
            }
        } catch (error) {
            console.error('Error sending chat message:', error);
            // Fallback response
            addChatMessage("I'm having trouble connecting right now, but I'm here to help!");
        }
    }
    
    // NEW: Import Game Functions
    function showImportModal() {
        document.getElementById('import-modal').style.display = 'block';
    }
    
    function closeImportModal() {
        document.getElementById('import-modal').style.display = 'none';
        // Reset import form
        document.getElementById('import-textarea').value = '';
        document.getElementById('import-textarea').style.display = 'none';
        document.getElementById('analyze-imported-btn').disabled = true;
        importType = null;
    }
    
    function handleImportOption(option) {
        // Reset all options
        document.querySelectorAll('.import-option').forEach(el => {
            el.style.background = '#333';
        });
        
        // Highlight selected option
        option.style.background = 'rgba(52, 152, 219, 0.2)';
        
        // Show appropriate input method
        const textarea = document.getElementById('import-textarea');
        const fileInput = document.getElementById('import-file-input');
        
        if (option.id === 'import-pgn-option') {
            importType = 'pgn';
            textarea.placeholder = 'Paste your PGN (Portable Game Notation) here...';
            textarea.style.display = 'block';
            fileInput.style.display = 'none';
        } else if (option.id === 'import-fen-option') {
            importType = 'fen';
            textarea.placeholder = 'Paste your FEN (Forsyth-Edwards Notation) here...';
            textarea.style.display = 'block';
            fileInput.style.display = 'none';
        } else if (option.id === 'import-file-option') {
            importType = 'file';
            textarea.style.display = 'none';
            fileInput.style.display = 'block';
            fileInput.click();
        }
    }
    
    function processImportedData() {
        const textarea = document.getElementById('import-textarea');
        const fileInput = document.getElementById('import-file-input');
        
        if (importType === 'pgn') {
            const pgnText = textarea.value.trim();
            if (!pgnText) {
                alert('Please enter PGN data.');
                return;
            }
            
            try {
                importedGame = new Chess();
                const pgnResult = importedGame.load_pgn(pgnText);
                
                if (!pgnResult) {
                    throw new Error('Invalid PGN format');
                }
                
                // Enable analyze button
                document.getElementById('analyze-imported-btn').disabled = false;
                showNotification('PGN loaded successfully. Click "Analyze Game" to continue.');
            } catch (error) {
                alert('Error loading PGN: ' + error.message);
            }
        } else if (importType === 'fen') {
            const fenText = textarea.value.trim();
            if (!fenText) {
                alert('Please enter FEN data.');
                return;
            }
            
            try {
                importedGame = new Chess();
                const fenResult = importedGame.load(fenText);
                
                if (!fenResult) {
                    throw new Error('Invalid FEN format');
                }
                
                // Enable analyze button
                document.getElementById('analyze-imported-btn').disabled = false;
                showNotification('FEN loaded successfully. Click "Analyze Game" to continue.');
            } catch (error) {
                alert('Error loading FEN: ' + error.message);
            }
        } else if (importType === 'file') {
            const file = fileInput.files[0];
            if (!file) {
                alert('Please select a PGN file.');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    importedGame = new Chess();
                    const pgnResult = importedGame.load_pgn(e.target.result);
                    
                    if (!pgnResult) {
                        throw new Error('Invalid PGN format in file');
                    }
                    
                    // Enable analyze button
                    document.getElementById('analyze-imported-btn').disabled = false;
                    showNotification('PGN file loaded successfully. Click "Analyze Game" to continue.');
                } catch (error) {
                    alert('Error loading PGN file: ' + error.message);
                }
            };
            
            reader.readAsText(file);
        }
    }
    
    // Event Listeners
    // Game controls
    document.getElementById('new-game-btn').addEventListener('click', newGame);
    
    document.getElementById('resign-btn').addEventListener('click', function() {
        if (confirm('Are you sure you want to resign?')) {
            const winner = playerColor === 'white' ? 'Black' : 'White';
            alert(`${winner} wins by resignation!`);
            
            // Update stats
            gamesPlayed++;
            gamesLost++;
            
            // Teach AI the result
            if (winner === 'Black') {
                teachAI('ai_win');
            } else {
                teachAI('player_win');
            }
            
            // Clear timer
            if (timeInterval) {
                clearInterval(timeInterval);
            }
            
            newGame();
        }
    });
    
    // Move history controls
    document.getElementById('first-move-btn').addEventListener('click', () => goToMove(0));
    document.getElementById('prev-move-btn').addEventListener('click', goToPreviousMove);
    document.getElementById('play-pause-btn').addEventListener('click', togglePlayMoves);
    document.getElementById('next-move-btn').addEventListener('click', goToNextMove);
    document.getElementById('last-move-btn').addEventListener('click', () => goToMove(gameHistory.length));
    
    // Puzzle controls
    document.getElementById('hint-btn').addEventListener('click', showPuzzleHint);
    document.getElementById('next-puzzle-btn').addEventListener('click', loadNextPuzzle);
    
    // Settings
    document.getElementById('adaptive-difficulty').addEventListener('change', (e) => {
        adaptiveDifficultyEnabled = e.target.checked;
    });
    
    document.getElementById('time-control-select').addEventListener('change', function() {
        if (game && boardInitialized) {
            const timeControlValue = this.value;
            if (timeControlValue !== 'none') {
                startTimeControl(timeControlValue);
            } else {
                if (timeInterval) {
                    clearInterval(timeInterval);
                }
            }
        }
    });
    
    // FIX: Add event listener for color change to flip board
    document.getElementById('color-select').addEventListener('change', function() {
        if (board && boardInitialized) {
            const newColor = this.value === 'random' ? 
                (Math.random() < 0.5 ? 'white' : 'black') : 
                this.value;
            
            board.orientation(newColor);
            playerColor = newColor;
        }
    });
    
    // Chat
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
    
    // Modal controls
    document.querySelector('.close').addEventListener('click', closeAnalysisModal);
    document.getElementById('close-analysis-btn').addEventListener('click', closeAnalysisModal);
    document.getElementById('download-analysis-btn').addEventListener('click', downloadAnalysis);
    
    // NEW: Import game modal controls
    document.getElementById('import-game-btn').addEventListener('click', showImportModal);
    document.querySelector('.close-import').addEventListener('click', closeImportModal);
    document.getElementById('cancel-import-btn').addEventListener('click', closeImportModal);
    
    // Import option handlers
    document.getElementById('import-pgn-option').addEventListener('click', function() {
        handleImportOption(this);
    });
    
    document.getElementById('import-fen-option').addEventListener('click', function() {
        handleImportOption(this);
    });
    
    document.getElementById('import-file-option').addEventListener('click', function() {
        handleImportOption(this);
    });
    
    // Process imported data when textarea changes
    document.getElementById('import-textarea').addEventListener('input', function() {
        if (this.value.trim()) {
            document.getElementById('analyze-imported-btn').disabled = false;
        } else {
            document.getElementById('analyze-imported-btn').disabled = true;
        }
    });
    
    // Analyze imported game
    document.getElementById('analyze-imported-btn').addEventListener('click', function() {
        if (!importedGame) {
            processImportedData();
        } else {
            closeImportModal();
            analyzeImportedGame();
        }
    });
    
    // Tooltip close on click outside
    document.addEventListener('click', function(e) {
        const tooltip = document.getElementById('move-tooltip');
        if (!tooltip.contains(e.target)) {
            tooltip.classList.remove('show');
        }
    });
    
    // Start game button
    document.getElementById('start-game-btn').addEventListener('click', function() {
        console.log('Start game button clicked');
        // Switch to game section
        navLinks.forEach(l => l.classList.remove('active'));
        sections.forEach(s => s.classList.remove('active'));
        
        document.querySelector('[href="#game"]').classList.add('active');
        document.getElementById('game').classList.add('active');
        
        // Initialize board
        setTimeout(initializeChessBoard, 100);
    });
    
    // Hero buttons
    document.getElementById('start-learning-btn').addEventListener('click', function() {
        navLinks.forEach(l => l.classList.remove('active'));
        sections.forEach(s => s.classList.remove('active'));
        
        document.querySelector('[href="#game-settings"]').classList.add('active');
        document.getElementById('game-settings').classList.add('active');
    });
    
    document.getElementById('stats-btn').addEventListener('click', function() {
        navLinks.forEach(l => l.classList.remove('active'));
        sections.forEach(s => s.classList.remove('active'));
        
        document.querySelector('[href="#stats"]').classList.add('active');
        document.getElementById('stats').classList.add('active');
    });
    
    document.getElementById('start-playing-btn').addEventListener('click', function() {
        console.log('Start playing button clicked');
        // Switch to game section
        navLinks.forEach(l => l.classList.remove('active'));
        sections.forEach(s => s.classList.remove('active'));
        
        document.querySelector('[href="#game"]').classList.add('active');
        document.getElementById('game').classList.add('active');
        
        // Initialize board
        setTimeout(initializeChessBoard, 100);
    });
    
    // NEW: Home page puzzles button
    document.getElementById('home-puzzles-btn').addEventListener('click', function() {
        navLinks.forEach(l => l.classList.remove('active'));
        sections.forEach(s => s.classList.remove('active'));
        
        document.querySelector('[href="#puzzles"]').classList.add('active');
        document.getElementById('puzzles').classList.add('active');
        
        // Initialize puzzle board if not already done
        if (!puzzleBoardInitialized) {
            setTimeout(initializePuzzleBoard, 100);
        }
    });
    
    // NEW: Home page import game button
    document.getElementById('import-game-btn').addEventListener('click', function() {
        showImportModal();
    });
    
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
    
    // Load stats from localStorage
    loadStats();
    
    console.log('Chess game script loaded successfully!');
});