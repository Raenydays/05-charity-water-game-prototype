// Get the canvas and drawing tool.
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Get the score, status, purity meter, HUD, overlays, and buttons.
const scoreDisplay = document.getElementById('score');
const statusDisplay = document.getElementById('status');
const restartButton = document.getElementById('restartButton');
const enemiesLeftDisplay = document.getElementById('enemiesLeft');
const startOverlay = document.getElementById('startOverlay');
const victoryOverlay = document.getElementById('victoryOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const startButton = document.getElementById('startButton');
const playAgainButton = document.getElementById('playAgainButton');
const retryButton = document.getElementById('retryButton');
const difficultySlider = document.getElementById('difficultySlider');
const difficultyValue = document.getElementById('difficultyValue');
const confettiLayer = document.getElementById('confettiLayer');
const timerDisplay = document.getElementById('timerDisplay');
const scoreboardList = document.getElementById('scoreboardList');
const playerNameInput = document.getElementById('playerName');
const shootingSound = new Audio('Sounds/shooting_sound.mp3');
const losingSound = new Audio('Sounds/losing_sound.mp3');
const winningSound = new Audio('Sounds/winning_sound.mp3');

// Player ship settings.
const player = {
    width: 40,
    height: 24,
    x: canvas.width / 2 - 20,
    y: canvas.height - 50,
    speed: 6
};

// Bullet settings.
const bullets = [];
const bulletSpeed = 8;
let shootCooldown = 0;
const shootDelay = 1000;

// Enemy settings.
const enemies = [];
const enemyRows = 3;
const enemyCols = 5;
const enemyWidth = 28;
const enemyHeight = 20;
const enemyGap = 12;
let enemyDirection = 1;
let enemySpeed = 1.5;
const baseEnemyPoints = 100;

// Game state.
let score = 0;
let gameOver = false;
let gameWon = false;
let gameStarted = false;
let lastTime = 0;
let elapsedTime = 0;
let selectedDifficulty = 'Medium';
let enemyDescentSpeed = 20;
const scoreboardEntries = [];

// Input flags.
let leftPressed = false;
let rightPressed = false;
let spacePressed = false;

function showOverlay(overlay) {
    overlay.style.display = 'flex';
    requestAnimationFrame(function () {
        overlay.classList.add('visible');
    });
}

function playSound(audioElement) {
    if (!audioElement) {
        return;
    }

    audioElement.pause();
    audioElement.currentTime = 0;

    const playPromise = audioElement.play();

    if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(function () {
            // Ignore autoplay restrictions so the game keeps working normally.
        });
    }
}

function hideOverlay(overlay) {
    overlay.classList.remove('visible');
    setTimeout(function () {
        overlay.style.display = 'none';
    }, 350);
}

function getAliveEnemiesCount() {
    return enemies.filter(function (enemy) {
        return enemy.alive;
    }).length;
}

function updateEnemiesLeft() {
    enemiesLeftDisplay.textContent = `Enemies Left: ${getAliveEnemiesCount()}`;
}

// Create the enemy grid.
function createEnemies() {
    for (let row = 0; row < enemyRows; row += 1) {
        for (let col = 0; col < enemyCols; col += 1) {
            enemies.push({
                x: 40 + col * (enemyWidth + enemyGap),
                y: 60 + row * (enemyHeight + enemyGap),
                width: enemyWidth,
                height: enemyHeight,
                alive: true
            });
        }
    }
}

// Reset the game to the starting state.
function resetGame(startImmediately) {
    bullets.length = 0;
    enemies.length = 0;
    score = 0;
    gameOver = false;
    gameWon = false;
    gameStarted = startImmediately;
    lastTime = 0;
    elapsedTime = 0;
    shootCooldown = 0;
    enemyDirection = 1;
    applyDifficultySelection();
    player.x = canvas.width / 2 - player.width / 2;
    createEnemies();
    updateScore();
    updateEnemiesLeft();
    updateTimerDisplay();
    clearConfetti();
    statusDisplay.textContent = 'Use the arrow keys or A/D to move. Press the space bar to purify.';
    hideOverlay(victoryOverlay);
    hideOverlay(gameOverOverlay);

    if (startImmediately) {
        hideOverlay(startOverlay);
    } else {
        showOverlay(startOverlay);
    }
}

// Update the score text on the page.
function updateScore() {
    scoreDisplay.textContent = `Purified: ${score}`;
}

function updateTimerDisplay() {
    timerDisplay.textContent = `Time: ${elapsedTime.toFixed(1)}s`;
}

function updateScoreboard() {
    const sortedEntries = scoreboardEntries.slice().sort(function (a, b) {
        return a.time - b.time;
    });

    scoreboardList.innerHTML = '';

    sortedEntries.slice(0, 5).forEach(function (entry) {
        const item = document.createElement('li');
        item.textContent = `${entry.name} (${entry.difficulty}) - Score: ${entry.score} - Time: ${entry.time.toFixed(1)}s`;
        scoreboardList.appendChild(item);
    });
}

