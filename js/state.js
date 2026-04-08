import { EQUIPMENT_SLOTS, MAPS } from "./data.js";
import { loadFromStorage, saveToStorage } from "./storage.js";

function buildEquipmentState() {
  return Object.fromEntries(EQUIPMENT_SLOTS.map((slot) => [slot, null]));
}

export function createDefaultState() {
  return {
    level: 1,
    exp: 0,
    hpMax: 120,
    hp: 120,
    str: 10,
    vit: 10,
    luck: 8,
    dex: 9,
    agi: 8,
    gold: 120,
    materials: {
      iron: 2,
      leather: 2,
      crystal: 1,
      gold: 0,
      silver: 0,
      ember: 0,
    },
    skills: [],
    equipment: buildEquipmentState(),
    selectedMapId: MAPS[0].id,
    logs: {
      battle: ["系統準備完成，選擇地圖後即可開始戰鬥。"],
      casino: ["黑市賭場已開門，輸贏全看運氣。"],
    },
  };
}

function mergeLoadedState(loadedState) {
  const base = createDefaultState();
  return {
    ...base,
    ...loadedState,
    materials: { ...base.materials, ...(loadedState?.materials ?? {}) },
    skills: Array.isArray(loadedState?.skills) ? loadedState.skills : base.skills,
    equipment: { ...base.equipment, ...(loadedState?.equipment ?? {}) },
    logs: { ...base.logs, ...(loadedState?.logs ?? {}) },
  };
}

export function createStore() {
  let state = mergeLoadedState(loadFromStorage());
  const listeners = new Set();

  function notify() {
    listeners.forEach((listener) => listener(state));
  }

  function persist() {
    saveToStorage(state);
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      listener(state);
      return () => listeners.delete(listener);
    },
    getState() {
      return state;
    },
    setState(updater, options = { save: true }) {
      const nextState = typeof updater === "function" ? updater(state) : updater;
      state = nextState;

      if (options.save) {
        persist();
      }

      notify();
    },
    reset() {
      state = createDefaultState();
      persist();
      notify();
    },
    save() {
      persist();
      notify();
    },
  };
}

export function gainRewards(state, rewards) {
  const nextState = structuredClone(state);
  nextState.exp += rewards.exp ?? 0;
  nextState.gold += rewards.gold ?? 0;

  // 升級曲線目前採簡單線性設計：需求值 = 等級 * 100。
  // 若未來想改成職業制或指數成長，只需要替換這段 while 條件與升級後的成長公式。
  while (nextState.exp >= nextState.level * 100) {
    nextState.exp -= nextState.level * 100;
    nextState.level += 1;
    nextState.hpMax += 14;
    nextState.str += 2;
    nextState.vit += 2;
    nextState.dex += 1;
    nextState.agi += 1;
    nextState.luck += 1;
    nextState.hp = nextState.hpMax;
  }

  return nextState;
}

export function applyBattleResult(state, battleResult) {
  const nextState = structuredClone(state);
  nextState.logs.battle = battleResult.logs;

  if (!battleResult.victory) {
    nextState.hp = Math.max(1, Math.round(nextState.hpMax * 0.35));
    return nextState;
  }

  const rewardedState = gainRewards(nextState, battleResult.rewards);
  rewardedState.hp = Math.max(20, rewardedState.hpMax - Math.max(0, rewardedState.vit - 4));

  battleResult.rewards.drops.forEach((drop) => {
    if (drop.type === "material") {
      rewardedState.materials[drop.id] = (rewardedState.materials[drop.id] ?? 0) + 1;
    }

    if (drop.type === "skill" && !rewardedState.skills.includes(drop.id)) {
      rewardedState.skills.push(drop.id);
    }
  });

  return rewardedState;
}

export function applyForgeResult(state, forgedItem) {
  const nextState = structuredClone(state);

  forgedItem.materials.forEach((materialId) => {
    nextState.materials[materialId] = Math.max(0, (nextState.materials[materialId] ?? 0) - 1);
  });

  nextState.equipment[forgedItem.slot] = forgedItem;
  return nextState;
}

export function applyCasinoResult(state, result) {
  const nextState = structuredClone(state);
  nextState.gold += result.deltaGold;
  nextState.logs.casino = result.lines;
  return nextState;
}
