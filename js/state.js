import {
  ATTRIBUTE_KEYS,
  EQUIP_SLOTS,
  MAPS,
  STARTER_ITEMS,
  SUBTYPE_COMPATIBILITY,
} from "./data.js";
import { loadFromStorage, saveToStorage } from "./storage.js";

function buildMapProgress() {
  return Object.fromEntries(MAPS.map((map) => [map.id, { floor: 1 }]));
}

function buildInventory() {
  return STARTER_ITEMS.map((item) => structuredClone(item));
}

function buildEquipped() {
  return {
    main: null,
    sub: null,
    armor: null,
    helmet: STARTER_ITEMS.find((item) => item.id === "starter-helmet") ?? null,
    ring: STARTER_ITEMS.find((item) => item.id === "starter-ring") ?? null,
  };
}

export function createDefaultState() {
  const baseAttributes = {
    str: 1,
    vit: 1,
    dex: 1,
    agi: 1,
    luck: 1,
  };

  return {
    nickname: "",
    playerSeed: crypto.randomUUID(),
    level: 1,
    exp: 0,
    expToNext: 100,
    gold: 120,
    attributePoints: 0,
    attributes: baseAttributes,
    pendingAttributes: { ...baseAttributes },
    pendingSpentPoints: 0,
    materials: {
      iron: 2,
      leather: 2,
      crystal: 1,
      silver: 1,
      gold: 0,
      ember: 0,
    },
    skills: [],
    activeSkills: [],
    inventory: buildInventory(),
    equipped: buildEquipped(),
    selectedMapId: MAPS[0].id,
    mapProgress: buildMapProgress(),
    saveText: "",
    logs: {
      battle: ["系統準備完成，選擇地圖後即可戰鬥或趕路。"],
      casino: ["黑市賭場已開門，輸贏全看運氣。"],
    },
  };
}

function mergeLoadedState(loadedState) {
  const base = createDefaultState();
  return {
    ...base,
    ...loadedState,
    attributes: { ...base.attributes, ...(loadedState?.attributes ?? {}) },
    pendingAttributes: { ...(loadedState?.pendingAttributes ?? loadedState?.attributes ?? base.attributes) },
    pendingSpentPoints: typeof loadedState?.pendingSpentPoints === "number" ? loadedState.pendingSpentPoints : 0,
    materials: { ...base.materials, ...(loadedState?.materials ?? {}) },
    skills: Array.isArray(loadedState?.skills) ? loadedState.skills : base.skills,
    activeSkills: Array.isArray(loadedState?.activeSkills) ? loadedState.activeSkills.slice(0, 4) : base.activeSkills,
    inventory: Array.isArray(loadedState?.inventory) ? loadedState.inventory : base.inventory,
    equipped: { ...base.equipped, ...(loadedState?.equipped ?? {}) },
    mapProgress: { ...base.mapProgress, ...(loadedState?.mapProgress ?? {}) },
    logs: { ...base.logs, ...(loadedState?.logs ?? {}) },
    saveText: typeof loadedState?.saveText === "string" ? loadedState.saveText : "",
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
      state = typeof updater === "function" ? updater(state) : updater;
      if (options.save) {
        persist();
      }
      notify();
    },
    save() {
      persist();
      notify();
    },
  };
}

export function setNickname(state, nickname) {
  return {
    ...state,
    nickname: nickname.trim(),
  };
}

export function setSaveText(state, saveText) {
  return {
    ...state,
    saveText,
  };
}

export function addPendingAttributePoint(state, key) {
  if (!ATTRIBUTE_KEYS.includes(key)) {
    return state;
  }

  const remaining = state.attributePoints - state.pendingSpentPoints;
  if (remaining <= 0) {
    return state;
  }

  const nextState = structuredClone(state);
  nextState.pendingAttributes[key] += 1;
  nextState.pendingSpentPoints += 1;
  return nextState;
}

export function resetPendingAttributes(state) {
  return {
    ...state,
    pendingAttributes: structuredClone(state.attributes),
    pendingSpentPoints: 0,
  };
}

