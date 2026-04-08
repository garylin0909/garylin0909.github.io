import { FORGEABLE_TYPES, MATERIAL_DEFS } from "./data.js";

export function getForgeCapacity(type) {
  return FORGEABLE_TYPES[type]?.materialLimit ?? 0;
}

function simpleHash(input) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function clampStat(value, minimum = 0) {
  return Math.max(minimum, Math.round(value));
}

export function calculateForgeResult(type, customName, materialIds, playerSeed) {
  const typeDef = FORGEABLE_TYPES[type];
  const capacity = getForgeCapacity(type);
  const materials = materialIds.filter(Boolean).slice(0, capacity);
  const baseStats = { atk: 0, def: 0, luck: 0, durability: 0 };

  materials.forEach((materialId) => {
    const material = MATERIAL_DEFS[materialId];
    if (!material) {
      return;
    }

    baseStats.atk += material.atk;
    baseStats.def += material.def;
    baseStats.luck += material.luck;
    baseStats.durability += material.durability;
  });

  const normalizedName = customName.trim() || `${typeDef.label}試作型`;
  const hash = simpleHash(`${playerSeed}:${type}:${normalizedName}`);
  const atkRate = 0.9 + ((hash % 21) / 100);
  const defRate = 0.9 + (((hash >> 5) % 21) / 100);
  const luckRate = 0.85 + (((hash >> 10) % 26) / 100);
  const durabilityRate = 0.9 + (((hash >> 15) % 21) / 100);

  // 名稱雜湊只影響最終成品，不改動材料底值。
  // 這樣同材料下，不同玩家或不同命名都能得到有差異但可預期的成品表現。
  const finalStats = {
    atk: clampStat(baseStats.atk * atkRate),
    def: clampStat(baseStats.def * defRate),
    luck: clampStat(baseStats.luck * luckRate),
    durability: clampStat(baseStats.durability * durabilityRate, 1),
  };

  return {
    id: `crafted-${type}-${hash.toString(16)}`,
    name: normalizedName,
    slot: typeDef.slot,
    subtype: type,
    stats: finalStats,
    materials,
    hashRates: { atkRate, defRate, luckRate, durabilityRate },
  };
}
