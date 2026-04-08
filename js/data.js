export const STORAGE_KEY = "text-rpg-save-v2";

export const ATTRIBUTE_KEYS = ["str", "vit", "dex", "agi", "luck"];

export const ATTRIBUTE_LABELS = {
  str: "力量",
  vit: "耐力",
  dex: "靈巧",
  agi: "敏捷",
  luck: "幸運",
};

export const RESOURCE_LABELS = {
  level: "等級",
  exp: "經驗",
  gold: "金錢",
};

export const EQUIP_SLOTS = ["main", "sub", "armor", "helmet", "ring"];

export const EQUIP_SLOT_LABELS = {
  main: "主裝備",
  sub: "副裝備",
  armor: "盔甲",
  helmet: "頭盔",
  ring: "戒指",
};

export const FORGEABLE_TYPES = {
  bow: { label: "弓", slot: "main", materialLimit: 3 },
  sword: { label: "劍", slot: "main", materialLimit: 3 },
  greatsword: { label: "大劍", slot: "main", materialLimit: 4 },
  greatshield: { label: "大盾", slot: "main", materialLimit: 4 },
  armor: { label: "盔甲", slot: "armor", materialLimit: 4 },
};

export const SUBTYPE_COMPATIBILITY = {
  bow: ["arrow"],
  sword: ["shield"],
  greatsword: [],
  greatshield: [],
};

export const SUBTYPE_LABELS = {
  arrow: "矢",
  shield: "盾",
};

export const MATERIAL_DEFS = {
  iron: { name: "鐵礦", atk: 4, def: 2, luck: 0, durability: 8 },
  leather: { name: "硬皮", atk: 1, def: 4, luck: 0, durability: 10 },
  crystal: { name: "晶簇", atk: 2, def: 1, luck: 2, durability: 6 },
  silver: { name: "銀砂", atk: 2, def: 2, luck: 3, durability: 7 },
  gold: { name: "金箔", atk: 1, def: 1, luck: 5, durability: 5 },
  ember: { name: "燼核", atk: 5, def: 0, luck: 0, durability: 4 },
};

export const SKILL_BOOKS = {
  burst: {
    id: "burst",
    name: "破甲連擊",
    description: "生命低於 50% 時有機率追加傷害。",
  },
  focus: {
    id: "focus",
    name: "集中射擊",
    description: "先手時有機率提升傷害。",
  },
  guard: {
    id: "guard",
    name: "穩固守勢",
    description: "受擊時有機率減傷。",
  },
};

export const MAPS = [
  {
    id: "plains",
    name: "灰燼平原",
    description: "怪物分布平均，適合穩定累積素材與經驗。",
    baseEnemyPool: ["slime", "wolf"],
    bossEnemy: "warlord",
  },
  {
    id: "cavern",
    name: "銀霧洞窟",
    description: "偏向靈巧型敵人，節奏更快，經驗略高。",
    baseEnemyPool: ["bat", "golem"],
    bossEnemy: "queenBat",
  },
  {
    id: "vault",
    name: "鍍金遺庫",
    description: "高風險區域，樓層越深收益越高。",
    baseEnemyPool: ["sentinel", "mimic"],
    bossEnemy: "treasureCore",
  },
];

export const ENEMIES = {
  slime: { name: "酸液史萊姆", hp: 30, atk: 5, agi: 4, exp: 10, gold: 7, drops: ["leather"] },
  wolf: { name: "裂牙野狼", hp: 38, atk: 7, agi: 8, exp: 13, gold: 9, drops: ["iron", "focus"] },
  bat: { name: "銀翼蝠群", hp: 36, atk: 7, agi: 12, exp: 14, gold: 10, drops: ["silver", "crystal"] },
  golem: { name: "洞窟魔像", hp: 58, atk: 10, agi: 4, exp: 18, gold: 13, drops: ["iron", "guard"] },
  sentinel: { name: "鍍金守衛", hp: 66, atk: 12, agi: 9, exp: 21, gold: 16, drops: ["gold", "silver"] },
  mimic: { name: "古匣擬態", hp: 60, atk: 13, agi: 10, exp: 22, gold: 18, drops: ["ember", "burst"] },
  warlord: { name: "焦土戰將", hp: 120, atk: 18, agi: 10, exp: 48, gold: 42, drops: ["ember", "iron", "burst"] },
  queenBat: { name: "幽翼女王", hp: 110, atk: 17, agi: 16, exp: 52, gold: 46, drops: ["silver", "crystal", "focus"] },
  treasureCore: { name: "寶庫核心", hp: 132, atk: 20, agi: 12, exp: 58, gold: 54, drops: ["gold", "ember", "guard"] },
};

export const DROP_RATES = {
  material: 0.32,
  skill: 0.08,
};

export const CASINO_GAMES = {
  dice: "擲骰子比大小",
  inBetween: "射龍門",
  coin: "猜正反",
};

export const STARTER_ITEMS = [
  {
    id: "starter-arrow",
    name: "訓練矢袋",
    slot: "sub",
    subtype: "arrow",
    stats: { atk: 4, def: 0, luck: 0, durability: 30 },
  },
  {
    id: "starter-shield",
    name: "木製圓盾",
    slot: "sub",
    subtype: "shield",
    stats: { atk: 0, def: 4, luck: 0, durability: 32 },
  },
  {
    id: "starter-helmet",
    name: "舊鐵盔",
    slot: "helmet",
    subtype: "helmet",
    stats: { atk: 0, def: 3, luck: 0, durability: 35 },
  },
  {
    id: "starter-ring",
    name: "微光戒環",
    slot: "ring",
    subtype: "ring",
    stats: { atk: 0, def: 0, luck: 2, durability: 22 },
  },
];
