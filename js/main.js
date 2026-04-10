import { runAdventure } from "./battle.js";
import { CASINO_GAMES, MAPS } from "./data.js";
import { calculateForgeResult, getForgeCapacity } from "./forge.js";
import { createInBetweenRound, playDice, resolveCoin, resolveInBetween } from "./gamble.js";
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

function showCasinoLines(lines) {
  store.setState((state) => applyCasinoResult(state, { deltaGold: 0, lines }), { save: false });
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
  if (gameKey !== "dice") {
    return null;
  }

  const result = playDice(store.getState().gold, betAmount);
  if (!result?.ok) {
    window.alert(result?.message ?? `無法進行 ${CASINO_GAMES[gameKey] ?? "賭局"}。`);
    return null;
  }

  store.setState((state) => applyCasinoResult(state, result));
  return result;
}

function startInBetweenRound() {
  const round = createInBetweenRound();
  showCasinoLines(round.lines);
  return { game: "inBetween", stage: "betting", payload: round.payload };
}

function finishInBetweenRound(casinoState, betAmount) {
  const result = resolveInBetween(store.getState().gold, betAmount, casinoState.payload);
  if (!result?.ok) {
    window.alert(result?.message ?? "射龍門結算失敗。");
    return null;
  }
  store.setState((state) => applyCasinoResult(state, result));
  return result;
}

function resolveCoinGame(choice, betAmount) {
  const result = resolveCoin(store.getState().gold, betAmount, choice);
  if (!result?.ok) {
    window.alert(result?.message ?? "猜正反結算失敗。");
    return null;
  }
  store.setState((state) => applyCasinoResult(state, result));
  return result;
}

createUI(store, {
  generateSaveText,
  showCasinoLines,
  selectMap,
  addAttribute,
  adventure,
  forge,
  equip,
  casino,
  startInBetweenRound,
  finishInBetweenRound,
  resolveCoin: resolveCoinGame,
});

ensureNickname();
store.save();