function saveScoreEntry() {
    const name = playerNameInput.value.trim() || 'Player';
    const time = Number(elapsedTime.toFixed(1));

    scoreboardEntries.push({
        name: name,
        difficulty: selectedDifficulty,
        score: score,
        time: time
    });

    updateScoreboard();
    playerNameInput.value = '';
}

// Draw the player ship as a water filtration unit.
function drawPlayer() {
    ctx.fillStyle = '#e8f7ff';
    ctx.beginPath();
    ctx.moveTo(player.x + player.width / 2, player.y);
    ctx.lineTo(player.x + player.width, player.y + player.height);
    ctx.lineTo(player.x, player.y + player.height);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#2e9df7';
    ctx.fillRect(player.x + player.width / 2 - 8, player.y + 6, 16, 8);
}

// Draw all bullets as small droplets of clean water.
function drawBullets() {
    ctx.fillStyle = '#bdefff';
    bullets.forEach(function (bullet) {
        ctx.beginPath();
        ctx.arc(bullet.x + bullet.width / 2, bullet.y + bullet.height / 2, 4, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Draw all enemies as rounded microbes.
function drawEnemies() {
    enemies.forEach(function (enemy) {
        if (enemy.alive) {
            ctx.fillStyle = '#6f6b4d';
            ctx.beginPath();
            ctx.ellipse(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.width / 2 - 2, enemy.height / 2 - 2, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#8f8b63';
            ctx.beginPath();
            ctx.arc(enemy.x + enemy.width / 2 - 4, enemy.y + enemy.height / 2 - 3, 4, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.arc(enemy.x + enemy.width / 2 + 4, enemy.y + enemy.height / 2 + 2, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

// Draw the game scene every frame.
function drawScene() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Water-themed background.
    const backgroundGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    backgroundGradient.addColorStop(0, '#0a264d');
    backgroundGradient.addColorStop(1, '#1f7a7a');
    ctx.fillStyle = backgroundGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Soft water ripples to keep the scene feeling watery.
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i += 1) {
        ctx.beginPath();
        ctx.arc(60 + i * 70, 120, 20 + i * 10, 0, Math.PI * 2);
        ctx.stroke();
    }

    drawPlayer();
    drawBullets();
    drawEnemies();

    // Show win or lose text if the game has ended.
    if (gameWon) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffc907';
        ctx.font = '36px Arial';
        ctx.fillText('You Win!', 150, 280);
    }

    if (gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#f5402c';
        ctx.font = '36px Arial';
        ctx.fillText('Game Over', 140, 280);
    }
}

// Move the player based on the current input flags.
function updatePlayerMovement() {
    if (leftPressed && !rightPressed) {
        player.x -= player.speed;
    }

    if (rightPressed && !leftPressed) {
        player.x += player.speed;
    }

    // Keep the player inside the canvas.
    if (player.x < 0) {
        player.x = 0;
    }

    if (player.x + player.width > canvas.width) {
        player.x = canvas.width - player.width;
    }
}

// Fire a bullet if the player is pressing space and the cooldown is ready.
function updateShooting(deltaTime) {
    shootCooldown -= deltaTime;

    if (spacePressed && shootCooldown <= 0) {
        bullets.push({
            x: player.x + player.width / 2 - 2,
            y: player.y - 10,
            width: 4,
            height: 12
        });
        playSound(shootingSound);
        shootCooldown = shootDelay;
    }
}

// Move bullets and remove them when they leave the screen.
function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i -= 1) {
        bullets[i].y -= bulletSpeed;

        if (bullets[i].y + bullets[i].height < 0) {
            bullets.splice(i, 1);
        }
    }
}

// Move enemies together and reverse direction when they hit the edge.
function updateEnemies() {
    for (let i = 0; i < enemies.length; i += 1) {
        if (enemies[i].alive) {
            enemies[i].x += enemyDirection * enemySpeed;
        }
    }

    const descentAmount = enemyDescentSpeed;

    const hitEdge = enemies.some(function (enemy) {
        return enemy.alive && (enemy.x <= 0 || enemy.x + enemy.width >= canvas.width);
    });

    if (hitEdge) {
        enemyDirection *= -1;

        for (let i = 0; i < enemies.length; i += 1) {
            if (enemies[i].alive) {
                enemies[i].y += descentAmount;
            }
        }
    }
}

// Check for bullet and enemy collisions.
function checkCollisions() {
    for (let bulletIndex = bullets.length - 1; bulletIndex >= 0; bulletIndex -= 1) {
        const bullet = bullets[bulletIndex];

        for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
            const enemy = enemies[enemyIndex];

            if (!enemy.alive) {
                continue;
            }

            const hit = bullet.x < enemy.x + enemy.width &&
                bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + bullet.height > enemy.y;

            if (hit) {
                bullets.splice(bulletIndex, 1);
                enemies.splice(enemyIndex, 1);

                let difficultyMultiplier = 1;

                if (selectedDifficulty === 'Easy') {
                    difficultyMultiplier = 1;
                } else if (selectedDifficulty === 'Medium') {
                    difficultyMultiplier = 1.2;
                } else if (selectedDifficulty === 'Hard') {
                    difficultyMultiplier = 1.5;
                }

                score += Math.round(baseEnemyPoints * difficultyMultiplier);
                updateScore();
                updateEnemiesLeft();
                break;
            }
        }
    }
}

// Check if the player has lost.
function checkGameOver() {
    if (gameOver || gameWon) {
        return;
    }

    const enemyReachedBottom = enemies.some(function (enemy) {
        return enemy.alive && enemy.y + enemy.height >= player.y - 10;
    });

    if (enemyReachedBottom) {
        gameOver = true;
        gameStarted = false;
        hideOverlay(victoryOverlay);
        showOverlay(gameOverOverlay);
        statusDisplay.textContent = 'Game Over! Press restart to play again.';
        playSound(losingSound);
        return;
    }

    if (enemies.length === 0) {
        gameWon = true;
        gameStarted = false;
        hideOverlay(gameOverOverlay);
        showOverlay(victoryOverlay);
        statusDisplay.textContent = 'You Win! Press restart to play again.';
        score += Math.max(0, Math.round(1000 - elapsedTime * 10));
        updateScore();
        playSound(winningSound);
        launchConfetti();
    }
}

// The game loop runs many times per second.
function gameLoop(timestamp) {
    if (!lastTime) {
        lastTime = timestamp;
    }

    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    if (gameStarted && !gameOver && !gameWon) {
        elapsedTime += deltaTime / 1000;
        updateTimerDisplay();
        updatePlayerMovement();
        updateShooting(deltaTime);
        updateBullets();
        updateEnemies();
        checkCollisions();
        checkGameOver();
    }

    drawScene();
    requestAnimationFrame(gameLoop);
}

// Keydown and keyup events set flags instead of moving right away.
window.addEventListener('keydown', function (event) {
    if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
        leftPressed = true;
        event.preventDefault();
    }

    if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
        rightPressed = true;
        event.preventDefault();
    }

    if (event.code === 'Space') {
        spacePressed = true;
        event.preventDefault();
    }
});

window.addEventListener('keyup', function (event) {
    if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
        leftPressed = false;
    }

    if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
        rightPressed = false;
    }

    if (event.code === 'Space') {
        spacePressed = false;
    }
});

function setDifficultyLabel() {
    const difficultyNames = ['Easy', 'Medium', 'Hard'];
    const selectedValue = Number(difficultySlider.value);
    selectedDifficulty = difficultyNames[selectedValue];

    if (selectedDifficulty === 'Easy') {
        enemySpeed = 1.1;
        enemyDescentSpeed = 14;
    } else if (selectedDifficulty === 'Hard') {
        enemySpeed = 2.2;
        enemyDescentSpeed = 28;
    } else {
        enemySpeed = 1.5;
        enemyDescentSpeed = 20;
    }

    difficultyValue.textContent = selectedDifficulty;
}

function launchConfetti() {
    clearConfetti();

    const colors = ['#FFC845', '#14A97C', '#1C7EBA', '#E4907C', '#BEE6D3'];

    for (let i = 0; i < 36; i += 1) {
        const piece = document.createElement('div');
        piece.className = 'confettiPiece';
        piece.style.left = `${Math.random() * 100}%`;
        piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        piece.style.setProperty('--shift', `${(Math.random() - 0.5) * 220}px`);
        piece.style.animationDelay = `${Math.random() * 0.2}s`;
        piece.style.transform = `rotate(${Math.random() * 360}deg)`;
        confettiLayer.appendChild(piece);
    }
}

function clearConfetti() {
    confettiLayer.innerHTML = '';
}

function applyDifficultySelection() {
    setDifficultyLabel();
}

restartButton.addEventListener('click', function () {
    resetGame(false);
});

startButton.addEventListener('click', function () {
    resetGame(true);
});

playAgainButton.addEventListener('click', function () {
    saveScoreEntry();
    clearConfetti();
    resetGame(true);
});

retryButton.addEventListener('click', function () {
    resetGame(true);
});

difficultySlider.addEventListener('input', setDifficultyLabel);

// Start the game.
setDifficultyLabel();
updateScoreboard();
resetGame(false);
requestAnimationFrame(gameLoop);
