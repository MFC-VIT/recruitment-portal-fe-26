// @ts-nocheck
import { useEffect, useRef, useState, useCallback } from 'react';

// ─── Asset Manifest ────────────────────────────────────────────────────────
// All paths are relative to the `public` directory so Vite serves them as
// static files at runtime (e.g., /game-assets/player/player_run_1.png)
const ASSET_MANIFEST = {
  // Player sprites
  player_idle_1:    '/game-assets/player/player_idle_1.png',
  player_idle_2:    '/game-assets/player/player_idle_2.png',
  player_run_1:     '/game-assets/player/player_run_1.png',
  player_run_2:     '/game-assets/player/player_run_2.png',
  player_run_3:     '/game-assets/player/player_run_3.png',
  player_run_4:     '/game-assets/player/player_run_4.png',
  player_jump:      '/game-assets/player/player_jump.png',
  player_fall:      '/game-assets/player/player_fall.png',
  // Ground obstacles
  short_obstacle:   '/game-assets/obstacles/short_obstacle.png',
  tall_obstacle:    '/game-assets/obstacles/tall_obstacle.png',
  wide_cluster_2x1: '/game-assets/obstacles/wide_cluster_2x1.png',
  wide_cluster_3x2: '/game-assets/obstacles/wide_cluster_3x2.png',
  // Flying obstacles
  flying_obstacle:  '/game-assets/flying/flying_obstacle.png',
  spider:           '/game-assets/flying/spider.png',
};

// ─── Physics & Canvas Constants ─────────────────────────────────────────────
const CANVAS_W    = 1200;
const CANVAS_H    = 250;
const GROUND_Y    = CANVAS_H - 40;   // Y coordinate of the ground line
const PLAYER_X    = 80;              // Player is fixed horizontally
const PLAYER_H    = 60;              // Player sprite render height (px)
const GRAVITY     = 0.55;            // Acceleration downward per frame
const JUMP_FORCE  = -13;             // Upward velocity applied on jump

// ─── Obstacle Constants (Step 7) ────────────────────────────────────────────
const OBS_H               = 50;     // Render height for all ground obstacles
const FLYING_OBS_H        = 40;     // Render height for flying obstacles
// Flying Y: hovers just above the player's standing head, so player must jump
const FLYING_Y            = GROUND_Y - PLAYER_H - 18;

const GROUND_OBS_KEYS     = ['short_obstacle', 'tall_obstacle', 'wide_cluster_2x1', 'wide_cluster_3x2'];
const FLYING_OBS_KEYS     = ['flying_obstacle', 'spider'];

const SPEED_INITIAL       = 4;      // px/frame at the start
const SPEED_MAX           = 10;     // px/frame ceiling (hard cap)
// One speed bump of +0.3 every 600 frames (~10 seconds at 60fps) — gradual ramp
const SPEED_BUMP_INTERVAL = 600;
const SPEED_BUMP_AMOUNT   = 0.3;

const GAP_MIN             = 380;    // Min px gap between consecutive obstacles
const GAP_MAX             = 700;    // Max px gap (random between these two)

// ─── High Score (persists across games within the same page session) ────────
let sessionHighScore = 0;

// ─── Asset Preloader ────────────────────────────────────────────────────────
// Loads every image in parallel. Resolves null on failure so one bad
// file doesn't crash the entire game.
const preloadAssets = (manifest) => {
  const promises = Object.entries(manifest).map(([key, src]) =>
    new Promise((resolve) => {
      const img = new Image();
      img.src     = src;
      img.onload  = () => resolve([key, img]);
      img.onerror = () => {
        console.warn(`[DinoGame] Failed to load: ${src}`);
        resolve([key, null]);
      };
    })
  );
  return Promise.all(promises).then(Object.fromEntries);
};

// ─── Initial Player State Factory ───────────────────────────────────────────
const makePlayer = () => ({
  x:          PLAYER_X,
  y:          GROUND_Y - PLAYER_H,   // Standing on the ground
  velocityY:  0,
  isOnGround: true,
  width:      40,                    // Placeholder; computed from sprite on first draw
  height:     PLAYER_H,
});

// ─── Obstacle Factory (Step 7) ───────────────────────────────────────────────
// Randomly creates a new obstacle object at the right edge of the canvas.
// 25% chance of a flying obstacle, 75% chance of a ground obstacle.
const spawnObstacle = (imgs) => {
  const isFlying  = Math.random() < 0.25;
  const pool      = isFlying ? FLYING_OBS_KEYS : GROUND_OBS_KEYS;
  const key       = pool[Math.floor(Math.random() * pool.length)];
  const img       = imgs[key];
  const h         = isFlying ? FLYING_OBS_H : OBS_H;
  // Compute width from the sprite's natural aspect ratio so it looks correct
  const w         = img ? (img.width / img.height) * h : h;
  const y         = isFlying ? FLYING_Y : GROUND_Y - h;

  return {
    x:         CANVAS_W + 10, // spawn just off the right edge
    y,
    width:     w,
    height:    h,
    spriteKey: key,
    isFlying,
  };
};

