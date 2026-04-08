import {
  ATTRIBUTE_KEYS,
  ATTRIBUTE_LABELS,
  EQUIP_SLOT_LABELS,
  EQUIP_SLOTS,
  FORGEABLE_TYPES,
  MATERIAL_DEFS,
  MAPS,
  RESOURCE_LABELS,
  SKILL_BOOKS,
  SUBTYPE_COMPATIBILITY,
} from "./data.js";
import { calculateForgeResult, getForgeCapacity } from "./forge.js";

function createMaterialOptions(state) {
  return [
    `<option value="">不放入材料</option>`,
    ...Object.entries(state.materials).map(
      ([id, count]) => `<option value="${id}">${MATERIAL_DEFS[id]?.name ?? id} (${count})</option>`,
    ),
  ].join("");
}

function getForgeSelection(documentRef) {
  return {
    type: documentRef.querySelector("#forge-slot").value,
    name: documentRef.querySelector("#forge-name").value,
    materials: Array.from(documentRef.querySelectorAll(".forge-material")).map((select) => select.value),
  };
}

function renderItemStats(item) {
  if (!item?.stats) {
    return "未裝備";
  }
  return `攻擊 ${item.stats.atk} / 防禦 ${item.stats.def} / 幸運 ${item.stats.luck} / 耐久 ${item.stats.durability}`;
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

  function renderResourceBar(state) {
    root.querySelector("#resource-bar").innerHTML = ["level", "exp", "gold"]
      .map((key) => {
        const value = key === "exp" ? `${state.exp} / ${state.expToNext}` : state[key];
        return `
          <div class="resource-chip">
            <span>${RESOURCE_LABELS[key]}</span>
            <strong>${value}</strong>
          </div>
        `;
      })
      .join("");
  }

  function renderState(state) {
    root.querySelector("#state-grid").innerHTML = [
      { label: "玩家識別", value: state.playerSeed.slice(0, 8) },
      { label: "探索地圖", value: MAPS.find((map) => map.id === state.selectedMapId)?.name ?? "-" },
      { label: "目前樓層", value: state.mapProgress[state.selectedMapId].floor },
      { label: "已學技能數", value: state.skills.length },
    ]
      .map(
        (item) => `
          <div class="stat-card">
            <span>${item.label}</span>
            <strong>${item.value}</strong>
          </div>
        `,
      )
      .join("");

    root.querySelector("#attribute-points").textContent = `未分配能力點：${state.attributePoints}`;
    root.querySelector("#attribute-grid").innerHTML = ATTRIBUTE_KEYS.map(
      (key) => `
        <div class="attribute-card">
          <div class="attribute-row">
            <div>
              <span>${ATTRIBUTE_LABELS[key]}</span>
              <strong class="attribute-value">${state.attributes[key]}</strong>
            </div>
            <div class="attribute-actions">
              <button class="attribute-button" data-attribute="${key}">+1</button>
            </div>
          </div>
        </div>
      `,
    ).join("");

    root.querySelector("#skill-list").innerHTML =
      state.skills.length > 0
        ? state.skills.map((skillId) => `<span class="tag">${SKILL_BOOKS[skillId].name}</span>`).join("")
        : `<span class="tag">尚未學會技能</span>`;
  }

  function renderMaps(state) {
    root.querySelector("#map-list").innerHTML = MAPS.map(
      (map) => `
        <button class="map-card ${map.id === state.selectedMapId ? "is-selected" : ""}" data-map-id="${map.id}">
          <strong>${map.name}</strong>
          <p>${map.description}</p>
        </button>
      `,
    ).join("");

    const currentMap = MAPS.find((map) => map.id === state.selectedMapId) ?? MAPS[0];
    const floor = state.mapProgress[currentMap.id].floor;
    const isBossFloor = floor % 25 === 0;

    root.querySelector("#encounter-card").innerHTML = `
      <div class="map-card is-selected">
        <strong>${currentMap.name}</strong>
        <p>目前位於第 ${floor} 層 / 最高可達 1000 層。</p>
        <p>${isBossFloor ? "本層為 Boss 層，戰鬥強度顯著提高。" : "一般樓層，可選擇刷怪或快速趕路。"}</p>
        <p>戰鬥上樓率較低，趕路上樓率較高。</p>
      </div>
    `;
  }

  function renderBattleLog(state) {
    root.querySelector("#battle-log").innerHTML = state.logs.battle
      .map((line) => {
        let className = "log-line";
        if (line.includes("獲得") || line.includes("掉落") || line.includes("推進")) {
          className += " log-good";
        } else if (line.includes("撤退") || line.includes("造成")) {
          className += " log-bad";
        } else if (line.includes("施放") || line.includes("Boss")) {
          className += " log-special";
        }
        return `<p class="${className}">${line}</p>`;
      })
      .join("");
  }

  function renderForge(state) {
    const slotSelect = root.querySelector("#forge-slot");
    const materialSelects = Array.from(root.querySelectorAll(".forge-material"));

    if (!slotSelect.dataset.ready) {
      slotSelect.innerHTML = Object.entries(FORGEABLE_TYPES)
        .map(([key, value]) => `<option value="${key}">${value.label} (${value.materialLimit} 格)</option>`)
        .join("");
      slotSelect.dataset.ready = "true";
    }

    const materialOptions = createMaterialOptions(state);
    materialSelects.forEach((select) => {
      const currentValue = select.value;
      select.innerHTML = materialOptions;
      select.value = currentValue;
    });

    const forgeState = getForgeSelection(root);
    const capacity = getForgeCapacity(forgeState.type);
    materialSelects.forEach((select, index) => {
      select.disabled = index >= capacity;
      if (index >= capacity) {
        select.value = "";
      }
    });

    const preview = calculateForgeResult(
      forgeState.type,
      forgeState.name,
      forgeState.materials,
      state.playerSeed,
    );

    root.querySelector("#forge-preview").innerHTML = `
      <p><strong>名稱：</strong>${preview.name}</p>
      <p><strong>類型：</strong>${FORGEABLE_TYPES[forgeState.type].label}</p>
      <p><strong>攻擊：</strong>${preview.stats.atk}</p>
      <p><strong>防禦：</strong>${preview.stats.def}</p>
      <p><strong>幸運：</strong>${preview.stats.luck}</p>
      <p><strong>耐久：</strong>${preview.stats.durability}</p>
    `;
  }

  function renderEquipment(state) {
    const selects = {
      main: root.querySelector("#equip-main"),
      sub: root.querySelector("#equip-sub"),
      armor: root.querySelector("#equip-armor"),
      helmet: root.querySelector("#equip-helmet"),
      ring: root.querySelector("#equip-ring"),
    };

    const itemsBySlot = Object.fromEntries(
      EQUIP_SLOTS.map((slot) => [slot, state.inventory.filter((item) => item.slot === slot)]),
    );

    const selectedMainSubtype = selects.main.value
      ? state.inventory.find((item) => item.id === selects.main.value)?.subtype ?? null
      : state.equipped.main?.subtype ?? null;
    const allowedSubs = selectedMainSubtype ? SUBTYPE_COMPATIBILITY[selectedMainSubtype] ?? [] : [];

    selects.main.innerHTML =
      `<option value="">不裝備</option>` +
      itemsBySlot.main
        .map((item) => `<option value="${item.id}">${item.name}</option>`)
        .join("");
    selects.main.value = state.equipped.main?.id ?? "";

    selects.sub.innerHTML =
      `<option value="">不裝備</option>` +
      itemsBySlot.sub
        .filter((item) => allowedSubs.includes(item.subtype))
        .map((item) => `<option value="${item.id}">${item.name}</option>`)
        .join("");
    selects.sub.disabled = allowedSubs.length === 0;
    selects.sub.value = allowedSubs.includes(state.equipped.sub?.subtype) ? state.equipped.sub?.id ?? "" : "";

    ["armor", "helmet", "ring"].forEach((slot) => {
      selects[slot].innerHTML =
        `<option value="">不裝備</option>` +
        itemsBySlot[slot].map((item) => `<option value="${item.id}">${item.name}</option>`).join("");
      selects[slot].value = state.equipped[slot]?.id ?? "";
    });

    root.querySelector("#equipment-grid").innerHTML = EQUIP_SLOTS.map(
      (slot) => `
        <div class="equipment-card">
          <span>${EQUIP_SLOT_LABELS[slot]}</span>
          <strong>${state.equipped[slot]?.name ?? "未裝備"}</strong>
          <p>${renderItemStats(state.equipped[slot])}</p>
        </div>
      `,
    ).join("");
  }

  function renderCasino(state) {
    root.querySelector("#casino-log").innerHTML = state.logs.casino
      .map((line) => `<p class="log-line">${line}</p>`)
      .join("");
  }

  function renderAll(state) {
    renderResourceBar(state);
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
    root.querySelector("#battle-button").addEventListener("click", () => actions.adventure("battle"));
    root.querySelector("#travel-button").addEventListener("click", () => actions.adventure("travel"));
    root.querySelector("#forge-button").addEventListener("click", () => {
      const forgeSelection = getForgeSelection(root);
      actions.forge(forgeSelection.type, forgeSelection.name, forgeSelection.materials);
    });
    root.querySelector("#equip-button").addEventListener("click", () => {
      actions.equip({
        main: root.querySelector("#equip-main").value,
        sub: root.querySelector("#equip-sub").value,
        armor: root.querySelector("#equip-armor").value,
        helmet: root.querySelector("#equip-helmet").value,
        ring: root.querySelector("#equip-ring").value,
      });
    });

    root.querySelector("#map-list").addEventListener("click", (event) => {
      const button = event.target.closest("[data-map-id]");
      if (!button) {
        return;
      }
      actions.selectMap(button.dataset.mapId);
    });

    root.querySelector("#attribute-grid").addEventListener("click", (event) => {
      const button = event.target.closest("[data-attribute]");
      if (!button) {
        return;
      }
      actions.addAttribute(button.dataset.attribute);
    });

    root.querySelector("#forge-slot").addEventListener("change", () => renderForge(store.getState()));
    root.querySelector("#forge-name").addEventListener("input", () => renderForge(store.getState()));
    root.querySelectorAll(".forge-material").forEach((select) => {
      select.addEventListener("change", () => renderForge(store.getState()));
    });

    root.querySelector("#equip-main").addEventListener("change", () => renderEquipment(store.getState()));

    root.querySelectorAll(".casino-button").forEach((button) => {
      button.addEventListener("click", () => {
        actions.casino(button.dataset.game, Number(root.querySelector("#bet-amount").value));
      });
    });
  }

  store.subscribe(renderAll);
  bindEvents();
  setActiveView("state");
}
