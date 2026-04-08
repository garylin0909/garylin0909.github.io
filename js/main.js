import { runAutoBattle } from "./battle.js";
import { CASINO_GAMES, MAPS, MATERIAL_DEFS } from "./data.js";
import { calculateForgeResult, getForgeCapacity } from "./forge.js";
import { playCoin, playDice, playInBetween } from "./gamble.js";
import { clearStorage } from "./storage.js";
import { applyBattleResult, applyCasinoResult, applyForgeResult, createStore } from "./state.js";
import { createUI } from "./ui.js";

const store = createStore();

function save() {
  store.save();
}

function reset() {
  const shouldReset = window.confirm("確定要清除目前進度並重置角色嗎？");
  if (!shouldReset) {
    return;
  }

  clearStorage();
  store.reset();
}

function selectMap(mapId) {
  store.setState((state) => ({
    ...state,
    selectedMapId: MAPS.some((map) => map.id === mapId) ? mapId : state.selectedMapId,
  }));
}

function battle() {
  const currentState = store.getState();
  const result = runAutoBattle(currentState, currentState.selectedMapId);
  store.setState((state) => applyBattleResult(state, result));
}

function forge(slot, materials) {
  const currentState = store.getState();
  const capacity = getForgeCapacity(slot);

  if (!capacity) {
    window.alert("這個部位目前不能鍛造。");
    return;
  }

  const chosenMaterials = materials.filter(Boolean).slice(0, capacity);
  if (chosenMaterials.length === 0) {
    window.alert("請至少選擇一個材料。");
    return;
  }

  const requiredCounts = chosenMaterials.reduce((accumulator, materialId) => {
    accumulator[materialId] = (accumulator[materialId] ?? 0) + 1;
    return accumulator;
  }, {});

  const hasEnoughMaterials = Object.entries(requiredCounts).every(
    ([materialId, count]) => (currentState.materials[materialId] ?? 0) >= count,
  );

  if (!hasEnoughMaterials) {
    window.alert("材料數量不足，無法完成這次鍛造。");
    return;
  }

  const forgedItem = calculateForgeResult(slot, chosenMaterials);
  store.setState((state) => applyForgeResult(state, forgedItem));
}

function casino(gameKey, betAmount) {
  const currentState = store.getState();
  const handlers = {
    dice: playDice,
    inBetween: playInBetween,
    coin: playCoin,
  };

  const handler = handlers[gameKey];
  if (!handler) {
    return;
  }

  const result = handler(currentState.gold, betAmount);
  if (!result.ok) {
    window.alert(result.message ?? `無法進行 ${CASINO_GAMES[gameKey] ?? "賭局"}。`);
    return;
  }

  store.setState((state) => applyCasinoResult(state, result));
}

const actions = {
  save,
  reset,
  selectMap,
  battle,
  forge,
  casino,
};

createUI(store, actions);

// 頁面首次載入時，如果沒有存檔，createStore 會回傳預設狀態。
// 這裡主動儲存一次，確保後續 GitHub Pages 重新整理仍可直接延續進度。
store.save();

window.__TEXT_RPG_DEBUG__ = {
  store,
  MATERIAL_DEFS,
};