// ─── useGameEngine Hook ─────────────────────────────────────────────────────
// canvasRef – ref attached to the <canvas> element in DinoGame.jsx
// isFocused – true when the game container div has keyboard focus
const useGameEngine = (canvasRef, isFocused) => {
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [loadError,    setLoadError]    = useState(false);

  // ── Persistent refs (mutated directly inside RAF — no re-renders) ─────────
  const imagesRef      = useRef({});
  const rafIdRef       = useRef(null);
  const gameStateRef   = useRef('idle');   // 'idle' | 'running' | 'dead'
  const playerRef      = useRef(makePlayer());
  const scoreRef       = useRef(0);
  const frameTickRef   = useRef(0);
  const obstaclesRef   = useRef([]);
  const gameSpeedRef   = useRef(SPEED_INITIAL);     // current px/frame scroll speed
  const nextGapRef     = useRef(GAP_MIN);           // px gap before next obstacle spawns
  const isFocusedRef   = useRef(isFocused);         // mirrors prop for use inside RAF
  const isDuckingRef   = useRef(false);             // ducking state

  // Keep the ref in sync with the React prop so the game loop can read it
  useEffect(() => { isFocusedRef.current = isFocused; }, [isFocused]);

  // ── STEP 4: Load all assets once on mount ────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    preloadAssets(ASSET_MANIFEST).then((images) => {
      if (cancelled) return;
      imagesRef.current = images;

      const loaded = Object.values(images).filter(Boolean).length;
      const total  = Object.keys(ASSET_MANIFEST).length;
      console.log(`[DinoGame] Assets loaded: ${loaded}/${total}`);

      if (loaded === 0) setLoadError(true);
      else              setAssetsLoaded(true);
    }).catch((err) => {
      if (cancelled) return;
      console.error('[DinoGame] Critical asset load failure:', err);
      setLoadError(true);
    });

    return () => { cancelled = true; };
  }, []);

  // ── STEP 5: Main Game Loop ────────────────────────────────────────────────
  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx    = canvas.getContext('2d');
    const imgs   = imagesRef.current;
    const player = playerRef.current;
    const state  = gameStateRef.current;

    // ── 1. Physics (only while running AND focused) ───────────────────────────
    // When the user clicks away to the login form, the game freezes in place.
    // frameTickRef only advances during active play so the speed ramp doesn't
    // accelerate while the user is typing their password.
    if (state === 'running' && isFocusedRef.current) {
      frameTickRef.current += 1;
      
      const wasDucking = player.height < PLAYER_H;
      const isDucking = isDuckingRef.current;
      
      if (isDucking && !wasDucking) {
        // Just ducked -> shrink height and snap Y down
        player.height = PLAYER_H * 0.55;
        if (player.isOnGround) player.y = GROUND_Y - player.height;
      } else if (!isDucking && wasDucking) {
        // Just unducked -> restore height and snap Y up
        player.height = PLAYER_H;
        if (player.isOnGround) player.y = GROUND_Y - player.height;
      }

      // Apply gravity (fast fall if ducking in air)
      if (!player.isOnGround && isDucking) {
        player.velocityY += GRAVITY * 2.5; 
      } else {
        player.velocityY += GRAVITY;
      }
      player.y += player.velocityY;

      // Clamp player to the ground
      const groundLimit = GROUND_Y - player.height;
      if (player.y >= groundLimit) {
        player.y          = groundLimit;
        player.velocityY  = 0;
        player.isOnGround = true;
      } else {
        player.isOnGround = false;
      }

      // Increment score (divides by 6 for a smoother human-readable number)
      scoreRef.current += 1;

      // ── STEP 7A: Speed ramp ───────────────────────────────────────────────
      // Increase speed by SPEED_BUMP_AMOUNT px/frame every SPEED_BUMP_INTERVAL frames
      gameSpeedRef.current = Math.min(
        SPEED_INITIAL + Math.floor(frameTickRef.current / SPEED_BUMP_INTERVAL) * SPEED_BUMP_AMOUNT,
        SPEED_MAX
      );

      // ── STEP 7B: Move all obstacles left & despawn off-screen ones ─────────
      const alive = [];
      for (const obs of obstaclesRef.current) {
        obs.x -= gameSpeedRef.current;
        if (obs.x + obs.width > -10) alive.push(obs); // keep if still visible
      }
      obstaclesRef.current = alive;

      // ── STEP 7C: Spawn next obstacle when gap has been crossed ────────────
      const lastObs = obstaclesRef.current[obstaclesRef.current.length - 1];
      const lastX   = lastObs ? lastObs.x : 0; // 0 means "no obstacle yet"

      if (lastX < CANVAS_W - nextGapRef.current) {
        obstaclesRef.current.push(spawnObstacle(imagesRef.current));
        // Randomise the next gap so the rhythm stays unpredictable
        nextGapRef.current = GAP_MIN + Math.random() * (GAP_MAX - GAP_MIN);
      }

      // ── STEP 8: AABB Collision Detection ─────────────────────────────────
      // Shrink the hit-box by a small inset on all sides so near-misses feel
      // fair and forgiving — a 10px inset on x and 8px on y is the sweet spot.
      const INSET_X = 10;
      const INSET_Y = 8;

      const pLeft   = player.x      + INSET_X;
      const pRight  = player.x + player.width  - INSET_X;
      const pTop    = player.y      + INSET_Y;
      const pBottom = player.y + player.height - INSET_Y;

      for (const obs of obstaclesRef.current) {
        const oLeft   = obs.x             + INSET_X;
        const oRight  = obs.x + obs.width  - INSET_X;
        // Spider obstacle: web extends from ceiling (y=0) to spider bottom
        // so the player MUST duck — they cannot jump over.
        const oTop    = obs.spriteKey === 'spider' ? 0 : obs.y + INSET_Y;
        const oBottom = obs.y + obs.height - INSET_Y;

        // Two rectangles overlap when neither is fully to the side / above / below
        const hit =
          pRight  > oLeft  &&
          pLeft   < oRight &&
          pBottom > oTop   &&
          pTop    < oBottom;

        if (hit) {
          gameStateRef.current = 'dead'; // Trigger Game Over
          break; // No need to check remaining obstacles
        }
      }
    }

    // ── 2. Clear Canvas ──────────────────────────────────────────────────────
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // ── 3. Draw Ground Line (MFC Orange) ────────────────────────────────────
    ctx.strokeStyle = '#fc7a00';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(CANVAS_W, GROUND_Y);
    ctx.stroke();

    // ── 3b. Draw Obstacles (STEP 7) ─────────────────────────────────────────
    // Drawn before the player so the player always renders on top when overlapping.
    for (const obs of obstaclesRef.current) {
      const img = imagesRef.current[obs.spriteKey];

      // Draw spider web from ceiling only for spider
      if (obs.spriteKey === 'spider') {
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]); // dashed web line
        ctx.beginPath();
        const webX = obs.x + obs.width / 2;
        ctx.moveTo(webX, 0);
        ctx.lineTo(webX, obs.y);
        ctx.stroke();
        ctx.setLineDash([]); // reset
      }

      if (img) {
        ctx.drawImage(img, obs.x, obs.y, obs.width, obs.height);
      } else {
        // Fallback: draw a solid MFC-orange rectangle if the sprite failed to load
        ctx.fillStyle = '#fc7a00';
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
      }
    }

    // ── 4. Draw Player Sprite (STEP 6: Animated) ────────────────────────────
    // Pick the correct sprite based on current game state and Y-velocity:
    //   idle          → blink between idle_1 / idle_2 every 30 frames
    //   running, air, velocityY < 0 → jump sprite (going up)
    //   running, air, velocityY ≥ 0 → fall sprite (coming down)
    //   running, ground             → cycle run_1 → run_2 → run_3 → run_4
    let activeSprite;

    if (state === 'idle' || state === 'dead') {
      // Slow blink between the two idle frames (changes every 30 ticks ≈ 0.5s)
      const idleIdx = Math.floor(frameTickRef.current / 30) % 2;
      activeSprite  = idleIdx === 0 ? imgs.player_idle_1 : imgs.player_idle_2;
    } else if (!player.isOnGround && player.velocityY < 0) {
      // Ascending — show the jump frame
      activeSprite = imgs.player_jump;
    } else if (!player.isOnGround && player.velocityY >= 0) {
      // Descending — show the fall frame
      activeSprite = imgs.player_fall;
    } else {
      // Running on the ground — advance one frame every 5 ticks (≈ 12 fps animation)
      const RUN_KEYS  = ['player_run_1', 'player_run_2', 'player_run_3', 'player_run_4'];
      const runIdx    = Math.floor(frameTickRef.current / 5) % RUN_KEYS.length;
      activeSprite    = imgs[RUN_KEYS[runIdx]];
    }

    // Safety fallback: if any sprite file failed to load, use idle_1
    activeSprite = activeSprite || imgs.player_idle_1;

    if (activeSprite) {
      // Calculate width based on the ORIGINAL height so it doesn't get narrow when ducking
      const spriteW = (activeSprite.width / activeSprite.height) * PLAYER_H;
      player.width  = spriteW; // Keep width accurate for collision detection (Step 8)
      ctx.drawImage(activeSprite, player.x, player.y, spriteW, player.height);
    }

    // ── 5. Draw Score ────────────────────────────────────────────────────────
    if (state === 'running' || state === 'dead') {
      const currentScore = Math.floor(scoreRef.current / 6);
      ctx.fillStyle  = '#fc7a00';
      ctx.font       = 'bold 15px monospace';
      ctx.textAlign  = 'right';
      ctx.fillText(`Score: ${currentScore}`, CANVAS_W - 20, 28);
      if (sessionHighScore > 0) {
        ctx.fillStyle = '#888';
        ctx.fillText(`HI: ${sessionHighScore}`, CANVAS_W - 20, 48);
      }
    }

    // ── 6. Idle Prompt ───────────────────────────────────────────────────────
    if (state === 'idle') {
      ctx.fillStyle = 'rgba(252, 122, 0, 0.75)';
      ctx.font      = '14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Space / ↑ to Jump  ·  ↓ to Duck', CANVAS_W / 2, GROUND_Y - 15);
    }

    // ── 7. Game Over Screen ──────────────────────────────────────────────────
    if (state === 'dead') {
      // Update high score
      const finalScore = Math.floor(scoreRef.current / 6);
      if (finalScore > sessionHighScore) sessionHighScore = finalScore;

      // Dim overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      ctx.textAlign = 'center';

      // "GAME OVER" title
      ctx.fillStyle = '#fc7a00';
      ctx.font      = 'bold 30px monospace';
      ctx.fillText('GAME OVER', CANVAS_W / 2, CANVAS_H / 2 - 25);

      // Score + high score + restart hint
      ctx.font      = '15px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(
        `Score: ${finalScore}  ·  Best: ${sessionHighScore}  —  Space to Restart`,
        CANVAS_W / 2,
        CANVAS_H / 2 + 8
      );
    }

    // ── 8. Schedule Next Frame ───────────────────────────────────────────────
    rafIdRef.current = requestAnimationFrame(gameLoop);
  }, [canvasRef]);

  // ── STEP 5: Handle Jump / Start / Restart events ──────────────────────────
  // DinoGame.jsx dispatches a custom 'dinoJump' event when the user presses
  // Space or ↑ (or taps the canvas on mobile).
  useEffect(() => {
    const handleJump = () => {
      const state = gameStateRef.current;

      if (state === 'idle') {
        // First press: start the game AND jump (matches Chrome Dino feel)
        gameStateRef.current             = 'running';
        playerRef.current.velocityY      = JUMP_FORCE;
        playerRef.current.isOnGround     = false;
        return;
      }

      if (state === 'running' && playerRef.current.isOnGround) {
        // Mid-game: jump only if standing on the ground (no double jumps)
        playerRef.current.velocityY  = JUMP_FORCE;
        playerRef.current.isOnGround = false;
        return;
      }

      if (state === 'dead') {
        // Restart: reset all mutable state back to initial values
        scoreRef.current         = 0;
        frameTickRef.current     = 0;
        obstaclesRef.current     = [];
        gameSpeedRef.current     = SPEED_INITIAL;
        nextGapRef.current       = GAP_MIN;
        playerRef.current        = makePlayer();
        gameStateRef.current     = 'running';
        isDuckingRef.current     = false;
      }
    };

    const handleDuck = (e) => {
      isDuckingRef.current = e.detail;
    };

    window.addEventListener('dinoJump', handleJump);
    window.addEventListener('dinoDuck', handleDuck);
    return () => {
      window.removeEventListener('dinoJump', handleJump);
      window.removeEventListener('dinoDuck', handleDuck);
    };
  }, []);

  // ── STEP 5: Start/Stop RAF loop when assets are ready ─────────────────────
  useEffect(() => {
    if (!assetsLoaded) return;

    // Kick off the loop
    rafIdRef.current = requestAnimationFrame(gameLoop);

    // Cleanup: cancel the loop when the component unmounts
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [assetsLoaded, gameLoop]);

  return { assetsLoaded, loadError, imagesRef };
};

export default useGameEngine;
