import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { GameState, PhysicsConfig, PipeEntity, BirdState, Perk, Rarity, BossState, Projectile, DamageOrb, DifficultyConfig } from '../types';
import { sounds, setMuted } from '../src/services/audioService';
import { 
  GAME_WIDTH, 
  GAME_HEIGHT, 
  INITIAL_PHYSICS, 
  BIRD_SIZE, 
  PIPE_WIDTH, 
  GROUND_HEIGHT, 
  AVAILABLE_PERKS, 
  LEVEL_UP_XP_REQ,
  PIPE_POOL_SIZE,
  PROJECTILE_POOL_SIZE,
  DAMAGE_ORB_POOL_SIZE,
  ORB_SIZE,
  BOSS_SIZE,
  BOSS_SPAWN_LEVEL_INTERVAL,
  PROJECTILE_SIZE,
  DAMAGE_ORB_SIZE,
  DIFFICULTIES
} from '../constants';

const GameEngine: React.FC = () => {
  // --- React State (UI Only) ---
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyConfig>(DIFFICULTIES[0]); // Default to Normal
  const [score, setScore] = useState(0);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [highScore, setHighScore] = useState(0);
  const [soulOrbs, setSoulOrbs] = useState(0); // Persistent currency
  const [isMuted, setIsMuted] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [activePerks, setActivePerks] = useState<Perk[]>([]);
  const [offeredPerks, setOfferedPerks] = useState<Perk[]>([]);
  const [currentHp, setCurrentHp] = useState(1);
  const [maxHp, setMaxHp] = useState(1);
  const [countdown, setCountdown] = useState(3);
  const [revives, setRevives] = useState(0);
  const [shieldCharges, setShieldCharges] = useState(0);
  
  // UI State for Boss
  const [showBossWarning, setShowBossWarning] = useState(false);
  const [bossHpUi, setBossHpUi] = useState({ current: 0, max: 0, visible: false });

  // --- Refs (Physics & Direct DOM Access) ---
  const birdRef = useRef<BirdState>({ 
    y: GAME_HEIGHT / 2, 
    velocity: 0, 
    rotation: 0, 
    scale: 1, 
    hp: 1, 
    maxHp: 1, 
    isInvulnerable: false, 
    invulnTimer: 0,
    revives: 0,
    shieldCharges: 0
  });

  const bossRef = useRef<BossState>({
    active: false,
    incoming: false,
    isDying: false,
    deathTimer: 0,
    x: GAME_WIDTH + 200,
    y: GAME_HEIGHT / 2,
    hp: 10,
    maxHp: 10,
    attackTimer: 0,
    orbTimer: 0,
    phase: 0,
    flashTimer: 0
  });
  
  const physicsConfigRef = useRef<PhysicsConfig>({ ...INITIAL_PHYSICS });
  const pipesRef = useRef<PipeEntity[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const damageOrbsRef = useRef<DamageOrb[]>([]);
  
  const frameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const activePerksRef = useRef<Set<string>>(new Set()); // Faster lookups

  // DOM Refs (For direct manipulation without React render)
  const birdDomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pipePoolRefs = useRef<(HTMLDivElement | null)[]>([]); // Array of refs to pipe elements
  const bossDomRef = useRef<HTMLDivElement>(null);
  
  // Pooling Refs for Boss items (Optimization)
  const projectilePoolRefs = useRef<(HTMLDivElement | null)[]>([]);
  const damageOrbPoolRefs = useRef<(HTMLDivElement | null)[]>([]);

  // --- Engine Logic ---

  // Load values from LocalStorage on mount
  useEffect(() => {
    const savedHighScore = localStorage.getItem('flappy_rogue_highscore');
    const savedSoulOrbs = localStorage.getItem('flappy_rogue_soulorbs');
    if (savedHighScore) setHighScore(parseInt(savedHighScore));
    if (savedSoulOrbs) setSoulOrbs(parseInt(savedSoulOrbs));

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  // Save High Score
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('flappy_rogue_highscore', score.toString());
    }
  }, [score, highScore]);

  // Save Soul Orbs
  useEffect(() => {
    localStorage.setItem('flappy_rogue_soulorbs', soulOrbs.toString());
  }, [soulOrbs]);

  const toggleMute = () => {
    const nextValue = !isMuted;
    setIsMuted(nextValue);
    setMuted(nextValue);
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  // Handle Countdown Logic for Resuming
  useEffect(() => {
    if (gameState === GameState.RESUMING) {
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setGameState(GameState.PLAYING);
            lastTimeRef.current = performance.now(); // Optimization: Reset delta to prevent physics jumps
            return 3;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameState]);

  const resetGame = () => {
    birdRef.current = { 
      y: GAME_HEIGHT / 2, 
      velocity: 0, 
      rotation: 0, 
      scale: 1, 
      hp: 1, 
      maxHp: 1, 
      isInvulnerable: false, 
      invulnTimer: 0,
      revives: 0,
      shieldCharges: 0
    };
    pipesRef.current = [];
    projectilesRef.current = [];
    damageOrbsRef.current = [];
    
    // Reset Boss
    bossRef.current = {
      active: false,
      incoming: false,
      isDying: false,
      deathTimer: 0,
      x: GAME_WIDTH + 200,
      y: GAME_HEIGHT / 2,
      hp: 10,
      maxHp: 10,
      attackTimer: 0,
      orbTimer: 0,
      phase: 0,
      flashTimer: 0
    };

    // Re-apply physics from selected difficulty
    physicsConfigRef.current = { ...selectedDifficulty.physics };
    activePerksRef.current.clear();
    
    // Reset Pool Styles
    pipePoolRefs.current.forEach(el => {
      if (el) el.style.transform = `translate3d(-200px, 0, 0)`;
    });
    projectilePoolRefs.current.forEach(el => {
      if (el) el.style.display = 'none';
    });
    damageOrbPoolRefs.current.forEach(el => {
      if (el) el.style.display = 'none';
    });

    setScore(0);
    setXp(0);
    setLevel(1);
    setActivePerks([]);
    setCurrentHp(1);
    setMaxHp(1);
    setRevives(0);
    setShieldCharges(0);
    setShowBossWarning(false);
    setBossHpUi({ current: 0, max: 0, visible: false });
    // Go to Start instead of Menu on reset for quicker retry
    setGameState(GameState.START);
  };

  // --- Logic Helpers ---

  const spawnPipe = (offset: number) => {
    // If boss is active or incoming, DO NOT spawn pipes
    if (bossRef.current.active || bossRef.current.incoming) return;

    const usedIndices = new Set(pipesRef.current.map(p => p.poolIndex));
    let poolIndex = -1;
    for (let i = 0; i < PIPE_POOL_SIZE; i++) {
      if (!usedIndices.has(i)) {
        poolIndex = i;
        break;
      }
    }
    if (poolIndex === -1) return;

    const config = physicsConfigRef.current;
    const minPipeHeight = 50;
    const maxPipeHeight = GAME_HEIGHT - GROUND_HEIGHT - config.gapSize - minPipeHeight;
    const randomHeight = Math.floor(Math.random() * (maxPipeHeight - minPipeHeight + 1)) + minPipeHeight;
    
    const orbChance = activePerksRef.current.has('asa_ima') ? 0.6 : 0.3;
    const hasOrb = Math.random() < orbChance;
    const orbY = randomHeight + (config.gapSize / 2) - (ORB_SIZE / 2);

    pipesRef.current.push({
      id: Date.now() + Math.random(),
      x: offset,
      topHeight: randomHeight,
      passed: false,
      poolIndex,
      hasOrb,
      orbY,
      orbCollected: false
    });
  };

  const spawnDamageOrb = () => {
     if (damageOrbsRef.current.length >= DAMAGE_ORB_POOL_SIZE) return;
     
     const y = Math.random() * (GAME_HEIGHT - GROUND_HEIGHT - 100) + 50;
     damageOrbsRef.current.push({
       id: Date.now() + Math.random(),
       x: GAME_WIDTH + 50,
       y: y,
       collected: false
     });
  };

  const spawnProjectile = (type: 'fireball' | 'wave') => {
     // Hard limit on projectiles to prevent performance issues
     if (projectilesRef.current.length >= PROJECTILE_POOL_SIZE - 3) return;
     sounds.bossAttack();

     const boss = bossRef.current;
     const bird = birdRef.current;
     
     // Aim at bird
     const dx = (GAME_WIDTH / 2) - (boss.x + BOSS_SIZE/2);
     const dy = bird.y - (boss.y + BOSS_SIZE/2);
     const dist = Math.sqrt(dx*dx + dy*dy);
     
     const speed = 6;
     const vx = (dx / dist) * speed;
     const vy = (dy / dist) * speed;

     projectilesRef.current.push({
       id: Date.now() + Math.random(),
       x: boss.x,
       y: boss.y + BOSS_SIZE/2,
       vx,
       vy,
       type
     });

     // Spread shot for high levels
     if (type === 'wave' || level > 10) {
        projectilesRef.current.push({
          id: Date.now() + Math.random() + 1,
          x: boss.x,
          y: boss.y + BOSS_SIZE/2,
          vx: vx,
          vy: vy - 2,
          type
        });
        projectilesRef.current.push({
          id: Date.now() + Math.random() + 2,
          x: boss.x,
          y: boss.y + BOSS_SIZE/2,
          vx: vx,
          vy: vy + 2,
          type
        });
     }
  };

  const triggerInvulnerability = () => {
    const bird = birdRef.current;
    bird.isInvulnerable = true;
    const duration = activePerksRef.current.has('voo_fantasma') ? 120 : 60;
    bird.invulnTimer = duration;
    
    if (birdDomRef.current) {
      birdDomRef.current.style.filter = 'brightness(500%) sepia(100%) hue-rotate(-50deg) saturate(600%)';
      setTimeout(() => {
        if (birdDomRef.current) birdDomRef.current.style.filter = 'none';
      }, 200);
    }
  };

  const takeDamage = () => {
    const bird = birdRef.current;
    if (bird.isInvulnerable) return;

    // Perk: Manto de Vento (Chance to dodge)
    if (activePerksRef.current.has('manto_vento')) {
      if (Math.random() < 0.15) {
        triggerInvulnerability();
        return;
      }
    }

    // Perk: Escudo Reluzente / Divine Shield logic
    if (bird.shieldCharges > 0) {
      bird.shieldCharges -= 1;
      setShieldCharges(bird.shieldCharges);
      triggerInvulnerability();
      return;
    }

    if (bird.revives > 0) {
      bird.revives -= 1;
      setRevives(bird.revives);
      triggerInvulnerability();
      bird.velocity = physicsConfigRef.current.jumpStrength * 1.5;
      return;
    }

    // Perk: Vingança de Gaia
    if (activePerksRef.current.has('vinganca_gaia')) {
      if (bossRef.current.active) {
        damageBoss(10);
      }
      projectilesRef.current = []; // Clear projectiles
    }

    bird.hp -= 1;
    setCurrentHp(bird.hp);
    sounds.damage();

    if (bird.hp <= 0) {
      setGameState(GameState.GAME_OVER);
      sounds.gameOver();
      setHighScore(prev => Math.max(prev, score));
    } else {
      triggerInvulnerability();
    }
  };

  const damageBoss = (amount: number = 1) => {
    const boss = bossRef.current;
    if (boss.isDying) return;

    boss.hp -= amount;
    if (boss.hp < 0) boss.hp = 0;
    
    if (boss.hp <= 0) {
      sounds.bossDefeat();
    } else {
      sounds.bossHit();
    }

    boss.flashTimer = 15; // Visual flash (longer)
    setBossHpUi(prev => ({ ...prev, current: boss.hp }));

    if (boss.hp <= 0) {
      // Start Death Sequence
      boss.isDying = true;
      boss.deathTimer = 60; // 1 second @ 60fps
      setBossHpUi(prev => ({ ...prev, visible: false }));
      
      // Massive XP Reward
      gainXp(50); 
      setSoulOrbs(prev => prev + 5); 
    }
  };

  const gainXp = (amount: number) => {
    const multiplier = (activePerksRef.current.has('dobra_do_vento') ? 2 : 1) * 
                       (activePerksRef.current.has('motor_warp') ? 4 : 1) *
                       (activePerksRef.current.has('xp_extra') ? 1.5 : 1);
    
    const finalAmount = amount * multiplier;

    setXp(prev => {
      const nextXp = prev + finalAmount;
      if (nextXp >= LEVEL_UP_XP_REQ) {
        sounds.levelUp();
        requestAnimationFrame(() => {
           setGameState(GameState.LEVEL_UP);
           
           const allowedRarities: Set<Rarity> = new Set(['common', 'uncommon', 'rare']);
           if (score >= 10) allowedRarities.add('epic');
           if (score >= 20) allowedRarities.add('mythic');
           if (score >= 30) {
             allowedRarities.add('legendary');
             allowedRarities.add('mystic');
           }

           const available = AVAILABLE_PERKS.filter(p => {
             if (!allowedRarities.has(p.rarity)) return false;
             if (activePerksRef.current.has(p.id)) {
                const stackableIds = ['eco_do_vento', 'choque_retorno', 'filtro_caos', 'caminho_seguro', 'realidade_flexivel'];
                if (!stackableIds.includes(p.id)) return false;
             }
             return true;
           });

           const shuffled = [...available].sort(() => 0.5 - Math.random());
           setOfferedPerks(shuffled.slice(0, 3));
        });
        return 0;
      }
      return nextXp;
    });
  };

  const selectPerk = (perk: Perk) => {
    sounds.perkSelect();
    setActivePerks(prev => [...prev, perk]);
    activePerksRef.current.add(perk.id);

    if (perk.apply) {
      physicsConfigRef.current = perk.apply(physicsConfigRef.current);
    }

    if (perk.id === 'bico_afiado') birdRef.current.scale = 0.95;
    if (perk.id === 'asa_quantica') birdRef.current.scale = 0.6;
    
    if (perk.id === 'eco_do_vento') { 
      birdRef.current.maxHp += 1;
      birdRef.current.hp += 1;
      setMaxHp(prev => prev + 1);
      setCurrentHp(prev => prev + 1);
    }
    if (perk.id === 'caminho_seguro') {
      birdRef.current.maxHp += 5;
      birdRef.current.hp += 5;
      setMaxHp(prev => prev + 5);
      setCurrentHp(prev => prev + 5);
    }
    
    let addedRevives = 0;
    if (perk.id === 'choque_retorno') addedRevives = 1;
    if (perk.id === 'filtro_caos') addedRevives = 2;
    if (perk.id === 'fenix') addedRevives = 1;
    if (perk.id === 'realidade_flexivel') addedRevives = 5;

    if (addedRevives > 0) {
      birdRef.current.revives += addedRevives;
      setRevives(prev => prev + addedRevives);
    }

    if (perk.id === 'escudo_reluzente') {
      birdRef.current.shieldCharges = Math.min(birdRef.current.shieldCharges + 1, 3);
      setShieldCharges(birdRef.current.shieldCharges);
    }

    if (activePerksRef.current.has('sopro_vida')) {
      if (birdRef.current.hp < birdRef.current.maxHp) {
        birdRef.current.hp += 1;
        setCurrentHp(birdRef.current.hp);
      }
    }

    setLevel(l => {
      const nextLevel = l + 1;
      
      // Check for Boss Spawn on Level Up
      if (nextLevel % BOSS_SPAWN_LEVEL_INTERVAL === 0 && !bossRef.current.active) {
         bossRef.current.incoming = true;
         setShowBossWarning(true);
         setTimeout(() => setShowBossWarning(false), 3000);
      }
      return nextLevel;
    });
    
    if (activePerksRef.current.has('eco_defensivo')) {
       triggerInvulnerability();
    }

    setCountdown(3); // Reset timer explicitly
    setGameState(GameState.RESUMING);
  };

  const jump = useCallback((e?: React.SyntheticEvent | Event) => {
    if (e && e.target instanceof Element && (e.target.tagName === 'BUTTON' || e.target.closest('button'))) return;

    if (gameState === GameState.PLAYING) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      
      const config = physicsConfigRef.current;
      sounds.jump();
      if (activePerksRef.current.has('pulo_quantizado')) {
        birdRef.current.velocity = config.jumpStrength;
      } else {
        birdRef.current.velocity = config.jumpStrength;
      }
      
    } else if (gameState === GameState.START) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      setGameState(GameState.PLAYING);
      sounds.jump();
      birdRef.current.velocity = physicsConfigRef.current.jumpStrength;
      lastTimeRef.current = performance.now();
    }
  }, [gameState]);

  // --- Main Update Loop ---
  const update = useCallback((time: number) => {
    const delta = time - lastTimeRef.current;
    lastTimeRef.current = time;
    const dt = Math.min(delta / 16.67, 2.0); 

    if (gameState === GameState.MENU) {
      // Just hover the bird
      const hoverY = (GAME_HEIGHT / 2) + Math.sin(time / 400) * 15;
      if (birdDomRef.current) {
        birdDomRef.current.style.transform = `translate3d(${(GAME_WIDTH/2) - (BIRD_SIZE/2)}px, ${hoverY}px, 0) rotate(0deg)`;
      }
      frameRef.current = requestAnimationFrame(update);
      return;
    }

    if (gameState === GameState.START) {
      const hoverY = (GAME_HEIGHT / 2) + Math.sin(time / 300) * 12;
      if (birdDomRef.current) {
        birdDomRef.current.style.transform = `translate3d(${(GAME_WIDTH/2) - (BIRD_SIZE/2)}px, ${hoverY}px, 0) rotate(0deg)`;
      }
      frameRef.current = requestAnimationFrame(update);
      return;
    }

    if (gameState === GameState.RESUMING) {
       if (birdDomRef.current) {
          birdDomRef.current.style.transform = 
            `translate3d(${Math.round((GAME_WIDTH/2) - (BIRD_SIZE/2))}px, ${Math.round(birdRef.current.y - (BIRD_SIZE/2))}px, 0) ` + 
            `rotate(${Math.round(birdRef.current.rotation)}deg) scale(${birdRef.current.scale})`;
       }
       frameRef.current = requestAnimationFrame(update);
       return;
    }

    if (gameState !== GameState.PLAYING) return;

    const config = physicsConfigRef.current;
    const bird = birdRef.current;
    const pipes = pipesRef.current;
    const boss = bossRef.current;

    // 1. Bird Physics
    bird.velocity += config.gravity * dt;
    bird.y += bird.velocity * dt;
    
    if (bird.y >= GAME_HEIGHT - GROUND_HEIGHT - (BIRD_SIZE * bird.scale / 2)) {
      bird.y = GAME_HEIGHT - GROUND_HEIGHT - (BIRD_SIZE * bird.scale / 2);
      takeDamage();
      if (bird.hp > 0 || bird.revives > 0) bird.velocity = config.jumpStrength * 1.2;
    }
    if (bird.y < 0) {
      bird.y = 0;
      bird.velocity = 0;
    }
    if (bird.isInvulnerable) {
      bird.invulnTimer -= dt;
      if (bird.invulnTimer <= 0) bird.isInvulnerable = false;
    }
    bird.rotation = Math.min(Math.max(bird.velocity * 3.5, -25), 90);

    // 2. Boss Logic
    if (boss.incoming) {
       // Wait for pipes to clear
       if (pipes.length === 0) {
          boss.active = true;
          boss.incoming = false;
          // Apply difficulty boss HP multiplier
          const baseBossHp = 10 + (level * 2);
          boss.hp = Math.ceil(baseBossHp * selectedDifficulty.bossHpMultiplier);
          boss.maxHp = boss.hp;
          boss.isDying = false;
          setBossHpUi({ current: boss.hp, max: boss.maxHp, visible: true });
       }
    }

    if (boss.active) {
       // Move Boss (Hover Sine Wave)
       if (!boss.isDying) {
          boss.y = (GAME_HEIGHT / 2) + Math.sin(time / 500) * 150;
          
          // Entry Animation
          if (boss.x > GAME_WIDTH - 150) {
              boss.x -= 5 * dt;
          }

          // Attack Logic
          boss.attackTimer -= dt;
          if (boss.attackTimer <= 0) {
              spawnProjectile(Math.random() > 0.5 ? 'fireball' : 'wave');
              boss.attackTimer = 100 - (Math.min(level, 30) * 2); // Shoot faster at higher levels
          }

          // Spawn Damage Orbs
          boss.orbTimer -= dt;
          if (boss.orbTimer <= 0) {
              spawnDamageOrb();
              boss.orbTimer = 120; // Every ~2 seconds
          }
       } else {
          // Death Sequence Logic
          boss.deathTimer -= dt;
          if (boss.deathTimer <= 0) {
             boss.active = false;
             boss.incoming = false;
             boss.isDying = false;
          }
       }

       // Flash Effect Timer
       if (boss.flashTimer > 0) boss.flashTimer -= dt;
    }

    // 3. Projectiles (Boss)
    const birdRadius = (BIRD_SIZE * bird.scale) / 2;
    const birdX = GAME_WIDTH / 2;

    for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
       const proj = projectilesRef.current[i];
       proj.x += proj.vx * dt;
       proj.y += proj.vy * dt;

       // Check collision with bird
       const dx = birdX - proj.x;
       const dy = bird.y - proj.y;
       if (Math.sqrt(dx*dx + dy*dy) < birdRadius + (PROJECTILE_SIZE/2)) {
          if (activePerksRef.current.has('toque_midas')) {
             gainXp(2);
             projectilesRef.current.splice(i, 1);
          } else {
             takeDamage();
             projectilesRef.current.splice(i, 1);
          }
          continue;
       }

       // Remove off screen
       if (proj.x < -50 || proj.y < -50 || proj.y > GAME_HEIGHT) {
          projectilesRef.current.splice(i, 1);
       }
    }

    // 4. Damage Orbs (Red Orbs)
    for (let i = damageOrbsRef.current.length - 1; i >= 0; i--) {
       const orb = damageOrbsRef.current[i];
       orb.x -= config.pipeSpeed * dt; // Move left with world speed

       // Check Collision
       const dx = birdX - orb.x;
       const dy = bird.y - orb.y;
       if (Math.sqrt(dx*dx + dy*dy) < birdRadius + (DAMAGE_ORB_SIZE/2)) {
          const damage = activePerksRef.current.has('cacador_boss') ? 2 : 1;
          damageBoss(damage);
          damageOrbsRef.current.splice(i, 1);
          continue;
       }

       if (orb.x < -50) {
          damageOrbsRef.current.splice(i, 1);
       }
    }

    // 5. Pipe Management
    const lastPipe = pipes[pipes.length - 1];
    const spawnDist = config.spawnRate;
    if (!lastPipe || (GAME_WIDTH - lastPipe.x) > spawnDist) {
      spawnPipe(GAME_WIDTH);
    }

    for (let i = pipes.length - 1; i >= 0; i--) {
      const p = pipes[i];
      p.x -= config.pipeSpeed * dt;

      // Magnet Logic
      if (p.hasOrb && !p.orbCollected && (activePerksRef.current.has('asa_ima') || activePerksRef.current.has('tornado_xp'))) {
         const dx = (GAME_WIDTH / 2) - (p.x + PIPE_WIDTH/2);
         const dy = bird.y - p.orbY;
         const dist = Math.sqrt(dx*dx + dy*dy);
         const magnetRange = activePerksRef.current.has('tornado_xp') ? 600 : 300;
         if (dist < magnetRange) { 
            const moveSpeed = activePerksRef.current.has('tornado_xp') ? 0.35 : 0.15;
            p.orbY += (dy) * moveSpeed * dt;
            p.x += (dx * (activePerksRef.current.has('tornado_xp') ? 0.1 : 0.05)) * dt; 
         }
      }

      if (p.x + PIPE_WIDTH < -50) {
        const domEl = pipePoolRefs.current[p.poolIndex];
        if (domEl) domEl.style.transform = `translate3d(-200px, 0, 0)`;
        pipes.splice(i, 1);
        continue;
      }

      // Collisions
      const birdLeft = birdX - birdRadius + 4;
      const birdRight = birdX + birdRadius - 4;
      const birdTop = bird.y - birdRadius + 4;
      const birdBottom = bird.y + birdRadius - 4;
      const pipeLeft = p.x;
      const pipeRight = p.x + PIPE_WIDTH;

      if (birdRight > pipeLeft && birdLeft < pipeRight) {
        const hitTop = birdTop < p.topHeight;
        const hitBottom = birdBottom > (p.topHeight + config.gapSize);
        if (hitTop || hitBottom) takeDamage();
      }

      if (p.hasOrb && !p.orbCollected) {
         const orbX = p.x + (PIPE_WIDTH/2);
         const orbY = p.orbY;
         const dx = birdX - orbX;
         const dy = bird.y - orbY;
         if (Math.sqrt(dx*dx + dy*dy) < (BIRD_SIZE + ORB_SIZE)/2) {
            p.orbCollected = true;
            sounds.orb();
            gainXp(1);
         }
      }

      if (!p.passed && p.x + PIPE_WIDTH < birdLeft) {
        p.passed = true;
        if (activePerksRef.current.has('celulas_vibratorias') && score > 0 && score % 10 === 0) gainXp(5);
        
        let points = 1;
        if (activePerksRef.current.has('motor_warp')) points = 4;
        else if (activePerksRef.current.has('dobra_do_vento')) points = 2;
        
        const prevScore = score;
        const newScore = score + points;
        
        // Perk: Coração Valente (Heal every 10 points)
        if (activePerksRef.current.has('coracao_valente')) {
          if (Math.floor(newScore / 10) > Math.floor(prevScore / 10)) {
            if (bird.hp < bird.maxHp) {
              bird.hp += 1;
              setCurrentHp(bird.hp);
            }
          }
        }

        // Perk: Escudo Reluzente (Shield every 15 points)
        if (activePerksRef.current.has('escudo_reluzente')) {
          if (Math.floor(newScore / 15) > Math.floor(prevScore / 15)) {
            if (bird.shieldCharges < 3) {
              bird.shieldCharges += 1;
              setShieldCharges(bird.shieldCharges);
            }
          }
        }

        setScore(newScore);
        gainXp(1);

        if (activePerksRef.current.has('espectro_aco')) {
           const birdState = birdRef.current;
           birdState.isInvulnerable = true;
           birdState.invulnTimer = 90; // 1.5s
        }
      }
    }

    // --- Render Updates ---
    
    // Bird
    if (birdDomRef.current) {
      birdDomRef.current.style.transform = 
        `translate3d(${Math.round((GAME_WIDTH/2) - (BIRD_SIZE/2))}px, ${Math.round(bird.y - (BIRD_SIZE/2))}px, 0) ` + 
        `rotate(${Math.round(bird.rotation)}deg) scale(${bird.scale})`;
      
      birdDomRef.current.style.opacity = bird.isInvulnerable && Math.floor(time / 100) % 2 === 0 ? '0.5' : '1';
      birdDomRef.current.style.filter = bird.isInvulnerable ? 'sepia(1) hue-rotate(90deg)' : 'none';
    }

    // Boss Render Logic
    if (bossDomRef.current) {
       if (boss.active) {
          bossDomRef.current.style.display = 'flex';
          
          let bossScale = 1;
          let bossRotation = 0;
          let bossFilter = 'none';
          let bossShakeX = 0;
          let bossShakeY = 0;

          // Death Animation
          if (boss.isDying) {
             const progress = 1 - (boss.deathTimer / 60);
             bossScale = 1 - progress;
             bossRotation = progress * 720;
             bossFilter = `grayscale(${progress}) brightness(${1 + progress * 2})`;
          } 
          else {
             // Attack Charge Telegraph
             if (boss.attackTimer < 30) {
                bossScale = 1.0 + Math.sin(time / 20) * 0.1; // Pulse fast
                bossFilter = 'brightness(1.5) sepia(0.5)';
             }

             // Hit Shake
             if (boss.flashTimer > 0) {
                bossShakeX = (Math.random() * 20) - 10;
                bossShakeY = (Math.random() * 20) - 10;
                bossFilter = 'brightness(2) saturate(3) hue-rotate(-50deg)'; // Red flash
             }
          }
          
          bossDomRef.current.style.transform = `translate3d(${boss.x + bossShakeX}px, ${boss.y + bossShakeY}px, 0) scale(${bossScale}) rotate(${bossRotation}deg)`;
          bossDomRef.current.style.filter = bossFilter;

       } else {
          bossDomRef.current.style.display = 'none';
       }
    }

    // Render Projectiles (POOLING OPTIMIZATION)
    projectilesRef.current.forEach((proj, i) => {
       if (i < PROJECTILE_POOL_SIZE) {
          const el = projectilePoolRefs.current[i];
          if (el) {
             el.style.display = 'block';
             el.style.transform = `translate3d(${proj.x}px, ${proj.y}px, 0)`;
          }
       }
    });
    // Hide unused projectiles
    for (let i = projectilesRef.current.length; i < PROJECTILE_POOL_SIZE; i++) {
       const el = projectilePoolRefs.current[i];
       if (el) el.style.display = 'none';
    }

    // Render Damage Orbs (POOLING OPTIMIZATION)
    damageOrbsRef.current.forEach((orb, i) => {
       if (i < DAMAGE_ORB_POOL_SIZE) {
          const el = damageOrbPoolRefs.current[i];
          if (el) {
             el.style.display = 'flex';
             el.style.transform = `translate3d(${orb.x}px, ${orb.y}px, 0)`;
          }
       }
    });
    // Hide unused orbs
    for (let i = damageOrbsRef.current.length; i < DAMAGE_ORB_POOL_SIZE; i++) {
       const el = damageOrbPoolRefs.current[i];
       if (el) el.style.display = 'none';
    }

    // Pipes
    pipes.forEach(p => {
      const el = pipePoolRefs.current[p.poolIndex];
      if (el) {
        el.style.transform = `translate3d(${Math.round(p.x)}px, 0, 0)`;
        if (el.dataset.lastId !== String(p.id)) {
           el.dataset.lastId = String(p.id);
           const topPipe = el.firstElementChild as HTMLElement;
           if (topPipe) topPipe.style.height = `${p.topHeight}px`;

           const bottomPipe = el.lastElementChild?.previousElementSibling as HTMLElement;
           if (bottomPipe) {
             bottomPipe.style.top = `${p.topHeight + config.gapSize}px`;
             bottomPipe.style.height = `${GAME_HEIGHT - GROUND_HEIGHT - (p.topHeight + config.gapSize)}px`;
           }
           const orb = el.querySelector('.orb') as HTMLElement;
           if (orb) {
              orb.style.display = p.hasOrb ? 'block' : 'none';
              orb.style.top = `${p.orbY}px`;
           }
        }
        if (p.orbCollected) {
           const orb = el.querySelector('.orb') as HTMLElement;
           if (orb) orb.style.display = 'none';
        } else if (p.hasOrb && activePerksRef.current.has('asa_ima')) {
           const orb = el.querySelector('.orb') as HTMLElement;
           if (orb) orb.style.top = `${p.orbY}px`;
        }
      }
    });

    frameRef.current = requestAnimationFrame(update);
  }, [gameState, score, level, selectedDifficulty]);

  useEffect(() => {
    if (gameState === GameState.PLAYING || gameState === GameState.START || gameState === GameState.RESUMING || gameState === GameState.MENU) {
      lastTimeRef.current = performance.now();
      frameRef.current = requestAnimationFrame(update);
    }
    return () => cancelAnimationFrame(frameRef.current);
  }, [gameState, update]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space') jump(e);
    };
    window.addEventListener('keydown', handler);
    window.addEventListener('touchstart', jump as any, { passive: false });
    window.addEventListener('mousedown', jump as any);

    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('touchstart', jump as any);
      window.removeEventListener('mousedown', jump as any);
    };
  }, [jump]);

  const pipePool = useMemo(() => {
    return Array.from({ length: PIPE_POOL_SIZE }).map((_, i) => i);
  }, []);

  const projectilePool = useMemo(() => {
    return Array.from({ length: PROJECTILE_POOL_SIZE }).map((_, i) => i);
  }, []);

  const damageOrbPool = useMemo(() => {
    return Array.from({ length: DAMAGE_ORB_POOL_SIZE }).map((_, i) => i);
  }, []);

  const getRarityColor = (r: Rarity) => {
    switch(r) {
      case 'common': return 'bg-slate-200 border-slate-400 text-slate-900';
      case 'uncommon': return 'bg-green-100 border-green-500 text-green-900';
      case 'rare': return 'bg-blue-100 border-blue-500 text-blue-900';
      case 'epic': return 'bg-purple-100 border-purple-500 text-purple-900';
      case 'mythic': return 'bg-rose-100 border-rose-500 text-rose-900';
      case 'legendary': return 'bg-amber-100 border-amber-500 text-amber-900';
      case 'mystic': return 'bg-cyan-100 border-cyan-500 text-cyan-900';
      default: return 'bg-white';
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-slate-950 font-mono select-none">
      
      <div 
        ref={containerRef}
        className="relative w-full h-full"
        style={{ width: GAME_WIDTH, height: GAME_HEIGHT, background: 'linear-gradient(to bottom, #4facfe 0%, #00f2fe 100%)' }}
      >
        <div className="absolute top-[10%] left-[5%] opacity-50 text-white text-6xl pointer-events-none">☁️</div>
        <div className="absolute top-[20%] left-[40%] opacity-40 text-white text-5xl pointer-events-none">☁️</div>

        {/* Static Pipe Pool */}
        {pipePool.map((i) => (
          <div
            key={i}
            ref={el => { pipePoolRefs.current[i] = el; }}
            className="absolute top-0 left-0 w-full h-full pointer-events-none will-change-transform"
            style={{ transform: 'translate3d(-200px, 0, 0)' }}
          >
            <div className="absolute left-0 top-0 bg-green-500 border-x-4 border-b-4 border-green-800 transition-none w-[52px]">
               <div className="absolute bottom-0 left-[-4px] w-[calc(100%+8px)] h-6 bg-green-500 border-4 border-green-800"></div>
            </div>
            <div className="absolute left-0 bg-green-500 border-x-4 border-t-4 border-green-800 transition-none w-[52px]">
               <div className="absolute top-0 left-[-4px] w-[calc(100%+8px)] h-6 bg-green-500 border-4 border-green-800"></div>
            </div>
            <div className="orb absolute left-[14px] w-6 h-6 rounded-full bg-yellow-300 border-2 border-yellow-500 shadow-[0_0_10px_rgba(253,224,71,0.8)] animate-pulse hidden z-10"></div>
          </div>
        ))}
        
        {/* Boss DOM Structure - Enhanced */}
        <div 
           ref={bossDomRef}
           className="absolute top-0 left-0 z-20 flex items-center justify-center will-change-transform hidden"
           style={{ width: BOSS_SIZE, height: BOSS_SIZE }}
        >
           {/* Boss Aura */}
           <div className="absolute w-[120%] h-[120%] border-4 border-dashed border-red-500 rounded-full animate-spin opacity-50"></div>
           <div className="absolute w-[140%] h-[140%] border-2 border-dashed border-red-900 rounded-full animate-spin opacity-30" style={{ animationDirection: 'reverse' }}></div>
           
           {/* Boss Sprite */}
           <div className="text-9xl filter drop-shadow-[0_0_25px_red] z-10">👹</div>
        </div>

        {/* Projectile Pool (Optimization) */}
        {projectilePool.map((i) => (
           <div 
              key={`proj-${i}`}
              ref={el => { projectilePoolRefs.current[i] = el; }}
              className="absolute rounded-full bg-orange-500 border-2 border-red-600 shadow-lg pointer-events-none z-20 will-change-transform hidden"
              style={{ width: PROJECTILE_SIZE, height: PROJECTILE_SIZE }}
           />
        ))}

        {/* Damage Orb Pool (Optimization) */}
        {damageOrbPool.map((i) => (
           <div 
              key={`dmg-${i}`}
              ref={el => { damageOrbPoolRefs.current[i] = el; }}
              className="absolute rounded-full bg-red-600 border-2 border-red-900 shadow-[0_0_15px_red] animate-pulse flex items-center justify-center text-xs font-bold text-white pointer-events-none z-20 will-change-transform hidden"
              style={{ width: DAMAGE_ORB_SIZE, height: DAMAGE_ORB_SIZE }}
           >
              DMG
           </div>
        ))}

        <div 
          className="absolute bottom-0 w-full bg-[#ded895] border-t-4 border-[#cbb968] z-20"
          style={{ height: GROUND_HEIGHT }}
        >
           <div className="w-full h-4 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzjIHFBMkCdYAL4YxAHLAAAYDBQz5/tq+AAAAABJRU5ErkJggg==')] opacity-30 animate-pulse"></div>
        </div>

        <div 
          ref={birdDomRef}
          className="absolute top-0 left-0 z-30 flex items-center justify-center will-change-transform pointer-events-none transition-colors"
          style={{
            width: BIRD_SIZE,
            height: BIRD_SIZE,
            transform: `translate3d(${(GAME_WIDTH/2) - (BIRD_SIZE/2)}px, ${(GAME_HEIGHT/2)}px, 0)`
          }}
        >
          <span className="text-3xl filter drop-shadow-md">🐥</span>
        </div>

        {/* UI Layer */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-40 p-4">
           <div className="absolute top-4 left-4 pointer-events-auto z-50">
              <button 
                onClick={toggleMute}
                className="bg-black/40 p-2 rounded-lg hover:bg-black/60 transition-colors group"
              >
                 <span className="text-xl">{isMuted ? '🔇' : '🔊'}</span>
              </button>
           </div>
           {/* Boss Warning */}
           {showBossWarning && (
              <div className="absolute top-1/4 left-0 w-full text-center animate-pulse z-50">
                 <h2 className="text-6xl text-red-600 font-bold pixel-text drop-shadow-[0_0_10px_black] uppercase">⚠️ BOSS INCOMING ⚠️</h2>
              </div>
           )}

           {/* Boss HP Bar */}
           {bossHpUi.visible && (
              <div className="absolute top-20 left-1/2 -translate-x-1/2 w-3/4 max-w-xl">
                 <div className="flex justify-between text-red-500 font-bold mb-1 pixel-text shadow-black drop-shadow-md">
                    <span>BOSS</span>
                    <span>{bossHpUi.current}/{bossHpUi.max}</span>
                 </div>
                 <div className="h-6 bg-slate-900 border-2 border-red-900 rounded-full overflow-hidden relative">
                    <div 
                       className="h-full bg-red-600 transition-all duration-200"
                       style={{ width: `${(bossHpUi.current / bossHpUi.max) * 100}%` }}
                    />
                 </div>
              </div>
           )}

           <div className="flex justify-between items-start">
              <div className="flex flex-col gap-1">
                 <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold pixel-text text-white drop-shadow-md leading-none">{score}</span>
                    <span className="text-sm bg-black/40 px-2 py-0.5 rounded text-white font-bold">LVL {level}</span>
                 </div>
                 <div className="flex items-center gap-2 mt-1">
                    <div className="text-yellow-400 font-bold text-lg drop-shadow-sm">✨ {soulOrbs}</div>
                    {highScore > 0 && <div className="text-white/60 text-[10px] px-1.5 py-0.5 bg-black/20 rounded">HI: {highScore}</div>}
                    {isOffline && <div className="text-red-400 text-[10px] px-1.5 py-0.5 bg-black/40 rounded animate-pulse uppercase">OFFLINE</div>}
                    {!isOffline && <div className="text-green-400 text-[10px] px-1.5 py-0.5 bg-black/40 rounded uppercase">READY OFFLINE</div>}
                 </div>
                 <div className="flex flex-col mt-2 gap-1">
                    <div className="flex">
                      {Array.from({length: maxHp}).map((_, i) => (
                        <span key={i} className={`text-xl ${i < currentHp ? 'grayscale-0' : 'grayscale opacity-30'}`}>❤️</span>
                      ))}
                    </div>
                    {revives > 0 && (
                      <div className="flex text-yellow-300">
                        {Array.from({length: revives}).map((_, i) => (
                           <span key={i} className="text-xl animate-pulse">✝️</span>
                        ))}
                      </div>
                    )}
                    {shieldCharges > 0 && (
                      <div className="flex text-cyan-300">
                        {Array.from({length: shieldCharges}).map((_, i) => (
                           <span key={i} className="text-xl animate-pulse">🛡️</span>
                        ))}
                      </div>
                    )}
                 </div>
              </div>
              
              <div className="flex flex-col gap-1 items-end max-h-[200px] overflow-hidden">
                 <button 
                  onClick={toggleMute}
                  className="bg-black/40 p-2 rounded-lg hover:bg-black/60 transition-colors mb-2 group pointer-events-auto"
                  title="Toggle Mute"
                 >
                   <span className="text-xl group-hover:scale-110 block transition-transform">
                      {isMuted ? '🔇' : '🔊'}
                   </span>
                 </button>
                 {activePerks.map((p, i) => (
                    <div key={i} className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 backdrop-blur-sm border shadow-sm ${getRarityColor(p.rarity)} border-opacity-50 bg-opacity-80`}>
                       <span>{p.icon}</span>
                       <span className="max-w-[80px] truncate hidden sm:inline">{p.name}</span>
                    </div>
                 ))}
              </div>
           </div>

           <div className="absolute bottom-[50px] left-4 right-4 h-2 bg-black/50 rounded-full overflow-hidden border border-white/20 max-w-3xl mx-auto">
              <div 
                 className="h-full bg-yellow-400 transition-all duration-300"
                 style={{ width: `${(xp / LEVEL_UP_XP_REQ) * 100}%` }}
              ></div>
           </div>
        </div>
        
        {/* Game UI */}

        {gameState === GameState.START && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 z-50 backdrop-blur-[2px]">
            <h1 className="text-6xl md:text-8xl text-yellow-400 font-bold pixel-text mb-4 animate-bounce drop-shadow-[6px_6px_0_#000] text-center">FLAPPY ROGUE</h1>
            <div className="bg-slate-900 text-white p-8 rounded-xl border-4 border-slate-700 shadow-xl text-center min-w-[300px]">
               <p className="text-xl md:text-2xl mb-4 font-bold animate-pulse text-yellow-200">PRESS SPACE TO START</p>
               <div className={`text-xl font-bold mb-4 uppercase ${selectedDifficulty.color}`}>
                  Mode: {selectedDifficulty.name}
               </div>
               <div className="text-lg text-slate-400 space-y-2">
                  <p>❤️ Avoid Pipes</p>
                  <p>🟡 Collect XP Orbs</p>
                  <p>👹 Boss Every 5 Levels</p>
               </div>
               
               {deferredPrompt && (
                 <button 
                   onClick={handleInstallClick}
                   className="mt-6 w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-6 rounded-lg shadow-[0_4px_0_0_rgba(8,145,178,1)] active:shadow-none active:translate-y-1 transition-all flex items-center justify-center gap-2 pointer-events-auto"
                 >
                   <span>📲</span> INSTALAR APP
                 </button>
               )}
            </div>
          </div>
        )}

        {gameState === GameState.RESUMING && (
           <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/20 backdrop-blur-[1px]">
             <span key={countdown} className="text-9xl font-bold text-white pixel-text drop-shadow-[0_0_20px_rgba(0,0,0,0.8)] animate-ping duration-75">
               {countdown}
             </span>
           </div>
        )}

        {gameState === GameState.LEVEL_UP && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 z-50 p-4">
             <h2 className="text-5xl text-white font-bold pixel-text mb-2 drop-shadow-md">LEVEL UP!</h2>
             <p className="text-slate-400 mb-6">Current Score: <span className="text-white font-bold">{score}</span> (Determines Rarity)</p>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-6xl pointer-events-auto px-4">
               {offeredPerks.map(perk => (
                 <button
                   key={perk.id}
                   onClick={() => selectPerk(perk)}
                   className={`
                     relative flex flex-col items-center justify-center text-center gap-2 p-6 rounded-xl border-b-8 active:border-b-0 active:translate-y-2 transition-all group overflow-hidden h-64
                     ${getRarityColor(perk.rarity)}
                   `}
                 >
                   <div className="absolute right-0 top-0 opacity-10 text-9xl rotate-12 -mr-8 -mt-4 group-hover:scale-110 transition-transform">{perk.icon}</div>
                   <span className="text-6xl z-10 drop-shadow-sm mb-2">{perk.icon}</span>
                   <div className="z-10 w-full">
                     <div className="font-bold uppercase flex flex-col items-center justify-center gap-1 text-lg mb-2">
                       {perk.name}
                       <span className="text-[10px] px-2 py-0.5 bg-black/20 rounded-full font-extrabold tracking-widest uppercase text-white">{perk.rarity}</span>
                     </div>
                     <div className="text-sm opacity-90 leading-tight font-medium px-2">{perk.description}</div>
                   </div>
                 </button>
               ))}
             </div>
          </div>
        )}

        {gameState === GameState.GAME_OVER && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/90 z-50 backdrop-blur-sm pointer-events-auto">
            <h2 className="text-8xl text-white font-bold pixel-text mb-4 drop-shadow-[6px_6px_0_#000]">GAME OVER</h2>
            
            <div className="bg-slate-100 text-slate-900 p-8 rounded-xl w-80 text-center border-8 border-slate-900 mb-8 shadow-2xl transform scale-125">
              <div className="flex justify-between mb-2">
                <span className="text-slate-500 uppercase font-bold text-lg">Diff</span>
                <span className={`text-lg font-bold uppercase ${selectedDifficulty.color.split(' ')[1] ? 'text-slate-900' : selectedDifficulty.color.split(' ')[0]}`}>
                   {selectedDifficulty.name}
                </span>
              </div>
              <div className="flex justify-between mb-4">
                <span className="text-slate-500 uppercase font-bold text-lg">Score</span>
                <span className="text-4xl font-bold">{score}</span>
              </div>
              <div className="flex justify-between border-t-4 border-slate-300 pt-4">
                <span className="text-slate-500 uppercase font-bold text-lg">Best</span>
                <span className="text-4xl font-bold text-orange-600">{Math.max(score, highScore)}</span>
              </div>
            </div>

            <div className="flex justify-center mt-8">
               <button 
                 onClick={resetGame}
                 className="bg-green-500 hover:bg-green-600 text-white text-3xl font-bold py-4 px-12 rounded-xl shadow-[0_6px_0_0_rgba(21,128,61,1)] active:shadow-none active:translate-y-2 transition-all w-full md:w-auto"
               >
                 RETRY
               </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default GameEngine;