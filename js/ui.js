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
    name: documentRef.querySelector("#forge-name").value.trim(),
    materials: Array.from(documentRef.querySelectorAll(".forge-material")).map((select) => select.value),
  };
}

function renderItemStats(item) {
  if (!item?.stats) {
    return "未裝備";
  }
  return `攻擊 ${item.stats.atk} / 防禦 ${item.stats.def} / 幸運 ${item.stats.luck} / 耐久 ${item.stats.durability}`;
}

function getMainLabel(item) {
  return `${item.name} (${FORGEABLE_TYPES[item.subtype]?.label ?? "裝備"})`;
}

export function createUI(store, actions) {
  const root = document;
  let casinoState = null;
  let copyStatusTimer = null;

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
        return `<div class="resource-inline">${RESOURCE_LABELS[key]}<strong>${value}</strong></div>`;
      })
      .join("");
  }

  function renderState(state) {
    root.querySelector("#player-title").textContent = state.nickname || "旅人";
    root.querySelector("#state-grid").innerHTML = [
      { label: "暱稱", value: state.nickname || "旅人" },
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

    const remaining = state.attributePoints - state.pendingSpentPoints;
    root.querySelector("#attribute-points").textContent = `可配置點數：${remaining}，待確認點數：${state.pendingSpentPoints}`;
    root.querySelector("#attribute-grid").innerHTML = ATTRIBUTE_KEYS.map(
      (key) => `
        <div class="attribute-card">
          <div class="attribute-row">
            <div>
              <span>${ATTRIBUTE_LABELS[key]}</span>
              <strong class="attribute-value">${state.pendingAttributes[key]}</strong>
            </div>
            <button class="attribute-button" data-attribute="${key}">+1</button>
          </div>
          <p>目前已儲存：${state.attributes[key]}</p>
        </div>
      `,
    ).join("");

    root.querySelector("#skill-carry-info").textContent = `攜帶中 ${state.activeSkills.length} / 4`;
    root.querySelector("#save-output").value = state.saveText ?? "";
    root.querySelector("#skill-list").innerHTML =
      state.skills.length > 0
        ? state.skills
            .map((skillId) => {
              const active = state.activeSkills.includes(skillId);
              const skill = SKILL_BOOKS[skillId];
              return `<button class="tag ${active ? "tag-active" : ""}" data-skill="${skillId}">${skill.name}</button><span class="muted-inline">${skill.description}</span>`;
            })
            .join("")
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
        <p>${isBossFloor ? "本層為 Boss 層，戰鬥強度顯著提高。" : "一般樓層，可選擇刷怪或趕路。"}</p>
        <p>戰鬥前進率 7.5%，趕路前進率 70%。</p>
      </div>
    `;
  }

  function renderBattleLog(state) {
    root.querySelector("#battle-log").innerHTML = state.logs.battle
      .map((line) => {
        let className = "log-line";
        if (line.includes("獲得") || line.includes("掉落") || line.includes("前進") || line.includes("成功逃跑")) {
          className += " log-good";
        } else if (line.includes("重傷不治") || line.includes("造成")) {
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
    const capacity = FORGEABLE_TYPES[forgeState.type]?.materialLimit ?? 0;
    materialSelects.forEach((select, index) => {
      select.disabled = index >= capacity;
      if (index >= capacity) {
        select.value = "";
      }
    });
  }

  function getEquipmentSelection(state) {
    return {
      main: root.querySelector("#equip-main")?.value ?? state.equipped.main?.id ?? "",
      sub: root.querySelector("#equip-sub")?.value ?? state.equipped.sub?.id ?? "",
      armor: root.querySelector("#equip-armor")?.value ?? state.equipped.armor?.id ?? "",
      helmet: root.querySelector("#equip-helmet")?.value ?? state.equipped.helmet?.id ?? "",
      ring: root.querySelector("#equip-ring")?.value ?? state.equipped.ring?.id ?? "",
    };
  }

  function updateEquipmentForm(state, selectionOverride = null) {
    const selects = {
      main: root.querySelector("#equip-main"),
      sub: root.querySelector("#equip-sub"),
      armor: root.querySelector("#equip-armor"),
      helmet: root.querySelector("#equip-helmet"),
      ring: root.querySelector("#equip-ring"),
    };

    const currentSelection =
      selectionOverride ?? {
        main: state.equipped.main?.id ?? "",
        sub: state.equipped.sub?.id ?? "",
        armor: state.equipped.armor?.id ?? "",
        helmet: state.equipped.helmet?.id ?? "",
        ring: state.equipped.ring?.id ?? "",
      };

    const itemsBySlot = Object.fromEntries(
      EQUIP_SLOTS.map((slot) => [slot, state.inventory.filter((item) => item.slot === slot)]),
    );

    selects.main.innerHTML =
      `<option value="">不裝備</option>` +
      itemsBySlot.main.map((item) => `<option value="${item.id}">${getMainLabel(item)}</option>`).join("");
    selects.main.value = currentSelection.main;

    const selectedMainSubtype = state.inventory.find((item) => item.id === currentSelection.main)?.subtype ?? null;
    const allowedSubs = selectedMainSubtype ? SUBTYPE_COMPATIBILITY[selectedMainSubtype] ?? [] : [];

    selects.sub.innerHTML =
      `<option value="">不裝備</option>` +
      itemsBySlot.sub
        .filter((item) => allowedSubs.includes(item.subtype))
        .map((item) => `<option value="${item.id}">${item.name}</option>`)
        .join("");
    selects.sub.disabled = allowedSubs.length === 0;
    selects.sub.value = allowedSubs.includes(state.inventory.find((item) => item.id === currentSelection.sub)?.subtype)
      ? currentSelection.sub
      : "";

    ["armor", "helmet", "ring"].forEach((slot) => {
      selects[slot].innerHTML =
        `<option value="">不裝備</option>` +
        itemsBySlot[slot].map((item) => `<option value="${item.id}">${item.name}</option>`).join("");
      selects[slot].value = currentSelection[slot];
    });
  }

  function renderEquipment(state) {
    updateEquipmentForm(state);
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

  function renderCasinoControls() {
    const container = root.querySelector("#casino-controls");
    if (!casinoState) {
      container.innerHTML = "";
      return;
    }

    if (casinoState.game === "coin") {
      container.innerHTML = `
        <button class="btn btn-secondary btn-slim" data-casino-action="coin" data-casino-choice="正面">正面</button>
        <button class="btn btn-secondary btn-slim" data-casino-action="coin" data-casino-choice="反面">反面</button>
      `;
      return;
    }

    if (casinoState.game === "inBetween" && casinoState.stage === "ready") {
      container.innerHTML = `<button class="btn btn-secondary btn-slim" data-casino-action="start-in-between">開始遊戲</button>`;
      return;
    }

    if (casinoState.game === "inBetween" && casinoState.stage === "betting") {
      container.innerHTML = `<button class="btn btn-secondary btn-slim" data-casino-action="finish-in-between">下注完成</button>`;
      return;
    }

    container.innerHTML = "";
  }

  function renderCasino(state) {
    root.querySelector("#casino-log").innerHTML = state.logs.casino
      .map((line) => `<p class="log-line">${line}</p>`)
      .join("");
    renderCasinoControls();
  }

  function setCopyStatus(message) {
    root.querySelector("#copy-status").textContent = message;
    if (copyStatusTimer) {
      clearTimeout(copyStatusTimer);
    }
    copyStatusTimer = window.setTimeout(() => {
      root.querySelector("#copy-status").textContent = "";
    }, 1800);
  }

  function openSaveModal() {
    root.querySelector("#save-modal").classList.remove("is-hidden");
  }

  function closeSaveModal() {
    root.querySelector("#save-modal").classList.add("is-hidden");
  }

  function autoEquip() {
    actions.equip(getEquipmentSelection(store.getState()));
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

    root.querySelector("#save-button").addEventListener("click", () => {
      actions.generateSaveText();
      setCopyStatus("");
      openSaveModal();
    });

    root.querySelector("#copy-save-button").addEventListener("click", async () => {
      const saveText = root.querySelector("#save-output").value;
      if (!saveText) {
        return;
      }
      await navigator.clipboard.writeText(saveText);
      setCopyStatus("複製成功");
    });

    root.querySelector("#close-save-modal").addEventListener("click", closeSaveModal);
    root.querySelector("#save-modal").addEventListener("click", (event) => {
      if (event.target.id === "save-modal") {
        closeSaveModal();
      }
    });

    root.querySelector("#battle-button").addEventListener("click", () => actions.adventure("battle"));
    root.querySelector("#travel-button").addEventListener("click", () => actions.adventure("travel"));

    root.querySelector("#forge-button").addEventListener("click", () => {
      const forgeSelection = getForgeSelection(root);
      actions.forge(forgeSelection.type, forgeSelection.name, forgeSelection.materials);
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
      actions.addPendingAttribute(button.dataset.attribute);
    });

    root.querySelector("#confirm-attributes").addEventListener("click", actions.confirmAttributes);
    root.querySelector("#reset-attributes").addEventListener("click", actions.resetPendingAttributes);

    root.querySelector("#skill-list").addEventListener("click", (event) => {
      const button = event.target.closest("[data-skill]");
      if (!button) {
        return;
      }
      actions.toggleSkill(button.dataset.skill);
    });

    root.querySelector("#forge-slot").addEventListener("change", () => renderForge(store.getState()));
    root.querySelectorAll(".forge-material").forEach((select) => {
      select.addEventListener("change", () => renderForge(store.getState()));
    });

    ["#equip-main", "#equip-sub", "#equip-armor", "#equip-helmet", "#equip-ring"].forEach((selector) => {
      root.querySelector(selector).addEventListener("change", autoEquip);
    });

    root.querySelectorAll(".casino-button").forEach((button) => {
      button.addEventListener("click", () => {
        const game = button.dataset.game;
        if (game === "dice") {
          casinoState = null;
          actions.casino("dice", Number(root.querySelector("#bet-amount").value));
          renderCasino(store.getState());
          return;
        }

        if (game === "coin") {
          casinoState = { game: "coin" };
          actions.showCasinoLines(["請先選擇要猜正面還是反面。"]);
          renderCasino(store.getState());
          return;
        }

        if (game === "inBetween") {
          casinoState = { game: "inBetween", stage: "ready" };
          actions.showCasinoLines(["射龍門準備完成，按下「開始遊戲」後會先翻出兩張牌。"]);
          renderCasino(store.getState());
        }
      });
    });

    root.querySelector("#casino-controls").addEventListener("click", (event) => {
      const button = event.target.closest("[data-casino-action]");
      if (!button || !casinoState) {
        return;
      }

      const action = button.dataset.casinoAction;

      if (action === "coin") {
        actions.resolveCoin(button.dataset.casinoChoice, Number(root.querySelector("#bet-amount").value));
        casinoState = { game: "coin" };
        renderCasino(store.getState());
        return;
      }

      if (action === "start-in-between") {
        casinoState = actions.startInBetweenRound();
        renderCasino(store.getState());
        return;
      }

      if (action === "finish-in-between") {
        const result = actions.finishInBetweenRound(casinoState, Number(root.querySelector("#bet-amount").value));
        if (result) {
          casinoState = { game: "inBetween", stage: "ready" };
        }
        renderCasino(store.getState());
      }
    });
  }

  store.subscribe(renderAll);
  bindEvents();
  setActiveView("state");
}
