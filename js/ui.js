import {
  CASINO_GAMES,
  EQUIPMENT_SLOTS,
  FORGEABLE_SLOTS,
  MAPS,
  MATERIAL_DEFS,
  SKILL_BOOKS,
} from "./data.js";
import { calculateForgeResult, getForgeCapacity } from "./forge.js";

const STAT_LABELS = {
  level: "等級",
  exp: "經驗",
  hp: "生命值",
  hpMax: "最大生命",
  str: "力量",
  vit: "耐力",
  luck: "幸運",
  dex: "靈巧",
  agi: "敏捷",
  gold: "金幣",
};

function formatStatValue(key, value) {
  if (key === "hp") {
    return `${value}`;
  }

  return String(value);
}

function createMaterialOptions(state) {
  return [
    `<option value="">不放入材料</option>`,
    ...Object.entries(MATERIAL_DEFS).map(([id, material]) => {
      const owned = state.materials[id] ?? 0;
      return `<option value="${id}">${material.name} (${owned})</option>`;
    }),
  ].join("");
}

function getForgeSelection(documentRef) {
  const slot = documentRef.querySelector("#forge-slot").value;
  const materials = Array.from(documentRef.querySelectorAll(".forge-material")).map((select) => select.value);
  return { slot, materials };
}

export function createUI(store, actions) {
  const root = document;

  function setActiveView(viewId) {
    root.querySelectorAll(".nav-tab").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.view === viewId);
    });

    root.querySelectorAll(".view").forEach((view) => {
      view.classList.toggle("is-visible", view.id === `view-${viewId}`);
    });
  }

  function renderQuickStats(state) {
    const container = root.querySelector("#hero-quick-stats");
    container.innerHTML = [
      { label: "等級", value: state.level },
      { label: "HP", value: `${state.hp}/${state.hpMax}` },
      { label: "力量", value: state.str },
      { label: "敏捷", value: state.agi },
      { label: "金幣", value: state.gold },
    ]
      .map(
        (item) => `
          <div class="quick-card">
            <span>${item.label}</span>
            <strong>${item.value}</strong>
          </div>
        `,
      )
      .join("");
  }

  function renderState(state) {
    const stateGrid = root.querySelector("#state-grid");
    const skillList = root.querySelector("#skill-list");
    const entries = ["level", "exp", "hp", "hpMax", "str", "vit", "luck", "dex", "agi", "gold"];

    stateGrid.innerHTML = entries
      .map(
        (key) => `
          <div class="stat-card">
            <span>${STAT_LABELS[key]}</span>
            <strong>${formatStatValue(key, state[key])}</strong>
          </div>
        `,
      )
      .join("");

    skillList.innerHTML =
      state.skills.length > 0
        ? state.skills.map((skillId) => `<span class="tag">${SKILL_BOOKS[skillId].name}</span>`).join("")
        : `<span class="tag">尚未學會技能</span>`;
  }

  function renderMaps(state) {
    const mapList = root.querySelector("#map-list");
    const encounterCard = root.querySelector("#encounter-card");

    mapList.innerHTML = MAPS.map(
      (map) => `
        <button class="map-card ${map.id === state.selectedMapId ? "is-selected" : ""}" data-map-id="${map.id}">
          <strong>${map.name}</strong>
          <p>${map.description}</p>
        </button>
      `,
    ).join("");

    const currentMap = MAPS.find((map) => map.id === state.selectedMapId) ?? MAPS[0];
    encounterCard.innerHTML = `
      <div class="map-card is-selected">
        <strong>${currentMap.name}</strong>
        <p>${currentMap.description}</p>
        <p>此地圖沒有等級限制，按下戰鬥即可自動遭遇敵人。</p>
      </div>
    `;
  }

  function renderBattleLog(state) {
    const battleLog = root.querySelector("#battle-log");
    battleLog.innerHTML = state.logs.battle
      .map((line) => {
        let className = "log-line";
        if (line.includes("擊敗") || line.includes("獲得") || line.includes("掉落")) {
          className += " log-good";
        } else if (line.includes("反擊") || line.includes("撤退")) {
          className += " log-bad";
        } else if (line.includes("施放")) {
          className += " log-special";
        }

        return `<p class="${className}">${line}</p>`;
      })
      .join("");
  }

  function renderForge(state) {
    const slotSelect = root.querySelector("#forge-slot");
    const materialSelects = Array.from(root.querySelectorAll(".forge-material"));
    const preview = root.querySelector("#forge-preview");

    if (!slotSelect.dataset.initialized) {
      slotSelect.innerHTML = Object.entries(FORGEABLE_SLOTS)
        .map(([slot, capacity]) => `<option value="${slot}">${slot} (${capacity} 格)</option>`)
        .join("");
      slotSelect.dataset.initialized = "true";
    }

    const materialOptions = createMaterialOptions(state);
    materialSelects.forEach((select) => {
      const currentValue = select.value;
      select.innerHTML = materialOptions;
      if (currentValue) {
        select.value = currentValue;
      }
    });

    const { slot, materials } = getForgeSelection(root);
    const capacity = getForgeCapacity(slot);

    materialSelects.forEach((select, index) => {
      select.disabled = index >= capacity;
      if (index >= capacity) {
        select.value = "";
      }
    });

    const forged = calculateForgeResult(slot, materials);
    const statRows = Object.entries(forged.stats).length
      ? Object.entries(forged.stats)
          .map(([stat, value]) => `<p>${STAT_LABELS[stat] ?? stat} +${value}</p>`)
          .join("")
      : "<p>請先投入至少一個材料。</p>";
    const synergyRows =
      forged.synergies.length > 0
        ? forged.synergies.map((line) => `<p class="log-special">${line}</p>`).join("")
        : "<p>目前沒有觸發材料連動。</p>";

    preview.innerHTML = `
      <p><strong>名稱：</strong>${forged.name}</p>
      <p><strong>部位：</strong>${forged.slot}</p>
      <p><strong>材料上限：</strong>${capacity}</p>
      <div>${statRows}</div>
      <div>${synergyRows}</div>
    `;
  }

  function renderEquipment(state) {
    const grid = root.querySelector("#equipment-grid");
    grid.innerHTML = EQUIPMENT_SLOTS.map((slot) => {
      const item = state.equipment[slot];
      const statText = item?.stats
        ? Object.entries(item.stats)
            .map(([stat, value]) => `${STAT_LABELS[stat] ?? stat} +${value}`)
            .join(" / ")
        : "尚未裝備";
      const extra = item?.synergies?.length ? `連動：${item.synergies.join("、")}` : "無連動效果";

      return `
        <div class="equipment-card">
          <span>${slot}</span>
          <strong>${item?.name ?? "空槽"}</strong>
          <p>${statText}</p>
          <p>${extra}</p>
        </div>
      `;
    }).join("");
  }

  function renderCasino(state) {
    const log = root.querySelector("#casino-log");
    log.innerHTML = state.logs.casino.map((line) => `<p class="log-line">${line}</p>`).join("");
  }

  function renderAll(state) {
    renderQuickStats(state);
    renderState(state);
    renderMaps(state);
    renderBattleLog(state);
    renderForge(state);
    renderEquipment(state);
    renderCasino(state);
  }

  function bindEvents() {
    root.querySelectorAll(".nav-tab").forEach((button) => {
      button.addEventListener("click", () => setActiveView(button.dataset.view));
    });

    root.querySelector("#save-button").addEventListener("click", actions.save);
    root.querySelector("#reset-button").addEventListener("click", actions.reset);
    root.querySelector("#battle-button").addEventListener("click", actions.battle);
    root.querySelector("#forge-button").addEventListener("click", () => {
      const { slot, materials } = getForgeSelection(root);
      actions.forge(slot, materials);
    });

    root.querySelector("#forge-slot").addEventListener("change", () => renderForge(store.getState()));
    root.querySelectorAll(".forge-material").forEach((select) => {
      select.addEventListener("change", () => renderForge(store.getState()));
    });

    root.querySelector("#map-list").addEventListener("click", (event) => {
      const button = event.target.closest("[data-map-id]");
      if (!button) {
        return;
      }

      actions.selectMap(button.dataset.mapId);
    });

    root.querySelectorAll(".casino-button").forEach((button) => {
      button.addEventListener("click", () => {
        const bet = Number(root.querySelector("#bet-amount").value);
        actions.casino(button.dataset.game, bet);
      });
    });
  }

  store.subscribe(renderAll);
  bindEvents();
  setActiveView("state");

  return {
    refreshForgePreview() {
      renderForge(store.getState());
    },
  };
}

export function createCasinoMessage(gameKey) {
  return CASINO_GAMES[gameKey] ?? "未知賭局";
}
