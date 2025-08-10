   
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        function createTone(frequency, duration) {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.01);
            gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration);

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration);
        }

        const sounds = {
            click: () => createTone(440, 0.1),
            flag: () => createTone(660, 0.1),
            win: () => {
                createTone(880, 0.2);
                setTimeout(() => createTone(1046, 0.2), 200);
            },
            lose: () => createTone(220, 0.5)
        };

        
        const difficulties = {
            easy: { rows: 5, cols: 5, mines: 8 },
            intermediate: { rows: 10, cols: 10, mines: 30 },
            hard: { rows: 10, cols: 15, mines: 40 }
        };


        const boardElement = document.getElementById('minesweeper-board');
        const difficultySelect = document.getElementById('difficulty-select');
        const resetButton = document.getElementById('reset-button');
        const themeToggle = document.getElementById('theme-toggle');
        const mineCountElement = document.getElementById('mine-count');
        const timerElement = document.getElementById('timer');
        const gameModal = document.getElementById('game-modal');
        const modalText = document.getElementById('modal-text');
        const modalCloseButton = document.getElementById('modal-close');
        const sunIcon = document.getElementById('sun-icon');
        const moonIcon = document.getElementById('moon-icon');

        let board;
        let gameActive = false;
        let minesLeft;
        let difficulty;
        let timerInterval;
        let timeElapsed = 0;
        let firstClick = true;

        function initGame() {
            gameActive = true;
            firstClick = true;
            timeElapsed = 0;
            clearInterval(timerInterval);
            timerElement.textContent = 0;

            difficulty = difficulties[difficultySelect.value];
            minesLeft = difficulty.mines;
            mineCountElement.textContent = minesLeft;
            
            board = Array.from({ length: difficulty.rows }, () =>
                Array.from({ length: difficulty.cols }, () => ({
                    isMine: false,
                    isRevealed: false,
                    isFlagged: false,
                    adjacentMines: 0
                }))
            );

            createBoardDOM();
            hideModal();
        }

 
        function createBoardDOM() {
            boardElement.innerHTML = '';
            boardElement.style.gridTemplateColumns = `repeat(${difficulty.cols}, 1fr)`;

            for (let r = 0; r < difficulty.rows; r++) {
                for (let c = 0; c < difficulty.cols; c++) {
                    const cell = document.createElement('div');
                    cell.classList.add('cell');
                    cell.dataset.row = r;
                    cell.dataset.col = c;
                    cell.addEventListener('click', () => handleLeftClick(r, c));
                    cell.addEventListener('contextmenu', (e) => handleRightClick(e, r, c));
                    boardElement.appendChild(cell);
                }
            }
        }

        function placeMines(startRow, startCol) {
            let minesToPlace = difficulty.mines;
            const safeCells = new Set();
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    const r = startRow + i;
                    const c = startCol + j;
                    if (r >= 0 && r < difficulty.rows && c >= 0 && c < difficulty.cols) {
                        safeCells.add(`${r}-${c}`);
                    }
                }
            }

            while (minesToPlace > 0) {
                const r = Math.floor(Math.random() * difficulty.rows);
                const c = Math.floor(Math.random() * difficulty.cols);
                const cellKey = `${r}-${c}`;
                
                if (!board[r][c].isMine && !safeCells.has(cellKey)) {
                    board[r][c].isMine = true;
                    minesToPlace--;
                }
            }
            calculateAdjacentMines();
        }


        function calculateAdjacentMines() {
            for (let r = 0; r < difficulty.rows; r++) {
                for (let c = 0; c < difficulty.cols; c++) {
                    if (board[r][c].isMine) continue;
                    
                    let count = 0;
                    for (let i = -1; i <= 1; i++) {
                        for (let j = -1; j <= 1; j++) {
                            if (i === 0 && j === 0) continue;
                            const newR = r + i;
                            const newC = c + j;
                            if (newR >= 0 && newR < difficulty.rows && newC >= 0 && newC < difficulty.cols) {
                                if (board[newR][newC].isMine) {
                                    count++;
                                }
                            }
                        }
                    }
                    board[r][c].adjacentMines = count;
                }
            }
        }

        function handleLeftClick(r, c) {
            if (!gameActive || board[r][c].isRevealed || board[r][c].isFlagged) {
                return;
            }

            if (firstClick) {
                placeMines(r, c);
                firstClick = false;
                startTimer();
            }

            sounds.click();

            if (board[r][c].isMine) {
                gameOver(false, r, c); // Lost
            } else {
                revealCell(r, c);
                checkWin();
            }
        }

        /**
         * Recursively reveals cells.
         * @param {number} r - The row of the cell.
         * @param {number} c - The column of the cell.
         */
        function revealCell(r, c) {
            if (r < 0 || r >= difficulty.rows || c < 0 || c >= difficulty.cols || board[r][c].isRevealed || board[r][c].isFlagged) {
                return;
            }

            board[r][c].isRevealed = true;
            const cellElement = boardElement.querySelector(`[data-row="${r}"][data-col="${c}"]`);
            cellElement.classList.add('revealed');
            
            const cellContent = document.createElement('div');
            cellContent.classList.add('cell-content');

            if (board[r][c].adjacentMines > 0) {
                cellElement.dataset.adjacent = board[r][c].adjacentMines;
                cellContent.textContent = board[r][c].adjacentMines;
                cellElement.appendChild(cellContent);
            } else {
                cellElement.appendChild(cellContent);
                // Recursively reveal neighbors if the cell is empty
                for (let i = -1; i <= 1; i++) {
                    for (let j = -1; j <= 1; j++) {
                        revealCell(r + i, c + j);
                    }
                }
            }
        }

        function handleRightClick(e, r, c) {
            e.preventDefault();
            if (!gameActive || board[r][c].isRevealed) {
                return;
            }

            const cellElement = boardElement.querySelector(`[data-row="${r}"][data-col="${c}"]`);
            
            if (board[r][c].isFlagged) {
                board[r][c].isFlagged = false;
                cellElement.classList.remove('flagged');
                cellElement.innerHTML = '';
                minesLeft++;
            } else if (minesLeft > 0) {
                board[r][c].isFlagged = true;
                cellElement.classList.add('flagged');
                cellElement.innerHTML = `<div class="cell-content">🚩</div>`;
                minesLeft--;
                sounds.flag();
            }
            mineCountElement.textContent = minesLeft;
        }

        /**
         * Checks for a win condition.
         */
        function checkWin() {
            let revealedCount = 0;
            let totalCells = difficulty.rows * difficulty.cols;
            let mineCount = difficulty.mines;
            
            for (let r = 0; r < difficulty.rows; r++) {
                for (let c = 0; c < difficulty.cols; c++) {
                    if (board[r][c].isRevealed) {
                        revealedCount++;
                    }
                }
            }
            
            if (revealedCount === totalCells - mineCount) {
                gameOver(true); // Won
            }
        }

        function gameOver(win, r, c) {
            gameActive = false;
            clearInterval(timerInterval);

            if (!win) {
                sounds.lose();
                const lostCell = boardElement.querySelector(`[data-row="${r}"][data-col="${c}"]`);
                lostCell.classList.add('revealed', 'mine', 'exploded');
                lostCell.innerHTML = `<div class="cell-content">💣</div>`;

                for (let row = 0; row < difficulty.rows; row++) {
                    for (let col = 0; col < difficulty.cols; col++) {
                        if (board[row][col].isMine && !board[row][col].isFlagged) {
                            const cellElement = boardElement.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                            cellElement.classList.add('revealed', 'mine');
                            cellElement.innerHTML = `<div class="cell-content">💣</div>`;
                        } else if (!board[row][col].isMine && board[row][col].isFlagged) {
                             const cellElement = boardElement.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                             cellElement.classList.remove('flagged');
                             cellElement.innerHTML = `<div class="cell-content">❌</div>`;
                             cellElement.style.backgroundColor = 'var(--lose-color)';
                        }
                    }
                }
            } else {
                sounds.win();
                for (let row = 0; row < difficulty.rows; row++) {
                    for (let col = 0; col < difficulty.cols; col++) {
                        if (board[row][col].isMine && !board[row][col].isFlagged) {
                            const cellElement = boardElement.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                            cellElement.classList.add('flagged');
                            cellElement.innerHTML = `<div class="cell-content">🚩</div>`;
                        }
                    }
                }
            }

            const message = win ? 'You Win!' : 'Game Over!';
            const color = win ? 'text-[var(--win-color)]' : 'text-[var(--lose-color)]';
            
            modalText.textContent = message;
            modalText.className = `text-3xl font-bold mb-4 ${color}`;
            showModal();
        }

        function startTimer() {
            timerInterval = setInterval(() => {
                timeElapsed++;
                timerElement.textContent = timeElapsed;
            }, 1000);
        }

        function showModal() {
            gameModal.classList.remove('hidden');
            setTimeout(() => {
                gameModal.querySelector('#modal-content').classList.remove('scale-95', 'opacity-0');
                gameModal.querySelector('#modal-content').classList.add('scale-100', 'opacity-100');
            }, 10);
        }

 
        function hideModal() {
            gameModal.querySelector('#modal-content').classList.remove('scale-100', 'opacity-100');
            gameModal.querySelector('#modal-content').classList.add('scale-95', 'opacity-0');
            setTimeout(() => {
                gameModal.classList.add('hidden');
            }, 300);
        }

        
        function toggleTheme() {
            const currentTheme = document.body.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.body.setAttribute('data-theme', newTheme);

            if (newTheme === 'dark') {
                sunIcon.classList.add('hidden');
                moonIcon.classList.remove('hidden');
            } else {
                sunIcon.classList.remove('hidden');
                moonIcon.classList.add('hidden');
            }
        }
        

        function setupInitialTheme() {
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.body.setAttribute('data-theme', 'dark');
                sunIcon.classList.add('hidden');
                moonIcon.classList.remove('hidden');
            } else {
                document.body.setAttribute('data-theme', 'light');
                sunIcon.classList.remove('hidden');
                moonIcon.classList.add('hidden');
            }
        }


        
        resetButton.addEventListener('click', initGame);
        modalCloseButton.addEventListener('click', initGame);
        difficultySelect.addEventListener('change', initGame);
        themeToggle.addEventListener('click', toggleTheme);

        document.addEventListener('DOMContentLoaded', () => {
            setupInitialTheme();
            initGame();
        });