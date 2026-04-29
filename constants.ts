import { PhysicsConfig, Perk, DifficultyConfig } from './types';

// Use full window dimensions
export const GAME_WIDTH = window.innerWidth;
export const GAME_HEIGHT = window.innerHeight;

export const BIRD_SIZE = 34; // Slightly larger hitbox
export const PIPE_WIDTH = 52;
export const GROUND_HEIGHT = 40;
export const PIPE_POOL_SIZE = 20; // Increased pool for wider screens to prevent pop-in
export const PROJECTILE_POOL_SIZE = 20; // Max projectiles on screen
export const DAMAGE_ORB_POOL_SIZE = 10; // Max red orbs on screen
export const ORB_SIZE = 24;

// Boss Constants
export const BOSS_SIZE = 120;
export const BOSS_SPAWN_LEVEL_INTERVAL = 5; // Boss appears every 5 levels
export const PROJECTILE_SIZE = 30;
export const DAMAGE_ORB_SIZE = 40;

// Base physics are now derived from Difficulties, but we keep a fallback
export const INITIAL_PHYSICS: PhysicsConfig = {
  gravity: 0.85,
  jumpStrength: -12,
  pipeSpeed: 3.5,
  gapSize: 170,
  spawnRate: 300,
};

export const LEVEL_UP_XP_REQ = 5; // Orbs/Pipes needed

export const DIFFICULTIES: DifficultyConfig[] = [
  {
    id: 'normal',
    name: 'Normal',
    description: 'Equilibrado como deve ser.',
    color: 'text-blue-300',
    physics: { gravity: 0.85, jumpStrength: -12, pipeSpeed: 3.5, gapSize: 170, spawnRate: 300 },
    bossHpMultiplier: 1.0,
    scoreMultiplier: 1.2
  }
];

