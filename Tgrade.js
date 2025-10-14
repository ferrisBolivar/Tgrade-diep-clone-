document.addEventListener('DOMContentLoaded', function () {
  const startScreen = document.getElementById('startScreen');
  const gameScreen = document.getElementById('gameScreen');
  const camera = document.getElementById('camera');
  const gameWorld = document.getElementById('gameWorld');
  const arena = document.getElementById('arena');
  const playBtn = document.getElementById('playBtn');
  const playerNameInput = document.getElementById('playerName');

  let inGame = false;

  let playerContainer = null;
  let barrel = null;
  let playerHealthBar = null;
  let pointsValue = null;

  const playerSize = 80;
  const playerRadius = playerSize / 2;

  let moveSpeed = 5;
  const targetFPS = 60;
  const frameTime = 1000 / targetFPS;

  const gridCols = 3;
  const gridRows = 3;
  const subGridSize = 5;
  const worldSize = Math.max(window.innerWidth, window.innerHeight) * 1.5;

  let playerWorldX = 0;
  let playerWorldY = 0;

  let mouseScreenX = window.innerWidth / 2;
  let mouseScreenY = window.innerHeight / 2;

  let mouseWorldX = worldSize / 2;
  let mouseWorldY = worldSize / 2;

  let cameraX = 0;
  let cameraY = 0;

  const keys = {};
  const balls = [];
  const enemies = [];

  let minimapCanvas, minimapCtx;
  const minimapSize = 150;
  let playerHealth = 5;
  let maxPlayerHealth = 5;
  let points = 1000000;
  let triangleSpawnCounter = 0;
  let pentagonSpawnCounter = 0;

  let lastShotTime = 0;
  let shotCooldown = 250;
  let mouseDown = false;
  let upgradeMenuOpen = false;
  let gamePaused = false;

  let playerDamage = 1;
  let bulletSpeed = 8;
  let speedLevel = 0;
  let healthLevel = 0;
  let damageLevel = 0;
  let reloadLevel = 0;
  let bulletSpeedLevel = 0;

  function createArena() {
    arena.innerHTML = '';
    gameWorld.style.width = worldSize + 'px';
    gameWorld.style.height = worldSize + 'px';
    const cellSize = worldSize / 3;

    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const gridCell = document.createElement('div');
        gridCell.className = 'gridCell';
        gridCell.style.width = cellSize + 'px';
        gridCell.style.height = cellSize + 'px';
        gridCell.style.position = 'absolute';
        gridCell.style.left = (col * cellSize) + 'px';
        gridCell.style.top = (row * cellSize) + 'px';

        for (let i = 0; i < subGridSize; i++) {
          for (let j = 0; j < subGridSize; j++) {
            const subGrid = document.createElement('div');
            subGrid.className = 'subGrid';
            subGrid.style.gridColumn = (j + 1);
            subGrid.style.gridRow = (i + 1);
            gridCell.appendChild(subGrid);
          }
        }
        arena.appendChild(gridCell);
      }
    }
  }

  function initPlayerPosition() {
    playerWorldX = worldSize / 2 - playerSize / 2;
    playerWorldY = worldSize / 2 - playerSize / 2;
    updatePlayerPosition();
    updateCamera();
  }

  function createPlayer() {
    playerContainer = document.createElement('div');
    playerContainer.className = 'playerContainer';

    const player = document.createElement('div');
    player.className = 'player';

    const nameDisplay = document.createElement('div');
    nameDisplay.className = 'playerName';
    nameDisplay.textContent = playerNameInput.value || 'Player';

    barrel = document.createElement('div');
    barrel.className = 'barrel';

    playerContainer.appendChild(barrel);
    playerContainer.appendChild(player);
    playerContainer.appendChild(nameDisplay);
    gameWorld.appendChild(playerContainer);

    initPlayerPosition();
  }

  function initUI() {
    playerHealthBar = document.getElementById('playerHealthBar');
    pointsValue = document.getElementById('pointsValue');
    updatePlayerHealth();
    updateAllPointsDisplays();
  }

  function updatePlayerPosition() {
    if (!playerContainer) return;
    playerContainer.style.left = playerWorldX + 'px';
    playerContainer.style.top = playerWorldY + 'px';
  }

  function updatePlayerHealth() {
    if (!playerHealthBar) return;

    const healthPercent = (playerHealth / maxPlayerHealth) * 100;
    playerHealthBar.style.width = healthPercent + '%';

    if (healthPercent > 60) {
      playerHealthBar.className = 'progress-bar bg-success';
    } else if (healthPercent > 30) {
      playerHealthBar.className = 'progress-bar bg-warning';
    } else {
      playerHealthBar.className = 'progress-bar bg-danger';
    }
  }

  function updatePoints() {
    if (!pointsValue) return;
    pointsValue.textContent = points;
  }

  function updateAllPointsDisplays() {
    updatePoints();
    const upgradePointsDisplay = document.getElementById('upgradePointsDisplay');
    if (upgradePointsDisplay) {
      upgradePointsDisplay.textContent = 'Points: ' + points;
    }
    refreshUpgradeButtons();
  }


  function updateMousePos() {
    mouseWorldX = mouseScreenX + cameraX;
    mouseWorldY = mouseScreenY + cameraY;
  }

  function getAim() {
    updateMousePos();
    const playerCenterX = playerWorldX + playerRadius;
    const playerCenterY = playerWorldY + playerRadius;
    const dx = mouseWorldX - playerCenterX;
    const dy = mouseWorldY - playerCenterY;
    const angle = Math.atan2(dy, dx);
    return angle;
  }

  function updateAim() {
    if (!barrel) return;
    const angle = getAim();
    barrel.style.transform = `rotate(${angle}rad)`;
  }

  function updateCamera() {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const idealCameraX = playerWorldX - screenWidth / 2 + playerRadius;
    const idealCameraY = playerWorldY - screenHeight / 2 + playerRadius;

    cameraX = Math.max(0, Math.min(idealCameraX, worldSize - screenWidth));
    cameraY = Math.max(0, Math.min(idealCameraY, worldSize - screenHeight));

    gameWorld.style.transform = `translate(${-cameraX}px, ${-cameraY}px)`;
  }

  function isPositionValid(x, y) {
    return x >= 0 &&
      x <= worldSize - playerSize &&
      y >= 0 &&
      y <= worldSize - playerSize;
  }

  function movePlayer(dx, dy) {
    const newX = playerWorldX + dx;
    const newY = playerWorldY + dy;
    if (isPositionValid(newX, newY)) {
      playerWorldX = newX;
      playerWorldY = newY;
      updatePlayerPosition();
      updateCamera();
    }
  }

  function createMinimap() {
    const existingMinimap = document.querySelector('.minimapCard');
    if (existingMinimap) {
      existingMinimap.remove();
    }

    const minimapCard = document.createElement('div');
    minimapCard.className = 'minimapCard';
    minimapCard.style.position = 'fixed';
    minimapCard.style.top = '20px';
    minimapCard.style.left = '20px';
    minimapCard.style.width = minimapSize + 'px';
    minimapCard.style.height = minimapSize + 'px';
    minimapCard.style.background = 'rgba(255, 255, 255, 0.9)';
    minimapCard.style.borderRadius = '8px';
    minimapCard.style.zIndex = '50';
    minimapCard.style.padding = '5px';

    minimapCanvas = document.createElement('canvas');
    minimapCanvas.width = minimapSize - 10;
    minimapCanvas.height = minimapSize - 10;
    minimapCtx = minimapCanvas.getContext('2d');

    minimapCard.appendChild(minimapCanvas);
    document.body.appendChild(minimapCard);
  }

  function updateMinimap() {
    if (!minimapCtx) return;
    const size = minimapCanvas.width;

    minimapCtx.clearRect(0, 0, size, size);

    minimapCtx.strokeStyle = '#333';
    minimapCtx.lineWidth = 2;
    minimapCtx.strokeRect(0, 0, size, size);

    const px = (playerWorldX + playerRadius) * (size / worldSize);
    const py = (playerWorldY + playerRadius) * (size / worldSize);

    minimapCtx.fillStyle = 'blue';
    minimapCtx.beginPath();
    minimapCtx.arc(px, py, 4, 0, Math.PI * 2);
    minimapCtx.fill();

    enemies.forEach(enemy => {
      const ex = (enemy.x + enemy.size / 2) * (size / worldSize);
      const ey = (enemy.y + enemy.size / 2) * (size / worldSize);
      minimapCtx.fillStyle = 'red';
      minimapCtx.beginPath();
      minimapCtx.arc(ex, ey, 2, 0, Math.PI * 2);
      minimapCtx.fill();
    });
  }

  function shoot() {
    const currentTime = Date.now();
    if (currentTime - lastShotTime < shotCooldown) {
      return;
    }

    lastShotTime = currentTime;

    const angle = getAim();
    const ballSize = playerRadius;

    const ball = document.createElement('div');
    ball.className = 'ball';
    ball.style.width = ballSize + 'px';
    ball.style.height = ballSize + 'px';
    ball.style.backgroundColor = '#3498db';
    ball.style.border = '2px solid black';

    const barrelLength = 50;
    const barrelEndX = playerWorldX + playerRadius + Math.cos(angle) * (playerRadius + barrelLength);
    const barrelEndY = playerWorldY + playerRadius + Math.sin(angle) * (playerRadius + barrelLength);

    const ballStartX = barrelEndX - ballSize / 2;
    const ballStartY = barrelEndY - ballSize / 2;

    ball.style.left = ballStartX + 'px';
    ball.style.top = ballStartY + 'px';

    gameWorld.appendChild(ball);

    const ballObj = {
      element: ball,
      x: ballStartX,
      y: ballStartY,
      vx: Math.cos(angle) * bulletSpeed,
      vy: Math.sin(angle) * bulletSpeed,
      size: ballSize,
      damage: playerDamage
    };

    balls.push(ballObj);
  }

  function isPositionOutsideView(x, y, size) {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    const left = cameraX;
    const right = cameraX + screenWidth;
    const top = cameraY;
    const bottom = cameraY + screenHeight;

    const enemyRight = x + size;
    const enemyBottom = y + size;

    return enemyRight < left || x > right || enemyBottom < top || y > bottom;
  }

  function createSquareEnemy() {
    const enemySize = 60;
    let spawnX, spawnY;
    let attempts = 0;
    const maxAttempts = 20;

    do {
      spawnX = Math.random() * (worldSize - enemySize);
      spawnY = Math.random() * (worldSize - enemySize);
      attempts++;
    } while (!isPositionOutsideView(spawnX, spawnY, enemySize) && attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      return;
    }

    const enemy = document.createElement('div');
    enemy.className = 'enemy square';
    enemy.style.width = enemySize + 'px';
    enemy.style.height = enemySize + 'px';
    enemy.style.backgroundColor = 'yellow';
    enemy.style.border = '2px solid black';
    enemy.style.position = 'absolute';
    enemy.style.left = spawnX + 'px';
    enemy.style.top = spawnY + 'px';

    gameWorld.appendChild(enemy);

    const enemyObj = {
      element: enemy,
      x: spawnX,
      y: spawnY,
      size: enemySize,
      health: 2,
      maxHealth: 2,
      speed: 4,
      type: 'square',
      points: 1,
      damage: 1
    };

    enemies.push(enemyObj);
  }

  function createRedSquareEnemy() {
    const enemySize = 60;
    let spawnX, spawnY;
    let attempts = 0;
    const maxAttempts = 20;

    do {
      spawnX = Math.random() * (worldSize - enemySize);
      spawnY = Math.random() * (worldSize - enemySize);
      attempts++;
    } while (!isPositionOutsideView(spawnX, spawnY, enemySize) && attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      return;
    }

    const enemy = document.createElement('div');
    enemy.className = 'enemy redSquare';
    enemy.style.width = enemySize + 'px';
    enemy.style.height = enemySize + 'px';
    enemy.style.backgroundColor = 'red';
    enemy.style.border = '2px solid black';
    enemy.style.position = 'absolute';
    enemy.style.left = spawnX + 'px';
    enemy.style.top = spawnY + 'px';

    gameWorld.appendChild(enemy);

    const enemyObj = {
      element: enemy,
      x: spawnX,
      y: spawnY,
      size: enemySize,
      health: 1,
      maxHealth: 1,
      speed: 8,
      type: 'redSquare',
      points: 2,
      damage: 1
    };

    enemies.push(enemyObj);
  }

  function createPurpleSquareEnemy() {
    const enemySize = 60;
    let spawnX, spawnY;
    let attempts = 0;
    const maxAttempts = 20;

    do {
      spawnX = Math.random() * (worldSize - enemySize);
      spawnY = Math.random() * (worldSize - enemySize);
      attempts++;
    } while (!isPositionOutsideView(spawnX, spawnY, enemySize) && attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      return;
    }

    const enemy = document.createElement('div');
    enemy.className = 'enemy purpleSquare';
    enemy.style.width = enemySize + 'px';
    enemy.style.height = enemySize + 'px';
    enemy.style.backgroundColor = 'purple';
    enemy.style.border = '2px solid black';
    enemy.style.position = 'absolute';
    enemy.style.left = spawnX + 'px';
    enemy.style.top = spawnY + 'px';

    gameWorld.appendChild(enemy);

    const enemyObj = {
      element: enemy,
      x: spawnX,
      y: spawnY,
      size: enemySize,
      health: 6,
      maxHealth: 6,
      speed: 2,
      type: 'purpleSquare',
      points: 3,
      damage: 2
    };

    enemies.push(enemyObj);
  }

  function enemyDeathAnimation(enemy) {
    enemy.element.style.transition = 'all 0.3s ease-out';
    enemy.element.style.transform += ' scale(0)';
    enemy.element.style.opacity = '0';

    setTimeout(() => {
      if (enemy.element.parentNode) {
        enemy.element.remove();
      }
    }, 300);
  }

  function updateEnemies(delta) {
    const playerCenterX = playerWorldX + playerRadius;
    const playerCenterY = playerWorldY + playerRadius;

    enemies.forEach(enemy => {
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

        const angle = Math.atan2(dy, dx);
        enemy.element.style.transform = `rotate(${angle}rad)`;
      }
    });
  }

  function checkCollisions() {
    for (let i = balls.length - 1; i >= 0; i--) {
      const ball = balls[i];
      const ballCenterX = ball.x + ball.size / 2;
      const ballCenterY = ball.y + ball.size / 2;

      for (let j = enemies.length - 1; j >= 0; j--) {
        const enemy = enemies[j];
        const enemyCenterX = enemy.x + enemy.size / 2;
        const enemyCenterY = enemy.y + enemy.size / 2;

        const dx = ballCenterX - enemyCenterX;
        const dy = ballCenterY - enemyCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < (ball.size / 2 + enemy.size / 2)) {
          enemy.health -= ball.damage;

          if (enemy.health <= 0) {
            points += enemy.points;
            updateAllPointsDisplays();
            enemyDeathAnimation(enemy);
            enemies.splice(j, 1);
          }

          ball.element.remove();
          balls.splice(i, 1);
          break;
        }
      }
    }

    const playerCenterX = playerWorldX + playerRadius;
    const playerCenterY = playerWorldY + playerRadius;

    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      const enemyCenterX = enemy.x + enemy.size / 2;
      const enemyCenterY = enemy.y + enemy.size / 2;

      const dx = playerCenterX - enemyCenterX;
      const dy = playerCenterY - enemyCenterY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < (playerRadius + enemy.size / 2)) {
        playerHealth -= enemy.damage;
        updatePlayerHealth();
        enemyDeathAnimation(enemy);
        enemies.splice(i, 1);

        if (playerHealth <= 0) {
          gameOver();
        }
      }
    }
  }

  function clearEnemies() {
    enemies.forEach(enemy => {
      if (enemy.element && enemy.element.parentNode) {
        enemy.element.remove();
      }
    });
    enemies.length = 0;
  }


  function gameOver() {
    inGame = false;
    gameScreen.style.display = 'none';
    showDeathScreen();

    balls.forEach(ball => ball.element.remove());
    balls.length = 0;
    clearEnemies();


    if (playerContainer) {
      playerContainer.remove();
      playerContainer = null;
    }

    closeUpgradeMenu();
  }

  function showDeathScreen() {
    const deathScreen = document.createElement('div');
    deathScreen.className = 'deathScreen';

    const deathContent = document.createElement('div');
    deathContent.className = 'deathContent';

    const deathTitle = document.createElement('h1');
    deathTitle.textContent = 'YOU DIED';
    deathTitle.className = 'deathTitle';

    const deathScore = document.createElement('div');
    deathScore.textContent = 'Final Score: ' + points;
    deathScore.className = 'deathScore';

    const restartButton = document.createElement('button');
    restartButton.textContent = 'Continue';
    restartButton.className = 'deathButton';
    restartButton.addEventListener('click', () => {
      deathScreen.remove();
      startScreen.style.display = 'block';
      resetGameStats();
    });

    deathContent.appendChild(deathTitle);
    deathContent.appendChild(deathScore);
    deathContent.appendChild(restartButton);
    deathScreen.appendChild(deathContent);

    document.body.appendChild(deathScreen);

    setTimeout(() => {
      deathScreen.classList.add('show');
    }, 100);
  }

  function resetGameStats() {
    playerHealth = 5;
    maxPlayerHealth = 5;
    points = 0;
    triangleSpawnCounter = 0;
    pentagonSpawnCounter = 0;
    moveSpeed = 5;
    shotCooldown = 250;
    playerDamage = 1;
    bulletSpeed = 8;
    speedLevel = 0;
    healthLevel = 0;
    damageLevel = 0;
    reloadLevel = 0;
    bulletSpeedLevel = 0;
    clearEnemies();
    updatePlayerHealth();
    updateAllPointsDisplays();
    updateUpgradeMenu();



  }

  function updateBalls(delta) {
    for (let i = balls.length - 1; i >= 0; i--) {
      const ball = balls[i];

      ball.x += ball.vx * delta;
      ball.y += ball.vy * delta;

      ball.element.style.left = ball.x + 'px';
      ball.element.style.top = ball.y + 'px';

      if (ball.x < 0 || ball.x > worldSize || ball.y < 0 || ball.y > worldSize) {
        ball.element.remove();
        balls.splice(i, 1);
      }
    }
  }

  function spawnEnemies() {
    if (enemies.length < 5) {
      createSquareEnemy();
    }

    if (points >= 10 && triangleSpawnCounter % 2 === 0) {
      createRedSquareEnemy();
    }
    triangleSpawnCounter++;

    if (points >= 20 && pentagonSpawnCounter % 4 === 0) {
      createPurpleSquareEnemy();
    }
    pentagonSpawnCounter++;
  }

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
    pointsDisplay.textContent = 'Points: ' + points;
    pointsDisplay.id = 'upgradePointsDisplay';

    const speedUpgrade = createUpgradeButton('Speed', speedLevel, 'Increases movement speed', upgradeSpeed);
    const healthUpgrade = createUpgradeButton('Health', healthLevel, 'Increases maximum health and fully heals', upgradeHealth);
    const damageUpgrade = createUpgradeButton('Damage', damageLevel, 'Increases bullet damage', upgradeDamage);
    const reloadUpgrade = createUpgradeButton('Reload Speed', reloadLevel, 'Decreases reload time', upgradeReload);
    const bulletSpeedUpgrade = createUpgradeButton('Bullet Speed', bulletSpeedLevel, 'Increases bullet travel speed', upgradeBulletSpeed);

    upgradeContent.appendChild(upgradeTitle);
    upgradeContent.appendChild(pointsDisplay);
    upgradeContent.appendChild(speedUpgrade);
    upgradeContent.appendChild(healthUpgrade);
    upgradeContent.appendChild(damageUpgrade);
    upgradeContent.appendChild(reloadUpgrade);
    upgradeContent.appendChild(bulletSpeedUpgrade);
    upgradeMenu.appendChild(upgradeContent);

    document.body.appendChild(upgradeMenu);

    return upgradeMenu;
  }

  function createUpgradeButton(name, level, description, onClick) {
    const button = document.createElement('div');
    button.className = 'upgradeButton';
    button.dataset.upgradeType = name.toLowerCase().replace(' ', '-');

    const buttonTop = document.createElement('div');
    buttonTop.className = 'upgradeButtonTop';

    const buttonName = document.createElement('span');
    buttonName.textContent = name + ' (Lv. ' + level + ')';
    buttonName.className = 'upgradeButtonName';

    const buttonDesc = document.createElement('span');
    buttonDesc.textContent = description;
    buttonDesc.className = 'upgradeButtonDesc';

    buttonTop.appendChild(buttonName);
    buttonTop.appendChild(buttonDesc);

    const cost = Math.pow(level + 1, 3);
    const buttonAction = document.createElement('button');
    buttonAction.textContent = 'Upgrade (' + cost + ' points)';
    buttonAction.className = 'upgradeActionBtn';
    buttonAction.addEventListener('click', onClick);

    buttonAction._clickHandler = onClick;

    if (points < cost) {
      buttonAction.disabled = true;
    }

    button.appendChild(buttonTop);
    button.appendChild(buttonAction);

    return button;
  }

  function upgradeSpeed() {
    const cost = Math.pow(speedLevel + 1, 3);
    if (points >= cost) {
      points -= cost;
      moveSpeed += 1;
      speedLevel++;
      updateAllPointsDisplays();
      updateUpgradeMenu();
    }
  }

  function upgradeHealth() {
    const cost = Math.pow(healthLevel + 1, 3);
    if (points >= cost) {
      points -= cost;
      maxPlayerHealth += 1;
      playerHealth = maxPlayerHealth;
      healthLevel++;
      updateAllPointsDisplays();
      updatePlayerHealth();
      updateUpgradeMenu();
    }
  }

  function upgradeDamage() {
    const cost = Math.pow(damageLevel + 1, 3);
    if (points >= cost) {
      points -= cost;
      playerDamage += 1;
      damageLevel++;
      updateAllPointsDisplays();
      updateUpgradeMenu();
    }
  }

  function upgradeReload() {
    const cost = Math.pow(reloadLevel + 1, 3);
    if (points >= cost) {
      points -= cost;
      shotCooldown = Math.max(50, shotCooldown - 10);
      reloadLevel++;
      updateAllPointsDisplays();
      updateUpgradeMenu();
    }
  }

  function upgradeBulletSpeed() {
    const cost = Math.pow(bulletSpeedLevel + 1, 3);
    if (points >= cost) {
      points -= cost;
      bulletSpeed += 1;
      bulletSpeedLevel++;
      updateAllPointsDisplays();
      updateUpgradeMenu();
    }
  }

  function updateUpgradeMenu() {
    const upgradeMenu = document.querySelector('.upgradeMenu');
    if (upgradeMenu) {
      const pointsDisplay = upgradeMenu.querySelector('.upgradePointsDisplay');
      if (pointsDisplay) {
        pointsDisplay.textContent = 'Points: ' + points;
      }

      const upgradeButtons = upgradeMenu.querySelectorAll('.upgradeButton');
      upgradeButtons.forEach(button => {
        const nameElement = button.querySelector('.upgradeButtonName');
        const actionBtn = button.querySelector('.upgradeActionBtn');

        if (nameElement && actionBtn) {
          const nameText = nameElement.textContent;
          let upgradeType, currentLevel;

          if (nameText.includes('Reload')) {
            upgradeType = 'reload';
            currentLevel = reloadLevel;
          } else if (nameText.includes('Health')) {
            upgradeType = 'health';
            currentLevel = healthLevel;
          } else if (nameText.includes('Damage')) {
            upgradeType = 'damage';
            currentLevel = damageLevel;
          } else if (nameText.includes('Speed') && !nameText.includes('Bullet')) {
            upgradeType = 'speed';
            currentLevel = speedLevel;
          } else if (nameText.includes('Bullet')) {
            upgradeType = 'bulletSpeed';
            currentLevel = bulletSpeedLevel;
          }

          if (upgradeType) {
            const cost = Math.pow(currentLevel + 1, 3);
            nameElement.textContent = nameText.split(' (Lv. ')[0] + ' (Lv. ' + currentLevel + ')';
            actionBtn.textContent = 'Upgrade (' + cost + ' points)';
          }
        }
      });
    }
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
      let cost = 0;

      if (nameElement.textContent.includes('Reload')) {
        currentLevel = reloadLevel;
        cost = Math.pow(currentLevel + 1, 3);
      } else if (nameElement.textContent.includes('Health')) {
        currentLevel = healthLevel;
        cost = Math.pow(currentLevel + 1, 3);
      } else if (nameElement.textContent.includes('Damage')) {
        currentLevel = damageLevel;
        cost = Math.pow(currentLevel + 1, 3);
      } else if (nameElement.textContent.includes('Speed') && !nameElement.textContent.includes('Bullet')) {
        currentLevel = speedLevel;
        cost = Math.pow(currentLevel + 1, 3);
      } else if (nameElement.textContent.includes('Bullet')) {
        currentLevel = bulletSpeedLevel;
        cost = Math.pow(currentLevel + 1, 3);
      }
      actionBtn.disabled = points < cost;
    });
  }


  function openUpgradeMenu() {
    if (!upgradeMenuOpen) {
      upgradeMenuOpen = true;
      gamePaused = true;
      const upgradeMenu = document.querySelector('.upgradeMenu');
      if (upgradeMenu) {
        upgradeMenu.style.display = 'flex';
        setTimeout(() => {
          upgradeMenu.classList.add('menuOpen');
        }, 10);
        document.querySelector('.gameContainer').classList.add('menuOpen');
      }
    }
  }

  function closeUpgradeMenu() {
    if (upgradeMenuOpen) {
      upgradeMenuOpen = false;
      gamePaused = false;
      const upgradeMenu = document.querySelector('.upgradeMenu');
      if (upgradeMenu) {
        upgradeMenu.classList.remove('menuOpen');
        setTimeout(() => {
          upgradeMenu.style.display = 'none';
        }, 300);
        document.querySelector('.gameContainer').classList.remove('menuOpen');
      }
    }
  }

  function toggleUpgradeMenu() {
    if (upgradeMenuOpen) {
      closeUpgradeMenu();
    } else {
      openUpgradeMenu();
    }
  }

  document.addEventListener('keydown', e => {
    if (e.key) keys[e.key.toLowerCase()] = true;

    if (e.key === 'Tab' && inGame) {
      e.preventDefault();
      toggleUpgradeMenu();
    }
  });

  document.addEventListener('keyup', e => {
    if (e.key) keys[e.key.toLowerCase()] = false;
  });

  document.addEventListener('mousemove', e => {
    mouseScreenX = e.clientX;
    mouseScreenY = e.clientY;
  });

  document.addEventListener('mousedown', e => {
    if (e.button === 0 && inGame && !upgradeMenuOpen) {
      mouseDown = true;
      shoot();
    }
  });

  document.addEventListener('mouseup', e => {
    if (e.button === 0) {
      mouseDown = false;
    }
  });

  document.addEventListener('dragstart', e => {
    e.preventDefault();
  });

  document.addEventListener('selectstart', e => {
    e.preventDefault();
  });

  document.addEventListener('contextmenu', e => {
    e.preventDefault();
  });

  document.body.style.userSelect = 'none';
  document.body.style.webkitUserSelect = 'none';
  document.body.style.mozUserSelect = 'none';
  document.body.style.msUserSelect = 'none';

  let lastTime = 0;
  let lastSpawnTime = 0;
  function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;

    let deltaMS = timestamp - lastTime;
    lastTime = timestamp;

    if (deltaMS > 100) deltaMS = 100;

    let delta = deltaMS / frameTime;

    delta = Math.min(delta, 2.0);

    if (!gamePaused) {
      updateAim();

      if (mouseDown && inGame && !upgradeMenuOpen) {
        shoot();
      }

      let dx = 0, dy = 0;
      if (keys['w'] || keys['arrowup']) dy -= moveSpeed * delta;
      if (keys['s'] || keys['arrowdown']) dy += moveSpeed * delta;
      if (keys['a'] || keys['arrowleft']) dx -= moveSpeed * delta;
      if (keys['d'] || keys['arrowright']) dx += moveSpeed * delta;

      if (dx !== 0 || dy !== 0) {
        movePlayer(dx, dy);
      }

      updateBalls(delta);
      updateEnemies(delta);
      checkCollisions();

      if (timestamp - lastSpawnTime > 2000) {
        spawnEnemies();
        lastSpawnTime = timestamp;
      }

      updateMinimap();
    }

    requestAnimationFrame(gameLoop);
  }

  playBtn.addEventListener('click', () => {
    if (playerNameInput.value.trim() === '') {
      alert('Please enter your name!');
      return;
    }
    startScreen.style.display = 'none';
    gameScreen.style.display = 'block';
    createArena();
    createPlayer();
    initUI();
    createMinimap();
    createUpgradeMenu();
    gameLoop();
    inGame = true;
  });

  window.addEventListener('resize', () => {
    if (playerContainer) updateCamera();
  });
});