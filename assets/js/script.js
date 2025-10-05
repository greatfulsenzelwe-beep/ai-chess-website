// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing chess game...');
    
    // API Configuration - Now uses a relative path since the API and frontend are on the same server.
    const API_URL = '/api';
    
    // --- UTILITY FUNCTION ---
    // A helper function to safely get an element by ID
    function safeGetElementById(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Warning: Element with ID '#${id}' was not found.`);
        }
        return element;
    }
    
    // Mobile menu toggle
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }
    
    // Close mobile menu when clicking on a link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            if (hamburger) hamburger.classList.remove('active');
            if (navMenu) navMenu.classList.remove('active');
        });
    });
    
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
    
    // Time control variables (DISABLED for simplified HTML)
    let timeControl = null;
    let playerTime = 0;
    let aiTime = 0;
    let timeInterval = null;
    
    // Stats tracking
    let gamesPlayed = 0;
    let gamesWon = 0;
    let gamesLost = 0;
    let gamesDrawn = 0;
    
    // Import game variables
    let importedGame = null;
    let importedGameAnalysis = null;
    let importType = null; // 'pgn', 'fen', or 'file'
    
    // Enhanced Window resize handler for responsive board
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(resizeBoards, 250);
    });
    
    // Improved resizeBoards function to handle responsive sizing
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
            showNotification('Chess library failed to load. Please refresh the page.');
            return;
        }
        
        // Check if chessboardjs is loaded
        if (typeof Chessboard === 'undefined') {
            console.error('Chessboard.js library not loaded!');
            showNotification('Chessboard library failed to load. Please refresh the page.');
            return;
        }
        
        const colorSelect = safeGetElementById('color-select');
        if (colorSelect) {
            if (colorSelect.value === 'random') {
                playerColor = Math.random() < 0.5 ? 'white' : 'black';
            } else {
                playerColor = colorSelect.value;
            }
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
        
        console.log('Creating chessboard...');
        board = Chessboard(boardEl, {
            position: 'start',
            draggable: true,
            // Set board orientation based on player color
            orientation: playerColor,
            pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png',
            onDragStart: onDragStart,
            onDrop: onDrop,
            onSnapEnd: onSnapEnd,
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
        
        // Initial board sizing
        setTimeout(resizeBoards, 100);
        
        console.log('=== CHESS BOARD INITIALIZATION COMPLETE ===');
    }
    
    // Initialize puzzle board
    function initializePuzzleBoard() {
        console.log('Initializing puzzle board...');
        
        // Check if chess.js is loaded
        if (typeof Chess === 'undefined') {
            console.error('Chess.js library not loaded!');
            showNotification('Chess library failed to load. Please refresh the page.');
            return;
        }
        
        // Check if chessboardjs is loaded
        if (typeof Chessboard === 'undefined') {
            console.error('Chessboard.js library not loaded!');
            showNotification('Chessboard library failed to load. Please refresh the page.');
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
        
        // Initial board sizing
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
            const puzzleStatusEl = document.getElementById('puzzle-status');
            if (puzzleStatusEl) puzzleStatusEl.textContent = 'Correct! Well done!';
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
            const puzzleStatusEl = document.getElementById('puzzle-status');
            if (puzzleStatusEl) puzzleStatusEl.textContent = 'Not quite right. Try again!';
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
        const tooltip = safeGetElementById('move-tooltip');
        const tooltipTitle = safeGetElementById('tooltip-title');
        const tooltipContent = safeGetElementById('tooltip-content');
        
        if (!tooltip || !tooltipTitle || !tooltipContent) return;

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
            if(tooltip) tooltip.classList.remove('show');
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
        const playBtn = safeGetElementById('play-pause-btn');
        if (!playBtn) return;
        
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
    
    // Puzzle functions
    function loadNextPuzzle() {
        // Try to get puzzle from AI brain first
        getPuzzleFromAI()
            .then(puzzle => {
                if (puzzle) {
                    currentPuzzle = puzzle;
                    puzzleGame.load(puzzle.fen);
                    puzzleBoard.position(puzzle.fen);
                    
                    const puzzleStatusEl = document.getElementById('puzzle-status');
                    if (puzzleStatusEl) puzzleStatusEl.textContent = 'Solve this puzzle';
                    
                    const puzzleCategoryEl = document.getElementById('puzzle-category');
                    if (puzzleCategoryEl) puzzleCategoryEl.textContent = puzzle.category || 'Tactics';
                    
                    const puzzleDifficultyEl = document.getElementById('puzzle-difficulty');
                    if (puzzleDifficultyEl) puzzleDifficultyEl.textContent = puzzle.difficulty || 'Medium';
                    
                    const puzzleHintEl = document.getElementById('puzzle-hint');
                    if (puzzleHintEl) puzzleHintEl.style.display = 'none';
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
    
    // Function to get puzzles from AI brain
    async function getPuzzleFromAI() {
        try {
            const difficultySelect = safeGetElementById('difficulty-select');
            const difficulty = difficultySelect ? difficultySelect.value : 'intermediate';

            const response = await fetch(`${API_URL}/puzzle`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    difficulty: difficulty,
                    category: 'mixed',
                    fromHistory: true // Try to get puzzles from game history
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch puzzle from AI');
            }
            
            const data = await response.json();
            return data.puzzle || null;
        } catch (error) {
            console.error('Error getting puzzle from AI:', error);
            return null;
        }
    }
    
    // Function to load predefined puzzles as fallback
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
        
        const puzzleStatusEl = document.getElementById('puzzle-status');
        if (puzzleStatusEl) puzzleStatusEl.textContent = 'Solve this puzzle';
        
        const puzzleCategoryEl = document.getElementById('puzzle-category');
        if (puzzleCategoryEl) puzzleCategoryEl.textContent = currentPuzzle.category;
        
        const puzzleDifficultyEl = document.getElementById('puzzle-difficulty');
        if (puzzleDifficultyEl) puzzleDifficultyEl.textContent = currentPuzzle.difficulty;
        
        const puzzleHintEl = document.getElementById('puzzle-hint');
        if (puzzleHintEl) puzzleHintEl.style.display = 'none';
    }
    
    function showPuzzleHint() {
        if (!currentPuzzle) return;
        
        const puzzleHintEl = document.getElementById('puzzle-hint');
        const puzzleHintTextEl = document.getElementById('puzzle-hint-text');
        
        if (puzzleHintEl && puzzleHintTextEl) {
            puzzleHintEl.style.display = 'flex';
            puzzleHintTextEl.textContent = currentPuzzle.hint;
        }
    }
    
    function updatePuzzleStats() {
        const puzzlesSolvedEl = document.getElementById('puzzles-solved');
        if (puzzlesSolvedEl) puzzlesSolvedEl.textContent = puzzlesSolved;
        
        const currentStreakEl = document.getElementById('puzzle-streak');
        if (currentStreakEl) currentStreakEl.textContent = currentStreak;
        
        const bestStreakEl = document.getElementById('best-streak');
        if (bestStreakEl) bestStreakEl.textContent = bestStreak;
        
        // Save to localStorage
        localStorage.setItem('puzzlesSolved', puzzlesSolved);
        localStorage.setItem('bestStreak', bestStreak);
    }
    
    // Game Analysis - Connected to AI
    async function analyzeGame() {
        if (!game) return;
        
        // Get current ELO ratings
        const playerElo = parseInt(localStorage.getItem('playerElo') || '1200');
        const difficultySelect = safeGetElementById('difficulty-select');
        const difficulty = difficultySelect ? difficultySelect.value : 'intermediate';
        const aiElo = parseInt(difficulty === 'beginner' ? '800' : difficulty === 'intermediate' ? '1200' : difficulty === 'advanced' ? '1600' : '2000');
        
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
                        difficulty: difficulty
                    }
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to analyze game');
            }
            
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
    
    // Function to analyze imported games
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
            
            if (!response.ok) {
                throw new Error('Failed to analyze imported game');
            }
            
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
            showNotification('Error analyzing imported game. Please try again.');
        }
    }
    
    // Function to show analysis modal for imported games
    function showImportedAnalysisModal() {
        const modalHeader = document.querySelector('#game-analysis-modal .modal-header h2');
        if (modalHeader) modalHeader.innerHTML = '<i class="fas fa-file-import"></i> Imported Game Analysis';
        
        // Update modal content with imported game analysis
        const gameResultEl = safeGetElementById('game-result');
        if (gameResultEl) gameResultEl.textContent = importedGameAnalysis.result;
        
        const playerAccuracyEl = safeGetElementById('player-accuracy');
        if (playerAccuracyEl) playerAccuracyEl.textContent = importedGameAnalysis.playerAccuracy + '%';
        
        const playerEloEl = safeGetElementById('player-elo');
        if (playerEloEl) playerEloEl.textContent = 'N/A (Imported Game)';
        
        const aiEloEl = safeGetElementById('ai-elo');
        if (aiEloEl) aiEloEl.textContent = 'N/A (Imported Game)';
        
        const brilliantCountEl = safeGetElementById('brilliant-count');
        if (brilliantCountEl) brilliantCountEl.textContent = importedGameAnalysis.moveClassifications.brilliant;

        const bestCountEl = safeGetElementById('best-count');
        if (bestCountEl) bestCountEl.textContent = importedGameAnalysis.moveClassifications.best;

        const goodCountEl = safeGetElementById('good-count');
        if (goodCountEl) goodCountEl.textContent = importedGameAnalysis.moveClassifications.good;

        const mistakeCountEl = safeGetElementById('mistake-count');
        if (mistakeCountEl) mistakeCountEl.textContent = importedGameAnalysis.moveClassifications.mistake;

        const blunderCountEl = safeGetElementById('blunder-count');
        if (blunderCountEl) blunderCountEl.textContent = importedGameAnalysis.moveClassifications.blunder;
        
        // Show the modal
        const modalEl = document.getElementById('game-analysis-modal');
        if (modalEl) modalEl.style.display = 'block';
    }
    
    function showAnalysisModal() {
        // Reset modal title in case it was changed for imported game
        const modalHeader = document.querySelector('#game-analysis-modal .modal-header h2');
        if (modalHeader) modalHeader.innerHTML = '<i class="fas fa-chart-line"></i> Game Analysis';
        
        const gameResultEl = safeGetElementById('game-result');
        if (gameResultEl) gameResultEl.textContent = gameAnalysis.result;
        
        const playerAccuracyEl = safeGetElementById('player-accuracy');
        if (playerAccuracyEl) playerAccuracyEl.textContent = gameAnalysis.playerAccuracy + '%';
        
        const playerEloEl = safeGetElementById('player-elo');
        if (playerEloEl) playerEloEl.textContent = gameAnalysis.playerElo + ' → ' + gameAnalysis.newPlayerElo;
        
        const aiEloEl = safeGetElementById('ai-elo');
        if (aiEloEl) aiEloEl.textContent = gameAnalysis.aiElo;
        
        const brilliantCountEl = safeGetElementById('brilliant-count');
        if (brilliantCountEl) brilliantCountEl.textContent = gameAnalysis.moveClassifications.brilliant;

        const bestCountEl = safeGetElementById('best-count');
        if (bestCountEl) bestCountEl.textContent = gameAnalysis.moveClassifications.best;

        const goodCountEl = safeGetElementById('good-count');
        if (goodCountEl) goodCountEl.textContent = gameAnalysis.moveClassifications.good;

        const mistakeCountEl = safeGetElementById('mistake-count');
        if (mistakeCountEl) mistakeCountEl.textContent = gameAnalysis.moveClassifications.mistake;

        const blunderCountEl = safeGetElementById('blunder-count');
        if (blunderCountEl) blunderCountEl.textContent = gameAnalysis.moveClassifications.blunder;
        
        // Add click listeners to move classification stats
        document.querySelectorAll('.move-stat').forEach(statEl => {
            statEl.addEventListener('click', function() {
                const type = this.dataset.type;
                showMovesByClassification(type);
            });
        });
        
        // Draw accuracy chart
        drawAccuracyChart();
        
        const modalEl = document.getElementById('game-analysis-modal');
        if (modalEl) modalEl.style.display = 'block';
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
        const modalEl = document.getElementById('game-analysis-modal');
        if (modalEl) modalEl.style.display = 'none';
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
        const canvas = safeGetElementById('accuracy-chart');
        if (!canvas) return;
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
        
        const difficultySelect = safeGetElementById('difficulty-select');
        if (!difficultySelect) return;
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
            const gamesPlayedEl = document.getElementById('games-played');
            if (gamesPlayedEl) gamesPlayedEl.textContent = gamesPlayed;
        }
        if (savedGamesWon) gamesWon = parseInt(savedGamesWon);
        if (savedGamesLost) gamesLost = parseInt(savedGamesLost);
        if (savedGamesDrawn) gamesDrawn = parseInt(savedGamesDrawn);
        
        // Calculate and display win rate
        if (gamesPlayed > 0) {
            const winRate = Math.round((gamesWon / gamesPlayed) * 100);
            const winRateEl = document.getElementById('win-rate');
            if (winRateEl) winRateEl.textContent = winRate + '%';
        }
        
        const ratingEl = document.getElementById('rating');
        if (savedRating && ratingEl) ratingEl.textContent = savedRating;
        
        const learningScoreEl = document.getElementById('learning-score');
        if (savedLearningScore && learningScoreEl) learningScoreEl.textContent = savedLearningScore;
    }
    
    function updateStats() {
        // Update games played
        const gamesPlayedEl = document.getElementById('games-played');
        if (gamesPlayedEl) {
            gamesPlayedEl.textContent = gamesPlayed;
            localStorage.setItem('gamesPlayed', gamesPlayed);
        }
        
        // Update win rate
        if (gamesPlayed > 0) {
            const winRate = Math.round((gamesWon / gamesPlayed) * 100);
            const winRateEl = document.getElementById('win-rate');
            if (winRateEl) {
                winRateEl.textContent = winRate + '%';
                localStorage.setItem('gamesWon', gamesWon);
                localStorage.setItem('gamesLost', gamesLost);
                localStorage.setItem('gamesDrawn', gamesDrawn);
            }
        }
        
        // Update learning score
        const learningScoreEl = document.getElementById('learning-score');
        if (learningScoreEl && gameAnalysis) {
            let learningScore = parseInt(learningScoreEl.textContent);
            learningScore += Math.floor(gameAnalysis.playerAccuracy / 10);
            learningScoreEl.textContent = learningScore;
            localStorage.setItem('learningScore', learningScore);
        }
    }
    
    // AI Move Function - Now uses your AI backend!
    async function makeAIMove() {
        if (game.game_over()) return;
        
        console.log('Getting AI move from backend...');
        
        try {
            const personalitySelect = safeGetElementById('personality-select');
            const difficultySelect = safeGetElementById('difficulty-select');
            
            const response = await fetch(`${API_URL}/game/move`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fen: game.fen(),
                    personality: personalitySelect ? personalitySelect.value : 'balanced',
                    difficulty: difficultySelect ? difficultySelect.value : 'intermediate'
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to get AI move');
            }
            
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
                    // Fallback to random move
                    makeRandomMove();
                }
            } else {
                console.error('AI did not return a move');
                // Fallback to random move
                makeRandomMove();
            }
        } catch (error) {
            console.error('Error getting AI move:', error);
            // Show notification to user
            showNotification('AI is unavailable. Using random moves instead.');
            // Fallback to random move
            makeRandomMove();
        }
    }
    
    // Add this fallback function
    function makeRandomMove() {
        const legalMoves = game.moves();
        if (legalMoves.length > 0) {
            const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
            game.move(randomMove);
            gameHistory.push(randomMove);
            moveHistoryIndex = gameHistory.length;
            updateBoard();
        }
    }
    
    // Teach AI from completed game
    async function teachAI(result) {
        console.log('Teaching AI - Game result:', result);
        
        try {
            const difficultySelect = safeGetElementById('difficulty-select');
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
                        difficulty: difficultySelect ? difficultySelect.value : 'intermediate'
                    }
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to teach AI');
            }
            
            const data = await response.json();
            console.log('AI learned from game:', data);
        } catch (error) {
            console.error('Error teaching AI:', error);
            // Don't show notification for this error as it's not critical to user experience
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
            const colorSelect = safeGetElementById('color-select');
            if (colorSelect) {
                if (colorSelect.value === 'random') {
                    playerColor = Math.random() < 0.5 ? 'white' : 'black';
                } else {
                    playerColor = colorSelect.value;
                }
            }
            
            // Update board orientation when starting a new game
            if (board && playerColor === 'black') {
                board.orientation('black');
            } else if (board) {
                board.orientation('white');
            }
            
            // If player is black, make AI move first
            if (playerColor === 'black') {
                setTimeout(makeAIMove, 500);
            }
        } else {
            initializeChessBoard();
        }
    }
    
    // Chat functionality - Connected to AI
    const chatInput = safeGetElementById('chat-input');
    const sendChatBtn = safeGetElementById('send-chat-btn');
    const chatMessages = safeGetElementById('chat-messages');
    
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
            
            if (!response.ok) {
                throw new Error('Failed to get AI response');
            }
            
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
    
    // Import Game Functions
    function showImportModal() {
        const modalEl = document.getElementById('import-modal');
        if (modalEl) modalEl.style.display = 'block';
    }
    
    function closeImportModal() {
        const modalEl = document.getElementById('import-modal');
        if (modalEl) modalEl.style.display = 'none';
        // Reset import form
        const textareaEl = document.getElementById('import-textarea');
        if (textareaEl) {
            textareaEl.value = '';
            textareaEl.style.display = 'none';
        }
        const analyzeBtn = document.getElementById('analyze-imported-btn');
        if (analyzeBtn) analyzeBtn.disabled = true;
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
        
        if (option.id === 'import-pgn-option') {
            importType = 'pgn';
            if (textarea) {
                textarea.placeholder = 'Paste your PGN (Portable Game Notation) here...';
                textarea.style.display = 'block';
            }
        } else if (option.id === 'import-fen-option') {
            importType = 'fen';
            if (textarea) {
                textarea.placeholder = 'Paste your FEN (Forsyth-Edwards Notation) here...';
                textarea.style.display = 'block';
            }
        } else if (option.id === 'import-file-option') {
            importType = 'file';
            if (textarea) textarea.style.display = 'none';
            showNotification('File import is not available in this version. Please paste your PGN/FEN text.');
        }
    }
    
    function processImportedData() {
        const textarea = document.getElementById('import-textarea');
        
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
                const analyzeBtn = document.getElementById('analyze-imported-btn');
                if (analyzeBtn) analyzeBtn.disabled = false;
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
                const analyzeBtn = document.getElementById('analyze-imported-btn');
                if (analyzeBtn) analyzeBtn.disabled = false;
                showNotification('FEN loaded successfully. Click "Analyze Game" to continue.');
            } catch (error) {
                alert('Error loading FEN: ' + error.message);
            }
        }
    }
    
    // Event Listeners
    // Game controls
    const newGameBtn = safeGetElementById('new-game-btn');
    if (newGameBtn) newGameBtn.addEventListener('click', newGame);
    
    const resignBtn = safeGetElementById('resign-btn');
    if (resignBtn) resignBtn.addEventListener('click', function() {
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
    const firstMoveBtn = safeGetElementById('first-move-btn');
    if (firstMoveBtn) firstMoveBtn.addEventListener('click', () => goToMove(0));
    
    const prevMoveBtn = safeGetElementById('prev-move-btn');
    if (prevMoveBtn) prevMoveBtn.addEventListener('click', goToPreviousMove);
    
    const playPauseBtn = safeGetElementById('play-pause-btn');
    if (playPauseBtn) playPauseBtn.addEventListener('click', togglePlayMoves);
    
    const nextMoveBtn = safeGetElementById('next-move-btn');
    if (nextMoveBtn) nextMoveBtn.addEventListener('click', goToNextMove);
    
    const lastMoveBtn = safeGetElementById('last-move-btn');
    if (lastMoveBtn) lastMoveBtn.addEventListener('click', () => goToMove(gameHistory.length));
    
    // Puzzle controls
    const hintBtn = safeGetElementById('hint-btn');
    if (hintBtn) hintBtn.addEventListener('click', showPuzzleHint);
    
    const nextPuzzleBtn = safeGetElementById('next-puzzle-btn');
    if (nextPuzzleBtn) nextPuzzleBtn.addEventListener('click', loadNextPuzzle);
    
    // Settings
    const adaptiveDifficultyCheckbox = safeGetElementById('adaptive-difficulty');
    if (adaptiveDifficultyCheckbox) {
        adaptiveDifficultyCheckbox.addEventListener('change', (e) => {
            adaptiveDifficultyEnabled = e.target.checked;
        });
    }
    
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
    const closeBtn = document.querySelector('.close');
    if (closeBtn) closeBtn.addEventListener('click', closeAnalysisModal);
    
    const closeAnalysisBtn = safeGetElementById('close-analysis-btn');
    if (closeAnalysisBtn) closeAnalysisBtn.addEventListener('click', closeAnalysisModal);
    
    const downloadAnalysisBtn = safeGetElementById('download-analysis-btn');
    if (downloadAnalysisBtn) downloadAnalysisBtn.addEventListener('click', downloadAnalysis);
    
    // Import game modal controls
    const importGameBtn = safeGetElementById('import-game-btn');
    if (importGameBtn) importGameBtn.addEventListener('click', showImportModal);
    
    const closeImportBtn = document.querySelector('.close-import');
    if (closeImportBtn) closeImportBtn.addEventListener('click', closeImportModal);
    
    const cancelImportBtn = safeGetElementById('cancel-import-btn');
    if (cancelImportBtn) cancelImportBtn.addEventListener('click', closeImportModal);
    
    // Import option handlers
    const importPgnOptionBtn = safeGetElementById('import-pgn-option');
    if (importPgnOptionBtn) importPgnOptionBtn.addEventListener('click', function() {
        handleImportOption(this);
    });
    
    const importFenOptionBtn = safeGetElementById('import-fen-option');
    if (importFenOptionBtn) importFenOptionBtn.addEventListener('click', function() {
        handleImportOption(this);
    });
    
    const importFileOptionBtn = safeGetElementById('import-file-option');
    if (importFileOptionBtn) importFileOptionBtn.addEventListener('click', function() {
        handleImportOption(this);
    });
    
    // Process imported data when textarea changes
    const importTextarea = document.getElementById('import-textarea');
    if (importTextarea) {
        importTextarea.addEventListener('input', function() {
            const analyzeBtn = document.getElementById('analyze-imported-btn');
            if (this.value.trim()) {
                if (analyzeBtn) analyzeBtn.disabled = false;
            } else {
                if (analyzeBtn) analyzeBtn.disabled = true;
            }
        });
    }
    
    // Analyze imported game
    const analyzeImportedBtn = safeGetElementById('analyze-imported-btn');
    if (analyzeImportedBtn) {
        analyzeImportedBtn.addEventListener('click', function() {
            if (!importedGame) {
                processImportedData();
            } else {
                closeImportModal();
                analyzeImportedGame();
            }
        });
    }
    
    // Tooltip close on click outside
    document.addEventListener('click', function(e) {
        const tooltip = document.getElementById('move-tooltip');
        if (tooltip && !tooltip.contains(e.target)) {
            tooltip.classList.remove('show');
        }
    });
    
    // Start game button
    const startGameBtn = safeGetElementById('start-game-btn');
    if (startGameBtn) {
        startGameBtn.addEventListener('click', function() {
            console.log('Start game button clicked');
            // Switch to game section
            navLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            
            const gameLink = document.querySelector('[href="#game"]');
            if (gameLink) gameLink.classList.add('active');
            
            const gameSection = document.getElementById('game');
            if (gameSection) gameSection.classList.add('active');
            
            // Initialize board
            setTimeout(initializeChessBoard, 100);
        });
    }
    
    // Hero buttons
    const startLearningBtn = safeGetElementById('start-learning-btn');
    if (startLearningBtn) {
        startLearningBtn.addEventListener('click', function() {
            navLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            
            const settingsLink = document.querySelector('[href="#game-settings"]');
            if (settingsLink) settingsLink.classList.add('active');
            
            const settingsSection = document.getElementById('game-settings');
            if (settingsSection) settingsSection.classList.add('active');
        });
    }
    
    const statsBtn = safeGetElementById('stats-btn');
    if (statsBtn) {
        statsBtn.addEventListener('click', function() {
            navLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            
            const statsLink = document.querySelector('[href="#stats"]');
            if (statsLink) statsLink.classList.add('active');
            
            const statsSection = document.getElementById('stats');
            if (statsSection) statsSection.classList.add('active');
        });
    }
    
    const startPlayingBtn = safeGetElementById('start-playing-btn');
    if (startPlayingBtn) {
        startPlayingBtn.addEventListener('click', function() {
            console.log('Start playing button clicked');
            // Switch to game section
            navLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            
            const gameLink = document.querySelector('[href="#game"]');
            if (gameLink) gameLink.classList.add('active');
            
            const gameSection = document.getElementById('game');
            if (gameSection) gameSection.classList.add('active');
            
            // Initialize board
            setTimeout(initializeChessBoard, 100);
        });
    }
    
    // Home page puzzles button
    const homePuzzlesBtn = safeGetElementById('home-puzzles-btn');
    if (homePuzzlesBtn) {
        homePuzzlesBtn.addEventListener('click', function() {
            navLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            
            const puzzlesLink = document.querySelector('[href="#puzzles"]');
            if (puzzlesLink) puzzlesLink.classList.add('active');
            
            const puzzlesSection = document.getElementById('puzzles');
            if (puzzlesSection) puzzlesSection.classList.add('active');
            
            // Initialize puzzle board if not already done
            if (!puzzleBoardInitialized) {
                setTimeout(initializePuzzleBoard, 100);
            }
        });
    }
    
    // Home page import game button
    if (importGameBtn) importGameBtn.addEventListener('click', showImportModal);
    
    // Load stats from localStorage
    loadStats();
    
    console.log('Chess game script loaded successfully!');
});