export const AVAILABLE_PERKS: Perk[] = [
  // --- COMUNS (Common) ---
  {
    id: 'penas_leves',
    name: 'Penas Leves',
    description: 'Aumenta 5% da velocidade de subida ao pular.',
    rarity: 'common',
    icon: '🪶',
    apply: (cfg) => ({ ...cfg, jumpStrength: cfg.jumpStrength * 1.05 }),
  },
  {
    id: 'bico_afiado',
    name: 'Bico Afiado',
    description: 'Hitbox fica 5% menor.',
    rarity: 'common',
    icon: '✂️',
  },
  {
    id: 'asa_estavel',
    name: 'Asa Estável',
    description: 'Gravidade reduzida em 5%.',
    rarity: 'common',
    icon: '⚖️',
    apply: (cfg) => ({ ...cfg, gravity: cfg.gravity * 0.95 }),
  },
  {
    id: 'voo_economico',
    name: 'Voo Econômico',
    description: 'Pulo ligeiramente mais forte.',
    rarity: 'common',
    icon: '🍃',
    apply: (cfg) => ({ ...cfg, jumpStrength: cfg.jumpStrength * 1.03 }),
  },
  {
    id: 'olhos_atencao',
    name: 'Olhos Atenção',
    description: 'Os canos se movem 3% mais devagar.',
    rarity: 'common',
    icon: '👀',
    apply: (cfg) => ({ ...cfg, pipeSpeed: cfg.pipeSpeed * 0.97 }),
  },
  {
    id: 'folego_curto',
    name: 'Fôlego Curto',
    description: 'Pequeno ajuste de flutuação.',
    rarity: 'common',
    icon: '😮‍💨',
    apply: (cfg) => ({ ...cfg, gravity: cfg.gravity * 0.98 }),
  },
  {
    id: 'xp_extra',
    name: 'XP Extra',
    description: 'Orbs de XP valem 1.5x.',
    rarity: 'common',
    icon: '✨',
  },

  // --- INCOMUNS (Uncommon) ---
  {
    id: 'asa_turbinada',
    name: 'Asa Turbinada',
    description: 'Pulo 10% mais forte.',
    rarity: 'uncommon',
    icon: '🚀',
    apply: (cfg) => ({ ...cfg, jumpStrength: cfg.jumpStrength * 1.10 }),
  },
  {
    id: 'celulas_vibratorias',
    name: 'Células Vibratórias',
    description: 'Ganhe XP extra a cada 10 pontos.',
    rarity: 'uncommon',
    icon: '〰️',
  },
  {
    id: 'frenesi_penas',
    name: 'Frenesi de Penas',
    description: 'Gravidade aumenta, mas pulo muito mais forte.',
    rarity: 'uncommon',
    icon: '🦅',
    apply: (cfg) => ({ ...cfg, gravity: cfg.gravity * 1.1, jumpStrength: cfg.jumpStrength * 1.15 }),
  },
  {
    id: 'vortice_frontal',
    name: 'Vórtice Frontal',
    description: 'Jogo 5% mais rápido, mas ganha mais XP.',
    rarity: 'uncommon',
    icon: '🌪️',
    apply: (cfg) => ({ ...cfg, pipeSpeed: cfg.pipeSpeed * 1.05 }),
  },
  {
    id: 'eco_do_vento',
    name: 'Eco do Vento',
    description: '+1 HP Maximo.',
    rarity: 'uncommon',
    icon: '➕',
  },
  {
    id: 'coracao_valente',
    name: 'Coração Valente',
    description: 'Cura 1 HP a cada 10 canos ultrapassados.',
    rarity: 'uncommon',
    icon: '💖',
  },
  {
    id: 'sopro_vida',
    name: 'Sopro de Vida',
    description: 'Cura 1 HP ao subir de nível.',
    rarity: 'uncommon',
    icon: '🌬️',
  },
  
  // --- RAROS (Rare) ---
  {
    id: 'asa_ima',
    name: 'Asa Ímã',
    description: 'Orbs de XP são atraídos até você.',
    rarity: 'rare',
    icon: '🧲',
  },
  {
    id: 'pulo_quantizado',
    name: 'Pulo Quantizado',
    description: 'Pulos são consistentes (reseta velocidade).',
    rarity: 'rare',
    icon: '📐',
  },
  {
    id: 'visao_ampliada',
    name: 'Visão Ampliada',
    description: 'O espaço entre os canos aumenta muito.',
    rarity: 'rare',
    icon: '🔭',
    apply: (cfg) => ({ ...cfg, gapSize: cfg.gapSize + 30 }),
  },
  {
    id: 'antigrav',
    name: 'Antigrav',
    description: 'Gravidade reduzida em 15%.',
    rarity: 'rare',
    icon: '🌑',
    apply: (cfg) => ({ ...cfg, gravity: cfg.gravity * 0.85 }),
  },
  {
    id: 'eco_defensivo',
    name: 'Eco Defensivo',
    description: 'Começa cada nível com um escudo temporário.',
    rarity: 'rare',
    icon: '🛡️',
  },
  {
    id: 'manto_vento',
    name: 'Manto de Vento',
    description: '15% de chance de esquivar de qualquer dano.',
    rarity: 'rare',
    icon: '🌬️',
  },
  {
    id: 'cacador_boss',
    name: 'Caçador de Boss',
    description: 'Causa dano dobrado ao Boss.',
    rarity: 'rare',
    icon: '🏹',
  },

  // --- ÉPICOS (Epic) - 10+ pts ---
  {
    id: 'dobra_do_vento',
    name: 'Dobra do Vento',
    description: 'Velocidade +20%, mas ganha 2x Pontos.',
    rarity: 'epic',
    icon: '⏩',
    apply: (cfg) => ({ ...cfg, pipeSpeed: cfg.pipeSpeed * 1.2 }),
  },
  {
    id: 'triplo_olhar',
    name: 'Triplo Olhar',
    description: 'Canos aparecem 10% mais longe um do outro.',
    rarity: 'epic',
    icon: '👁️',
    apply: (cfg) => ({ ...cfg, spawnRate: cfg.spawnRate + 50 }),
  },
  {
    id: 'choque_retorno',
    name: 'Choque de Retorno',
    description: '+1 Revive (Volta à vida ao morrer).',
    rarity: 'epic',
    icon: '⚡',
  },
  {
    id: 'voo_fantasma',
    name: 'Voo Fantasma',
    description: 'Invulnerabilidade dura o dobro do tempo.',
    rarity: 'epic',
    icon: '👻',
  },
  {
    id: 'tornado_xp',
    name: 'Tornado de XP',
    description: 'Atrai orbs de muito mais longe e com mais força.',
    rarity: 'epic',
    icon: '🌀',
  },
  {
    id: 'espectro_aco',
    name: 'Espectro de Aço',
    description: 'Fica invulnerável por 1.5s após passar por um cano.',
    rarity: 'epic',
    icon: '🦾',
  },

  // --- MÍTICOS (Mythic) - 20+ pts ---
  {
    id: 'realinhamento',
    name: 'Realinhamento',
    description: 'Gap dos canos é GIGANTE (+60px).',
    rarity: 'mythic',
    icon: '🌌',
    apply: (cfg) => ({ ...cfg, gapSize: cfg.gapSize + 60 }),
  },
  {
    id: 'asa_evolutiva',
    name: 'Asa Evolutiva',
    description: 'Gravidade extremamente baixa (-40%).',
    rarity: 'mythic',
    icon: '🧬',
    apply: (cfg) => ({ ...cfg, gravity: cfg.gravity * 0.6 }),
  },
  {
    id: 'salto_temporal',
    name: 'Salto Temporal',
    description: 'Tudo se move em câmera lenta (Speed -30%).',
    rarity: 'mythic',
    icon: '⏳',
    apply: (cfg) => ({ ...cfg, pipeSpeed: cfg.pipeSpeed * 0.7 }),
  },
  {
    id: 'filtro_caos',
    name: 'Filtro de Caos',
    description: '+2 Revives extras.',
    rarity: 'mythic',
    icon: '💠',
  },
  {
    id: 'escudo_reluzente',
    name: 'Escudo Reluzente',
    description: 'Ganha uma carga de escudo a cada 15 pontos (Máx 3).',
    rarity: 'mythic',
    icon: '✨',
  },
  {
    id: 'toque_midas',
    name: 'Toque de Midas',
    description: 'Transforma projéteis do boss em XP orbs ao encostar.',
    rarity: 'mythic',
    icon: '👑',
  },

  // --- LENDÁRIOS (Legendary) - 30+ pts ---
  {
    id: 'fenix',
    name: 'Fênix',
    description: 'Revive com invencibilidade ao morrer.',
    rarity: 'legendary',
    icon: '🔥',
  },
  {
    id: 'asa_quantica',
    name: 'Asa Quântica',
    description: 'Você fica minúsculo (Hitbox -40%).',
    rarity: 'legendary',
    icon: '⚛️',
  },
  {
    id: 'motor_warp',
    name: 'Motor Warp',
    description: 'Velocidade insana (+50%), Pontos x4.',
    rarity: 'legendary',
    icon: '🚀',
    apply: (cfg) => ({ ...cfg, pipeSpeed: cfg.pipeSpeed * 1.5 }),
  },
  {
    id: 'caminho_seguro',
    name: 'Caminho Seguro',
    description: '+5 Max HP. Tanque tudo.',
    rarity: 'legendary',
    icon: '🛤️',
  },
  {
    id: 'vinganca_gaia',
    name: 'Vingança de Gaia',
    description: 'Ao levar dano, causa 10 de dano ao Boss e limpa projéteis.',
    rarity: 'legendary',
    icon: '🪨',
  },

  // --- MÍSTICOS (Mystic) - 30+ pts (Rare drop) ---
  {
    id: 'dominio_tempo',
    name: 'Domínio do Tempo',
    description: 'O jogo fica muito lento e fácil.',
    rarity: 'mystic',
    icon: '⌛',
    apply: (cfg) => ({ ...cfg, pipeSpeed: cfg.pipeSpeed * 0.5, gravity: cfg.gravity * 0.5 }),
  },
  {
    id: 'asa_singular',
    name: 'Asa Singular',
    description: 'Gap imenso, gravidade perfeita.',
    rarity: 'mystic',
    icon: '🦄',
    apply: (cfg) => ({ ...cfg, gapSize: cfg.gapSize + 100, gravity: cfg.gravity * 0.8 }),
  },
  {
    id: 'realidade_flexivel',
    name: 'Realidade Flexível',
    description: '+5 Revives. Imortal?',
    rarity: 'mystic',
    icon: '🌈',
  }
];