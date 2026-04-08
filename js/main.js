import { runAdventure } from "./battle.js";
import { CASINO_GAMES, MAPS } from "./data.js";
import { calculateForgeResult, getForgeCapacity } from "./forge.js";
import { playCoin, playDice, playInBetween } from "./gamble.js";
import { clearStorage } from "./storage.js";
import {
  addAttributePoint,
  applyAdventureResult,
  applyCasinoResult,
  applyEquipmentSelection,
  applyForgeResult,
  createStore,
} from "./state.js";
import { createUI } from "./ui.js";

const store = createStore();

function save() {
  store.save();
}

function reset() {
  if (!window.confirm("確定要清除目前進度並重置角色嗎？")) {
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

function addAttribute(attributeKey) {
  store.setState((state) => addAttributePoint(state, attributeKey));
}

function adventure(mode) {
  const result = runAdventure(store.getState(), mode);
  store.setState((state) => applyAdventureResult(state, result));
}

function forge(type, name, materials) {
  const currentState = store.getState();
  const capacity = getForgeCapacity(type);
  if (!capacity) {
    window.alert("這個類型目前不能鍛造。");
    return;
  }

  const chosen = materials.filter(Boolean).slice(0, capacity);
  if (chosen.length === 0) {
    window.alert("請至少投入一個材料。");
    return;
  }

  const required = chosen.reduce((accumulator, materialId) => {
    accumulator[materialId] = (accumulator[materialId] ?? 0) + 1;
    return accumulator;
  }, {});

  const enough = Object.entries(required).every(
    ([materialId, count]) => (currentState.materials[materialId] ?? 0) >= count,
  );

  if (!enough) {
    window.alert("材料不足，無法完成鍛造。");
    return;
  }

  const forgedItem = calculateForgeResult(type, name, chosen, currentState.playerSeed);
  store.setState((state) => applyForgeResult(state, forgedItem));
}

function equip(selection) {
  store.setState((state) => applyEquipmentSelection(state, selection));
}

function casino(gameKey, betAmount) {
  const handlers = {
    dice: playDice,
    inBetween: playInBetween,
    coin: playCoin,
  };

  const result = handlers[gameKey]?.(store.getState().gold, betAmount);
  if (!result?.ok) {
    window.alert(result?.message ?? `無法進行 ${CASINO_GAMES[gameKey] ?? "賭局"}。`);
    return;
  }

  store.setState((state) => applyCasinoResult(state, result));
}

createUI(store, {
  save,
  reset,
  selectMap,
  addAttribute,
  adventure,
  forge,
  equip,
  casino,
});

store.save();
