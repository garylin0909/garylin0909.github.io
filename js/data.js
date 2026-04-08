export const STORAGE_KEY = "text-rpg-save-v1";

export const EQUIPMENT_SLOTS = [
  "弓",
  "矢",
  "劍",
  "盾",
  "大劍",
  "大盾",
  "盔甲",
  "頭盔",
  "項鍊",
  "戒指",
];

export const FORGEABLE_SLOTS = {
  弓: 3,
  劍: 3,
  大劍: 4,
  大盾: 4,
  盔甲: 4,
};

export const MATERIAL_DEFS = {
  iron: { name: "鐵", stat: "str", value: 3, tags: ["metal"] },
  leather: { name: "皮革", stat: "hp", value: 18, tags: ["hide"] },
  crystal: { name: "水晶", stat: "dex", value: 2, tags: ["focus"] },
  gold: { name: "金", stat: "luck", value: 2, tags: ["metal", "noble"] },
  silver: { name: "銀", stat: "agi", value: 2, tags: ["metal", "noble"] },
  ember: { name: "燼核", stat: "str", value: 4, tags: ["fire"] },
};

export const SYNERGY_RULES = [
  {
    id: "gold-silver",
    label: "金銀共鳴",
    materials: ["gold", "silver"],
    multiplier: 1.2,
  },
  {
    id: "iron-ember",
    label: "熾鐵鍛壓",
    materials: ["iron", "ember"],
    multiplier: 1.15,
  },
];

export const SKILL_BOOKS = {
  burst: {
    id: "burst",
    name: "破甲連擊",
    description: "生命低於 50% 時有機率發動，造成更高傷害。",
  },
  focus: {
    id: "focus",
    name: "集中射擊",
    description: "首回合有機率發動，依靈巧追加傷害。",
  },
  guard: {
    id: "guard",
    name: "穩固守勢",
    description: "受到攻擊時小幅減傷。",
  },
};

export const MAPS = [
  {
    id: "plains",
    name: "灰燼平原",
    description: "初階野地，怪物掉落鐵與皮革。",
    enemyPool: ["slime", "wolf"],
  },
  {
    id: "cavern",
    name: "銀霧洞窟",
    description: "靈巧型敵人較多，可能掉落銀與水晶。",
    enemyPool: ["bat", "golem"],
  },
  {
    id: "vault",
    name: "鍍金遺庫",
    description: "高風險地區，可能掉落金與技能書。",
    enemyPool: ["sentinel", "mimic"],
  },
];

export const ENEMIES = {
  slime: {
    name: "酸液史萊姆",
    hp: 38,
    str: 6,
    agi: 5,
    exp: 16,
    gold: 8,
    drops: [
      { type: "material", id: "leather", rate: 0.55 },
      { type: "material", id: "iron", rate: 0.35 },
    ],
  },
  wolf: {
    name: "裂牙野狼",
    hp: 48,
    str: 8,
    agi: 8,
    exp: 20,
    gold: 10,
    drops: [
      { type: "material", id: "leather", rate: 0.5 },
      { type: "skill", id: "focus", rate: 0.14 },
    ],
  },
  bat: {
    name: "銀翼蝠群",
    hp: 42,
    str: 7,
    agi: 12,
    exp: 24,
    gold: 11,
    drops: [
      { type: "material", id: "silver", rate: 0.35 },
      { type: "material", id: "crystal", rate: 0.28 },
    ],
  },
  golem: {
    name: "洞窟魔像",
    hp: 72,
    str: 11,
    agi: 4,
    exp: 36,
    gold: 18,
    drops: [
      { type: "material", id: "iron", rate: 0.48 },
      { type: "skill", id: "guard", rate: 0.12 },
    ],
  },
  sentinel: {
    name: "鍍金守衛",
    hp: 88,
    str: 14,
    agi: 10,
    exp: 46,
    gold: 26,
    drops: [
      { type: "material", id: "gold", rate: 0.24 },
      { type: "material", id: "silver", rate: 0.38 },
    ],
  },
  mimic: {
    name: "古匣擬態",
    hp: 74,
    str: 15,
    agi: 9,
    exp: 50,
    gold: 32,
    drops: [
      { type: "material", id: "gold", rate: 0.28 },
      { type: "material", id: "ember", rate: 0.25 },
      { type: "skill", id: "burst", rate: 0.16 },
    ],
  },
};

export const CASINO_GAMES = {
  dice: "擲骰子比大小",
  inBetween: "射龍門",
  coin: "猜正反",
};
