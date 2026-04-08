import { FORGEABLE_SLOTS, MATERIAL_DEFS, SYNERGY_RULES } from "./data.js";

export function getForgeCapacity(slot) {
  return FORGEABLE_SLOTS[slot] ?? 0;
}

export function calculateForgeResult(slot, materialIds) {
  const capacity = getForgeCapacity(slot);
  const pickedMaterials = materialIds.filter(Boolean).slice(0, capacity);
  const statTotals = {};
  const synergyLog = [];

  pickedMaterials.forEach((materialId) => {
    const material = MATERIAL_DEFS[materialId];
    if (!material) {
      return;
    }

    statTotals[material.stat] = (statTotals[material.stat] ?? 0) + material.value;
  });

  // 這裡保留「連動效果框架」：
  // 先找出符合的材料組合，再針對組合內的材料底值進行乘算。
  // 未來如果要改成更複雜的條件，例如槽位順序、品質階級、稀有度權重，
  // 可以在這個規則層擴充，而不需要改動 UI 或整個鍛造流程。
  SYNERGY_RULES.forEach((rule) => {
    const matched = rule.materials.every((materialId) => pickedMaterials.includes(materialId));
    if (!matched) {
      return;
    }

    rule.materials.forEach((materialId) => {
      const material = MATERIAL_DEFS[materialId];
      if (!material) {
        return;
      }

      const bonus = material.value * (rule.multiplier - 1);
      statTotals[material.stat] = (statTotals[material.stat] ?? 0) + bonus;
    });

    synergyLog.push(`${rule.label} x${rule.multiplier.toFixed(2)}`);
  });

  const normalizedStats = Object.fromEntries(
    Object.entries(statTotals).map(([stat, value]) => [stat, Math.round(value)]),
  );

  return {
    slot,
    capacity,
    materials: pickedMaterials,
    stats: normalizedStats,
    synergies: synergyLog,
    name: `${slot}・試作 ${
      pickedMaterials.map((materialId) => MATERIAL_DEFS[materialId]?.name ?? "未知").join("/")
    }`,
  };
}
