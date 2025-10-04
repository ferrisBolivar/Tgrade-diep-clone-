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

  const playerSize = 80;
  const playerRadius = playerSize / 2;

  const moveSpeed = 5; 
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

  let minimapCanvas, minimapCtx;
  const minimapSize = 150;

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

  function updatePlayerPosition() {
    playerContainer.style.left = playerWorldX + 'px';
    playerContainer.style.top = playerWorldY + 'px';
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

    const px = (playerWorldX + playerRadius) * (size / worldSize);
    const py = (playerWorldY + playerRadius) * (size / worldSize);

    minimapCtx.fillStyle = 'blue';
    minimapCtx.beginPath();
    minimapCtx.arc(px, py, 4, 0, Math.PI * 2);
    minimapCtx.fill();
  }

  function shoot() {
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
    
    const ballSpeed = 8;
    const ballObj = {
      element: ball,
      x: ballStartX,
      y: ballStartY,
      vx: Math.cos(angle) * ballSpeed,
      vy: Math.sin(angle) * ballSpeed,
      size: ballSize
    };
    
    balls.push(ballObj);
  }

  function updateBalls() {
    for (let i = balls.length - 1; i >= 0; i--) {
      const ball = balls[i];
      
      ball.x += ball.vx;
      ball.y += ball.vy;
      
      ball.element.style.left = ball.x + 'px';
      ball.element.style.top = ball.y + 'px';
      
      if (ball.x < 0 || ball.x > worldSize || ball.y < 0 || ball.y > worldSize) {
        ball.element.remove();
        balls.splice(i, 1);
      }
    }
  }

  document.addEventListener('keydown', e => {
    if (e.key) keys[e.key.toLowerCase()] = true;
  });

  document.addEventListener('keyup', e => {
    if (e.key) keys[e.key.toLowerCase()] = false;
  });

  document.addEventListener('mousemove', e => {
    mouseScreenX = e.clientX;
    mouseScreenY = e.clientY;
  });

  // Prevent dragging
  document.addEventListener('dragstart', e => {
    e.preventDefault();
  });

  document.addEventListener('selectstart', e => {
    e.preventDefault();
  });

  document.addEventListener('contextmenu', e => {
    e.preventDefault();
  });

  // Prevent text selection
  document.body.style.userSelect = 'none';
  document.body.style.webkitUserSelect = 'none';
  document.body.style.mozUserSelect = 'none';
  document.body.style.msUserSelect = 'none';

  let lastTime = 0;
  function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    let deltaMS = timestamp - lastTime;
    lastTime = timestamp;

    let delta = deltaMS / frameTime;

    updateAim();

    let dx = 0, dy = 0;
    if (keys['w'] || keys['arrowup']) dy -= moveSpeed * delta;
    if (keys['s'] || keys['arrowdown']) dy += moveSpeed * delta;
    if (keys['a'] || keys['arrowleft']) dx -= moveSpeed * delta;
    if (keys['d'] || keys['arrowright']) dx += moveSpeed * delta;

    if (dx !== 0 || dy !== 0) {
      movePlayer(dx, dy);
    }

    updateBalls();
    updateMinimap();

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
    createMinimap();
    gameLoop();
    inGame = true;
  });

  window.addEventListener('click', () => {
    if (inGame) {
      shoot();
    }
  });

  window.addEventListener('resize', () => {
    if (playerContainer) updateCamera();
  });
});