export function confirmPendingAttributes(state) {
  return {
    ...state,
    attributes: structuredClone(state.pendingAttributes),
    attributePoints: Math.max(0, state.attributePoints - state.pendingSpentPoints),
    pendingSpentPoints: 0,
  };
}

export function toggleActiveSkill(state, skillId) {
  if (!state.skills.includes(skillId)) {
    return state;
  }

  const nextState = structuredClone(state);
  const exists = nextState.activeSkills.includes(skillId);
  if (exists) {
    nextState.activeSkills = nextState.activeSkills.filter((id) => id !== skillId);
    return nextState;
  }

  if (nextState.activeSkills.length >= 4) {
    return state;
  }

  nextState.activeSkills.push(skillId);
  return nextState;
}

export function gainRewards(state, rewards) {
  const nextState = structuredClone(state);
  nextState.exp += rewards.exp ?? 0;
  nextState.gold += rewards.gold ?? 0;

  while (nextState.exp >= nextState.expToNext) {
    nextState.exp -= nextState.expToNext;
    nextState.level += 1;
    nextState.attributePoints += 5;
    nextState.expToNext = 100 + (nextState.level - 1) * 35;
  }

  return nextState;
}

export function applyAdventureResult(state, adventureResult) {
  const nextState = structuredClone(state);
  nextState.logs.battle = adventureResult.logs;
  const currentMap = nextState.selectedMapId;

  if (adventureResult.victory) {
    const rewarded = gainRewards(nextState, adventureResult.rewards);
    rewarded.pendingAttributes = structuredClone(rewarded.attributes);
    rewarded.pendingSpentPoints = 0;
    rewarded.mapProgress[currentMap].floor = Math.min(
      1000,
      rewarded.mapProgress[currentMap].floor + adventureResult.climbed,
    );

    adventureResult.rewards.drops.forEach((drop) => {
      if (drop.type === "material") {
        rewarded.materials[drop.id] = (rewarded.materials[drop.id] ?? 0) + 1;
      }

      if (drop.type === "skill" && !rewarded.skills.includes(drop.id)) {
        rewarded.skills.push(drop.id);
        if (rewarded.activeSkills.length < 4) {
          rewarded.activeSkills.push(drop.id);
        }
      }
    });

    return rewarded;
  }

  if (adventureResult.defeat === "revive") {
    nextState.mapProgress[currentMap].floor = 1;
    return nextState;
  }

  nextState.mapProgress[currentMap].floor = Math.min(
    1000,
    nextState.mapProgress[currentMap].floor + adventureResult.climbed,
  );
  return nextState;
}

export function applyForgeResult(state, forgedItem) {
  const nextState = structuredClone(state);
  forgedItem.materials.forEach((materialId) => {
    nextState.materials[materialId] = Math.max(0, (nextState.materials[materialId] ?? 0) - 1);
  });
  nextState.inventory.push(forgedItem);
  return nextState;
}

export function applyEquipmentSelection(state, selection) {
  const nextState = structuredClone(state);
  const inventoryMap = new Map(nextState.inventory.map((item) => [item.id, item]));

  EQUIP_SLOTS.forEach((slot) => {
    const selectedId = selection[slot] || "";
    nextState.equipped[slot] = selectedId ? structuredClone(inventoryMap.get(selectedId) ?? null) : null;
  });

  const mainSubtype = nextState.equipped.main?.subtype ?? null;
  const allowedSubs = mainSubtype ? SUBTYPE_COMPATIBILITY[mainSubtype] ?? [] : [];
  if (nextState.equipped.sub && !allowedSubs.includes(nextState.equipped.sub.subtype)) {
    nextState.equipped.sub = null;
  }

  return nextState;
}

export function applyCasinoResult(state, result) {
  const nextState = structuredClone(state);
  nextState.gold += result.deltaGold;
  nextState.logs.casino = result.lines;
  return nextState;
}
