document.addEventListener('DOMContentLoaded', function () {
  // DOM Elements
  const startScreen = document.getElementById('startScreen');
  const gameScreen = document.getElementById('gameScreen');
  const camera = document.getElementById('camera');
  const gameWorld = document.getElementById('gameWorld');
  const arena = document.getElementById('arena');
  const playBtn = document.getElementById('playBtn');
  const playerNameInput = document.getElementById('playerName');

  // Game Constants
  const PLAYER_SIZE = 80;
  const PLAYER_RADIUS = PLAYER_SIZE / 2;
  const TARGET_FPS = 60;
  const FRAME_TIME = 1000 / TARGET_FPS;
  const GRID_COLS = 3;
  const GRID_ROWS = 3;
  const SUB_GRID_SIZE = 5;
  const WORLD_SIZE = Math.max(window.innerWidth, window.innerHeight) * 1.5;
  const MINIMAP_SIZE = 150;

  // Game State
  let state = {
    inGame: false,
    gamePaused: false,
    upgradeMenuOpen: false,
    mouseDown: false,
    lastTime: 0,
    lastSpawnTime: 0,
    lastShotTime: 0,
    keys: {},
    mouseScreenX: window.innerWidth / 2,
    mouseScreenY: window.innerHeight / 2,
    mouseWorldX: WORLD_SIZE / 2,
    mouseWorldY: WORLD_SIZE / 2,
    cameraX: 0,
    cameraY: 0,
    playerWorldX: 0,
    playerWorldY: 0,
    playerHealth: 5,
    maxPlayerHealth: 5,
    points: 0,
    triangleSpawnCounter: 0,
    pentagonSpawnCounter: 0,
    moveSpeed: 5,
    shotCooldown: 250,
    playerDamage: 1,
    bulletSpeed: 8,
    speedLevel: 0,
    healthLevel: 0,
    damageLevel: 0,
    reloadLevel: 0,
    bulletSpeedLevel: 0
  };

  // Game Objects
  const objects = {
    playerContainer: null,
    barrel: null,
    playerHealthBar: null,
    pointsValue: null,
    minimapCanvas: null,
    minimapCtx: null,
    balls: [],
    enemies: []
  };

  // Core Game Functions
  function initGame() {
    createArena();
    createPlayer();
    initUI();
    createMinimap();
    createUpgradeMenu();
    state.inGame = true;
    gameLoop();
  }

  function createArena() {
    arena.innerHTML = '';
    gameWorld.style.width = WORLD_SIZE + 'px';
    gameWorld.style.height = WORLD_SIZE + 'px';
    const cellSize = WORLD_SIZE / 3;

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const gridCell = createGridCell(cellSize, row, col);
        arena.appendChild(gridCell);
      }
    }
  }

  function createGridCell(size, row, col) {
    const gridCell = document.createElement('div');
    gridCell.className = 'gridCell';
    gridCell.style.cssText = `width:${size}px;height:${size}px;position:absolute;left:${col * size}px;top:${row * size}px`;

    for (let i = 0; i < SUB_GRID_SIZE; i++) {
      for (let j = 0; j < SUB_GRID_SIZE; j++) {
        const subGrid = document.createElement('div');
        subGrid.className = 'subGrid';
        subGrid.style.cssText = `grid-column:${j + 1};grid-row:${i + 1}`;
        gridCell.appendChild(subGrid);
      }
    }
    return gridCell;
  }

  function createPlayer() {
    objects.playerContainer = document.createElement('div');
    objects.playerContainer.className = 'playerContainer';

    const player = document.createElement('div');
    player.className = 'player';

    const nameDisplay = document.createElement('div');
    nameDisplay.className = 'playerName';
    nameDisplay.textContent = playerNameInput.value || 'Player';

    objects.barrel = document.createElement('div');
    objects.barrel.className = 'barrel';

    objects.playerContainer.appendChild(objects.barrel);
    objects.playerContainer.appendChild(player);
    objects.playerContainer.appendChild(nameDisplay);
    gameWorld.appendChild(objects.playerContainer);

    initPlayerPosition();
  }

  function initPlayerPosition() {
    state.playerWorldX = WORLD_SIZE / 2 - PLAYER_SIZE / 2;
    state.playerWorldY = WORLD_SIZE / 2 - PLAYER_SIZE / 2;
    updatePlayerPosition();
    updateCamera();
  }

  function initUI() {
    objects.playerHealthBar = document.getElementById('playerHealthBar');
    objects.pointsValue = document.getElementById('pointsValue');
    updatePlayerHealth();
    updatePoints();
  }

  // Update Functions
  function updatePlayerPosition() {
    if (!objects.playerContainer) return;
    objects.playerContainer.style.left = state.playerWorldX + 'px';
    objects.playerContainer.style.top = state.playerWorldY + 'px';
  }

  function updatePlayerHealth() {
    if (!objects.playerHealthBar) return;
    const healthPercent = (state.playerHealth / state.maxPlayerHealth) * 100;
    objects.playerHealthBar.style.width = healthPercent + '%';
    
    if (healthPercent > 60) objects.playerHealthBar.className = 'progress-bar bg-success';
    else if (healthPercent > 30) objects.playerHealthBar.className = 'progress-bar bg-warning';
    else objects.playerHealthBar.className = 'progress-bar bg-danger';
  }

  function updatePoints() {
    if (!objects.pointsValue) return;
    objects.pointsValue.textContent = state.points;
    const upgradePointsDisplay = document.getElementById('upgradePointsDisplay');
    if (upgradePointsDisplay) upgradePointsDisplay.textContent = 'Points: ' + state.points;
    refreshUpgradeButtons();
  }

  function updateMousePos() {
    state.mouseWorldX = state.mouseScreenX + state.cameraX;
    state.mouseWorldY = state.mouseScreenY + state.cameraY;
  }

  function getAim() {
    updateMousePos();
    const playerCenterX = state.playerWorldX + PLAYER_RADIUS;
    const playerCenterY = state.playerWorldY + PLAYER_RADIUS;
    const dx = state.mouseWorldX - playerCenterX;
    const dy = state.mouseWorldY - playerCenterY;
    return Math.atan2(dy, dx);
  }

  function updateAim() {
    if (!objects.barrel) return;
    objects.barrel.style.transform = `rotate(${getAim()}rad)`;
  }

  function updateCamera() {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const idealCameraX = state.playerWorldX - screenWidth / 2 + PLAYER_RADIUS;
    const idealCameraY = state.playerWorldY - screenHeight / 2 + PLAYER_RADIUS;

    state.cameraX = Math.max(0, Math.min(idealCameraX, WORLD_SIZE - screenWidth));
    state.cameraY = Math.max(0, Math.min(idealCameraY, WORLD_SIZE - screenHeight));

    gameWorld.style.transform = `translate(${-state.cameraX}px, ${-state.cameraY}px)`;
  }

  function isPositionValid(x, y) {
    return x >= 0 && x <= WORLD_SIZE - PLAYER_SIZE && y >= 0 && y <= WORLD_SIZE - PLAYER_SIZE;
  }

  function movePlayer(dx, dy) {
    const newX = state.playerWorldX + dx;
    const newY = state.playerWorldY + dy;
    if (isPositionValid(newX, newY)) {
      state.playerWorldX = newX;
      state.playerWorldY = newY;
      updatePlayerPosition();
      updateCamera();
    }
  }

  // Combat Functions
  function shoot() {
    const currentTime = Date.now();
    if (currentTime - state.lastShotTime < state.shotCooldown) return;

    state.lastShotTime = currentTime;
    const angle = getAim();
    const ballSize = PLAYER_RADIUS;

    const ball = document.createElement('div');
    ball.className = 'ball';
    ball.style.cssText = `width:${ballSize}px;height:${ballSize}px;background-color:#3498db;border:2px solid black`;

    const barrelLength = 50;
    const barrelEndX = state.playerWorldX + PLAYER_RADIUS + Math.cos(angle) * (PLAYER_RADIUS + barrelLength);
    const barrelEndY = state.playerWorldY + PLAYER_RADIUS + Math.sin(angle) * (PLAYER_RADIUS + barrelLength);

    const ballStartX = barrelEndX - ballSize / 2;
    const ballStartY = barrelEndY - ballSize / 2;

    ball.style.left = ballStartX + 'px';
    ball.style.top = ballStartY + 'px';
    gameWorld.appendChild(ball);

    objects.balls.push({
      element: ball,
      x: ballStartX,
      y: ballStartY,
      vx: Math.cos(angle) * state.bulletSpeed,
      vy: Math.sin(angle) * state.bulletSpeed,
      size: ballSize,
      damage: state.playerDamage
    });
  }

  function updateBalls(delta) {
    for (let i = objects.balls.length - 1; i >= 0; i--) {
      const ball = objects.balls[i];
      ball.x += ball.vx * delta;
      ball.y += ball.vy * delta;
      ball.element.style.left = ball.x + 'px';
      ball.element.style.top = ball.y + 'px';

      if (ball.x < 0 || ball.x > WORLD_SIZE || ball.y < 0 || ball.y > WORLD_SIZE) {
        ball.element.remove();
        objects.balls.splice(i, 1);
      }
    }
  }

  // Enemy Functions
  function isPositionOutsideView(x, y, size) {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const left = state.cameraX;
    const right = state.cameraX + screenWidth;
    const top = state.cameraY;
    const bottom = state.cameraY + screenHeight;
    const enemyRight = x + size;
    const enemyBottom = y + size;

    return enemyRight < left || x > right || enemyBottom < top || y > bottom;
  }

  function createEnemy(type, config) {
    const enemySize = 60;
    let spawnX, spawnY, attempts = 0;
    const maxAttempts = 20;

    do {
      spawnX = Math.random() * (WORLD_SIZE - enemySize);
      spawnY = Math.random() * (WORLD_SIZE - enemySize);
      attempts++;
    } while (!isPositionOutsideView(spawnX, spawnY, enemySize) && attempts < maxAttempts);

    if (attempts >= maxAttempts) return;

    const enemy = document.createElement('div');
    enemy.className = `enemy ${type}`;
    enemy.style.cssText = `width:${enemySize}px;height:${enemySize}px;background-color:${config.color};border:2px solid black;position:absolute;left:${spawnX}px;top:${spawnY}px`;
    gameWorld.appendChild(enemy);

    objects.enemies.push({
      element: enemy,
      x: spawnX,
      y: spawnY,
      size: enemySize,
      health: config.health,
      maxHealth: config.health,
      speed: config.speed,
      type: type,
      points: config.points,
      damage: config.damage
    });
  }

  function createSquareEnemy() {
    createEnemy('square', { color: 'yellow', health: 2, speed: 4, points: 1, damage: 1 });
  }

  function createRedSquareEnemy() {
    createEnemy('redSquare', { color: 'red', health: 1, speed: 8, points: 2, damage: 1 });
  }

  function createPurpleSquareEnemy() {
    createEnemy('purpleSquare', { color: 'purple', health: 6, speed: 2, points: 3, damage: 2 });
  }

  function updateEnemies(delta) {
    const playerCenterX = state.playerWorldX + PLAYER_RADIUS;
    const playerCenterY = state.playerWorldY + PLAYER_RADIUS;

    objects.enemies.forEach(enemy => {
      const enemyCenterX = enemy.x + enemy.size / 2;
      const enemyCenterY = enemy.y + enemy.size / 2;
      const dx = playerCenterX - enemyCenterX;
      const dy = playerCenterY - enemyCenterY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 0) {
        const vx = (dx / distance) * enemy.speed * delta;
        const vy = (dy / distance) * enemy.speed * delta;
        enemy.x += vx;
        enemy.y += vy;
        enemy.element.style.left = enemy.x + 'px';
        enemy.element.style.top = enemy.y + 'px';
        enemy.element.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
      }
    });
  }

  function enemyDeathAnimation(enemy) {
    enemy.element.style.transition = 'all 0.3s ease-out';
    enemy.element.style.transform += ' scale(0)';
    enemy.element.style.opacity = '0';
    setTimeout(() => enemy.element.parentNode && enemy.element.remove(), 300);
  }

  function checkCollisions() {
    const playerCenterX = state.playerWorldX + PLAYER_RADIUS;
    const playerCenterY = state.playerWorldY + PLAYER_RADIUS;

    // Ball-Enemy collisions
    for (let i = objects.balls.length - 1; i >= 0; i--) {
      const ball = objects.balls[i];
      const ballCenterX = ball.x + ball.size / 2;
      const ballCenterY = ball.y + ball.size / 2;

      for (let j = objects.enemies.length - 1; j >= 0; j--) {
        const enemy = objects.enemies[j];
        const enemyCenterX = enemy.x + enemy.size / 2;
        const enemyCenterY = enemy.y + enemy.size / 2;
        const dx = ballCenterX - enemyCenterX;
        const dy = ballCenterY - enemyCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < (ball.size / 2 + enemy.size / 2)) {
          enemy.health -= ball.damage;

          if (enemy.health <= 0) {
            state.points += enemy.points;
            updatePoints();
            enemyDeathAnimation(enemy);
            objects.enemies.splice(j, 1);
          }

          ball.element.remove();
          objects.balls.splice(i, 1);
          break;
        }
      }
    }

    // Player-Enemy collisions
    for (let i = objects.enemies.length - 1; i >= 0; i--) {
      const enemy = objects.enemies[i];
      const enemyCenterX = enemy.x + enemy.size / 2;
      const enemyCenterY = enemy.y + enemy.size / 2;
      const dx = playerCenterX - enemyCenterX;
      const dy = playerCenterY - enemyCenterY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < (PLAYER_RADIUS + enemy.size / 2)) {
        state.playerHealth -= enemy.damage;
        updatePlayerHealth();
        enemyDeathAnimation(enemy);
        objects.enemies.splice(i, 1);

        if (state.playerHealth <= 0) gameOver();
      }
    }
  }

  function clearEnemies() {
    objects.enemies.forEach(enemy => enemy.element.parentNode && enemy.element.remove());
    objects.enemies.length = 0;
  }

  function spawnEnemies() {
    if (objects.enemies.length < 5) createSquareEnemy();
    if (state.points >= 10 && state.triangleSpawnCounter % 2 === 0) createRedSquareEnemy();
    if (state.points >= 20 && state.pentagonSpawnCounter % 4 === 0) createPurpleSquareEnemy();
    state.triangleSpawnCounter++;
    state.pentagonSpawnCounter++;
  }

  // UI Functions
  function createMinimap() {
    const existingMinimap = document.querySelector('.minimapCard');
    if (existingMinimap) existingMinimap.remove();

    const minimapCard = document.createElement('div');
    minimapCard.className = 'minimapCard';
    minimapCard.style.cssText = `position:fixed;top:20px;left:20px;width:${MINIMAP_SIZE}px;height:${MINIMAP_SIZE}px;background:rgba(255,255,255,0.9);border-radius:8px;z-index:50;padding:5px`;

    objects.minimapCanvas = document.createElement('canvas');
    objects.minimapCanvas.width = MINIMAP_SIZE - 10;
    objects.minimapCanvas.height = MINIMAP_SIZE - 10;
    objects.minimapCtx = objects.minimapCanvas.getContext('2d');

    minimapCard.appendChild(objects.minimapCanvas);
    document.body.appendChild(minimapCard);
  }

  function updateMinimap() {
    if (!objects.minimapCtx) return;
    const size = objects.minimapCanvas.width;
    objects.minimapCtx.clearRect(0, 0, size, size);

    objects.minimapCtx.strokeStyle = '#333';
    objects.minimapCtx.lineWidth = 2;
    objects.minimapCtx.strokeRect(0, 0, size, size);

    const px = (state.playerWorldX + PLAYER_RADIUS) * (size / WORLD_SIZE);
    const py = (state.playerWorldY + PLAYER_RADIUS) * (size / WORLD_SIZE);
    objects.minimapCtx.fillStyle = 'blue';
    objects.minimapCtx.beginPath();
    objects.minimapCtx.arc(px, py, 4, 0, Math.PI * 2);
    objects.minimapCtx.fill();

    objects.enemies.forEach(enemy => {
      const ex = (enemy.x + enemy.size / 2) * (size / WORLD_SIZE);
      const ey = (enemy.y + enemy.size / 2) * (size / WORLD_SIZE);
      objects.minimapCtx.fillStyle = 'red';
      objects.minimapCtx.beginPath();
      objects.minimapCtx.arc(ex, ey, 2, 0, Math.PI * 2);
      objects.minimapCtx.fill();
    });
  }

  // Upgrade System
  function createUpgradeMenu() {
    const upgradeMenu = document.createElement('div');
    upgradeMenu.className = 'upgradeMenu';
    upgradeMenu.style.display = 'none';

    const upgradeContent = document.createElement('div');
    upgradeContent.className = 'upgradeContent';

    const upgradeTitle = document.createElement('h3');
    upgradeTitle.textContent = 'Upgrade Menu';
    upgradeTitle.className = 'upgradeTitle';

    const pointsDisplay = document.createElement('div');
    pointsDisplay.className = 'upgradePointsDisplay';
    pointsDisplay.textContent = 'Points: ' + state.points;
    pointsDisplay.id = 'upgradePointsDisplay';

    const upgrades = [
      { name: 'Speed', level: state.speedLevel, desc: 'Increases movement speed', func: upgradeSpeed },
      { name: 'Health', level: state.healthLevel, desc: 'Increases maximum health and fully heals', func: upgradeHealth },
      { name: 'Damage', level: state.damageLevel, desc: 'Increases bullet damage', func: upgradeDamage },
      { name: 'Reload Speed', level: state.reloadLevel, desc: 'Decreases reload time', func: upgradeReload },
      { name: 'Bullet Speed', level: state.bulletSpeedLevel, desc: 'Increases bullet travel speed', func: upgradeBulletSpeed }
    ];

    upgradeContent.appendChild(upgradeTitle);
    upgradeContent.appendChild(pointsDisplay);
    upgrades.forEach(upgrade => upgradeContent.appendChild(createUpgradeButton(upgrade)));
    upgradeMenu.appendChild(upgradeContent);
    document.body.appendChild(upgradeMenu);
  }

  function createUpgradeButton(upgrade) {
    const button = document.createElement('div');
    button.className = 'upgradeButton';
    button.dataset.upgradeType = upgrade.name.toLowerCase().replace(' ', '-');

    const buttonTop = document.createElement('div');
    buttonTop.className = 'upgradeButtonTop';

    const buttonName = document.createElement('span');
    buttonName.textContent = `${upgrade.name} (Lv. ${upgrade.level})`;
    buttonName.className = 'upgradeButtonName';

    const buttonDesc = document.createElement('span');
    buttonDesc.textContent = upgrade.desc;
    buttonDesc.className = 'upgradeButtonDesc';

    buttonTop.appendChild(buttonName);
    buttonTop.appendChild(buttonDesc);

    // Calculate cost based on current level (times bought)
    const cost = Math.pow(upgrade.level + 1, 3);
    const buttonAction = document.createElement('button');
    buttonAction.textContent = `Upgrade (${cost} points)`;
    buttonAction.className = 'upgradeActionBtn';
    buttonAction.addEventListener('click', upgrade.func);
    buttonAction.disabled = state.points < cost;

    button.appendChild(buttonTop);
    button.appendChild(buttonAction);
    return button;
  }

  function upgradeSpeed() { performUpgrade('speed', () => state.moveSpeed += 1); }
  function upgradeHealth() { performUpgrade('health', () => { state.maxPlayerHealth += 1; state.playerHealth = state.maxPlayerHealth; }); }
  function upgradeDamage() { performUpgrade('damage', () => state.playerDamage += 1); }
  function upgradeReload() { performUpgrade('reload', () => state.shotCooldown = Math.max(50, state.shotCooldown - 10)); }
  function upgradeBulletSpeed() { performUpgrade('bulletSpeed', () => state.bulletSpeed += 1); }

  function performUpgrade(type, upgradeFunc) {
    const currentLevel = state[`${type}Level`];
    const cost = Math.pow(currentLevel + 1, 3);
    if (state.points >= cost) {
      state.points -= cost;
      upgradeFunc();
      state[`${type}Level`]++;
      updatePoints();
      updatePlayerHealth();
      updateUpgradeMenu();
    }
  }

  function updateUpgradeMenu() {
    const upgradeMenu = document.querySelector('.upgradeMenu');
    if (!upgradeMenu) return;

    const pointsDisplay = upgradeMenu.querySelector('.upgradePointsDisplay');
    if (pointsDisplay) pointsDisplay.textContent = 'Points: ' + state.points;

    const upgradeButtons = upgradeMenu.querySelectorAll('.upgradeButton');
    upgradeButtons.forEach(button => {
      const nameElement = button.querySelector('.upgradeButtonName');
      const actionBtn = button.querySelector('.upgradeActionBtn');
      if (!nameElement || !actionBtn) return;

      const nameText = nameElement.textContent;
      let currentLevel = 0;

      if (nameText.includes('Reload')) currentLevel = state.reloadLevel;
      else if (nameText.includes('Health')) currentLevel = state.healthLevel;
      else if (nameText.includes('Damage')) currentLevel = state.damageLevel;
      else if (nameText.includes('Speed') && !nameText.includes('Bullet')) currentLevel = state.speedLevel;
      else if (nameText.includes('Bullet')) currentLevel = state.bulletSpeedLevel;

      // Calculate cost based on current level
      const cost = Math.pow(currentLevel + 1, 3);
      nameElement.textContent = nameText.split(' (Lv. ')[0] + ' (Lv. ' + currentLevel + ')';
      actionBtn.textContent = 'Upgrade (' + cost + ' points)';
    });
  }

  function refreshUpgradeButtons() {
    const upgradeMenu = document.querySelector('.upgradeMenu');
    if (!upgradeMenu) return;

    const upgradeButtons = upgradeMenu.querySelectorAll('.upgradeButton');
    upgradeButtons.forEach(button => {
      const actionBtn = button.querySelector('.upgradeActionBtn');
      const nameElement = button.querySelector('.upgradeButtonName');
      if (!actionBtn || !nameElement) return;

      let currentLevel = 0;
      const nameText = nameElement.textContent;

      if (nameText.includes('Reload')) currentLevel = state.reloadLevel;
      else if (nameText.includes('Health')) currentLevel = state.healthLevel;
      else if (nameText.includes('Damage')) currentLevel = state.damageLevel;
      else if (nameText.includes('Speed') && !nameText.includes('Bullet')) currentLevel = state.speedLevel;
      else if (nameText.includes('Bullet')) currentLevel = state.bulletSpeedLevel;

      // Calculate cost based on current level
      const cost = Math.pow(currentLevel + 1, 3);
      actionBtn.disabled = state.points < cost;
    });
  }

  function toggleUpgradeMenu() {
    state.upgradeMenuOpen = !state.upgradeMenuOpen;
    state.gamePaused = state.upgradeMenuOpen;

    const upgradeMenu = document.querySelector('.upgradeMenu');
    if (!upgradeMenu) return;

    if (state.upgradeMenuOpen) {
      upgradeMenu.style.display = 'flex';
      gameScreen.classList.add('menuOpen');
      setTimeout(() => upgradeMenu.classList.add('menuOpen'), 10);
    } else {
      upgradeMenu.classList.remove('menuOpen');
      gameScreen.classList.remove('menuOpen');
      setTimeout(() => upgradeMenu.style.display = 'none', 300);
    }
  }

  // Game Flow Functions
  function startGame() {
    startScreen.style.display = 'none';
    gameScreen.style.display = 'block';
    initGame();
  }

  function gameOver() {
    state.inGame = false;
    clearEnemies();
    objects.balls.forEach(ball => ball.element.remove());
    objects.balls.length = 0;

    const deathScreen = document.createElement('div');
    deathScreen.className = 'deathScreen';
    deathScreen.innerHTML = `
      <div class="deathContent">
        <div class="deathTitle">Game Over</div>
        <div class="deathScore">Final Score: ${state.points}</div>
        <button class="deathButton" id="restartBtn">Continue</button>
      </div>
    `;

    document.body.appendChild(deathScreen);
    setTimeout(() => deathScreen.classList.add('show'), 10);

    document.getElementById('restartBtn').addEventListener('click', () => {
      deathScreen.remove();
      resetGame();
      startGame();
    });
  }

  function resetGame() {
    state = {
      ...state,
      inGame: false,
      gamePaused: false,
      upgradeMenuOpen: false,
      playerHealth: 5,
      maxPlayerHealth: 5,
      points: 0,
      triangleSpawnCounter: 0,
      pentagonSpawnCounter: 0,
      moveSpeed: 5,
      shotCooldown: 250,
      playerDamage: 1,
      bulletSpeed: 8,
      // RESET upgrade levels to 0 on death
      speedLevel: 0,
      healthLevel: 0,
      damageLevel: 0,
      reloadLevel: 0,
      bulletSpeedLevel: 0
    };

    objects.balls.forEach(ball => ball.element.remove());
    objects.enemies.forEach(enemy => enemy.element.remove());
    objects.balls.length = 0;
    objects.enemies.length = 0;

    if (objects.playerContainer) objects.playerContainer.remove();
    objects.playerContainer = null;
    
    // Update UI to reflect reset state
    updatePlayerHealth();
    updatePoints();
    updateUpgradeMenu(); // Refresh upgrade menu to show reset prices
  }

  // Game Loop
  function gameLoop() {
    if (!state.inGame) return;

    const currentTime = Date.now();
    const delta = Math.min((currentTime - state.lastTime) / FRAME_TIME, 2);
    state.lastTime = currentTime;

    if (!state.gamePaused) {
      updateGameState(delta);
    }

    requestAnimationFrame(gameLoop);
  }

  function updateGameState(delta) {
    updateInput(delta);
    updateAim();
    updateBalls(delta);
    updateEnemies(delta);
    checkCollisions();
    updateMinimap();

    if (Date.now() - state.lastSpawnTime > 1000) {
      spawnEnemies();
      state.lastSpawnTime = Date.now();
    }
  }

  function updateInput(delta) {
    if (state.keys['w']) movePlayer(0, -state.moveSpeed * delta);
    if (state.keys['s']) movePlayer(0, state.moveSpeed * delta);
    if (state.keys['a']) movePlayer(-state.moveSpeed * delta, 0);
    if (state.keys['d']) movePlayer(state.moveSpeed * delta, 0);
    if (state.mouseDown) shoot();
  }

  // Event Listeners
  function setupEventListeners() {
    playBtn.addEventListener('click', startGame);
    playerNameInput.addEventListener('keypress', e => e.key === 'Enter' && startGame());

    document.addEventListener('keydown', e => {
      if (!state.inGame) return;
      const key = e.key.toLowerCase();
      state.keys[key] = true;
      if (key === 'tab') {
        e.preventDefault();
        toggleUpgradeMenu();
      }
    });

    document.addEventListener('keyup', e => state.keys[e.key.toLowerCase()] = false);

    document.addEventListener('mousedown', e => {
      if (state.inGame && !state.gamePaused) state.mouseDown = true;
    });

    document.addEventListener('mouseup', () => state.mouseDown = false);

    document.addEventListener('mousemove', e => {
      state.mouseScreenX = e.clientX;
      state.mouseScreenY = e.clientY;
    });

    window.addEventListener('resize', () => {
      if (state.inGame) updateCamera();
    });
  }

  // Initialize
  setupEventListeners();
});