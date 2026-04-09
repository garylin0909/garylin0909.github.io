import { runAdventure } from "./battle.js";
import { CASINO_GAMES, MAPS } from "./data.js";
import { calculateForgeResult, getForgeCapacity } from "./forge.js";
import {
  playDice,
  resolveCoin,
  resolveInBetween,
  setupCoin,
  setupInBetween,
} from "./gamble.js";
import {
  addAttributePoint,
  applyAdventureResult,
  applyCasinoResult,
  applyEquipmentSelection,
  applyForgeResult,
  createStore,
  setNickname,
  setSaveText,
} from "./state.js";
import { createUI } from "./ui.js";

const store = createStore();

function ensureNickname() {
  if (store.getState().nickname) {
    return;
  }

  let nickname = "";
  while (!nickname.trim()) {
    nickname = window.prompt("請輸入你的暱稱：", "") ?? "";
    if (!nickname.trim()) {
      nickname = "旅人";
      break;
    }
  }

  store.setState((state) => setNickname(state, nickname));
}

function buildSavePayload(state) {
  const { saveText, ...rest } = state;
  return rest;
}

function generateSaveText() {
  const saveText = JSON.stringify(buildSavePayload(store.getState()), null, 2);
  store.setState((state) => setSaveText(state, saveText), { save: false });
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

  if (!name.trim()) {
    window.alert("請先輸入裝備名稱。");
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
  if (gameKey === "dice") {
    const result = playDice(store.getState().gold, betAmount);
    if (!result?.ok) {
      window.alert(result?.message ?? `無法進行 ${CASINO_GAMES[gameKey] ?? "賭局"}。`);
      return null;
    }
    store.setState((state) => applyCasinoResult(state, result));
    return result;
  }

  if (gameKey === "inBetween") {
    const result = setupInBetween(store.getState().gold, betAmount);
    if (!result?.ok) {
      window.alert(result?.message ?? "無法開始射龍門。");
      return null;
    }
    store.setState((state) => applyCasinoResult(state, { deltaGold: 0, lines: result.lines }), { save: false });
    return result;
  }

  if (gameKey === "coin") {
    const result = setupCoin(store.getState().gold, betAmount);
    if (!result?.ok) {
      window.alert(result?.message ?? "無法開始猜正反。");
      return null;
    }
    store.setState((state) => applyCasinoResult(state, { deltaGold: 0, lines: result.lines }), { save: false });
    return result;
  }

  return null;
}

function resolveCasino(pendingState, choice) {
  let result = null;

  if (pendingState.game === "inBetween") {
    result = resolveInBetween(store.getState().gold, pendingState.bet, choice, pendingState.payload);
  }

  if (pendingState.game === "coin") {
    result = resolveCoin(store.getState().gold, pendingState.bet, choice);
  }

  if (!result?.ok) {
    window.alert(result?.message ?? "本次賭局結算失敗。");
    return null;
  }

  store.setState((state) => applyCasinoResult(state, result));
  return result;
}

createUI(store, {
  generateSaveText,
  selectMap,
  addAttribute,
  adventure,
  forge,
  equip,
  casino,
  resolveCasino,
});

ensureNickname();
store.save();
