import { ENEMIES, MAPS, MATERIAL_DEFS, SKILL_BOOKS } from "./data.js";

function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function rollChance(rate) {
  return Math.random() <= rate;
}

function getEnemyByMap(mapId) {
  const map = MAPS.find((entry) => entry.id === mapId) ?? MAPS[0];
  const enemyId = randomFrom(map.enemyPool);
  return { map, enemyId, enemy: structuredClone(ENEMIES[enemyId]) };
}

function getPlayerDerivedStats(player) {
  const equipmentBonus = Object.values(player.equipment).reduce(
    (accumulator, item) => {
      if (!item?.stats) {
        return accumulator;
      }

      Object.entries(item.stats).forEach(([stat, value]) => {
        accumulator[stat] = (accumulator[stat] ?? 0) + value;
      });

      return accumulator;
    },
    {},
  );

  return {
    hpMax: player.hpMax + (equipmentBonus.hp ?? 0),
    str: player.str + (equipmentBonus.str ?? 0),
    agi: player.agi + (equipmentBonus.agi ?? 0),
    dex: player.dex + (equipmentBonus.dex ?? 0),
    luck: player.luck + (equipmentBonus.luck ?? 0),
    guard: player.skills.includes("guard") ? 0.88 : 1,
  };
}

function resolvePlayerSkill(player, derivedStats, currentHp, round) {
  if (player.skills.includes("focus") && round === 1 && rollChance(0.35 + player.dex * 0.01)) {
    return {
      label: "集中射擊",
      multiplier: 1.6,
      flatBonus: Math.round(derivedStats.dex * 1.25),
    };
  }

  if (
    player.skills.includes("burst") &&
    currentHp <= derivedStats.hpMax * 0.5 &&
    rollChance(0.28 + player.luck * 0.01)
  ) {
    return {
      label: "破甲連擊",
      multiplier: 1.8,
      flatBonus: 6,
    };
  }

  return null;
}

function runDrops(enemy) {
  const drops = [];

  enemy.drops.forEach((drop) => {
    if (!rollChance(drop.rate)) {
      return;
    }

    if (drop.type === "material") {
      drops.push({ ...drop, label: MATERIAL_DEFS[drop.id].name });
    }

    if (drop.type === "skill") {
      drops.push({ ...drop, label: SKILL_BOOKS[drop.id].name });
    }
  });

  return drops;
}

export function createEncounter(mapId) {
  return getEnemyByMap(mapId);
}

export function runAutoBattle(player, mapId) {
  const { map, enemyId, enemy } = createEncounter(mapId);
  const derivedStats = getPlayerDerivedStats(player);
  const battleState = {
    mapName: map.name,
    enemyId,
    enemyName: enemy.name,
    playerHp: derivedStats.hpMax,
    enemyHp: enemy.hp,
    logs: [`你踏入「${map.name}」，遭遇 ${enemy.name}。`],
    victory: false,
  };

  const playerFirst = derivedStats.agi >= enemy.agi;
  let round = 1;

  // 自動戰鬥以回合制跑完整個流程。
  // 若之後要加入 DOT、暈眩、召喚物或多段技能，擴充這個 while 內的 turn phase 即可。
  while (battleState.playerHp > 0 && battleState.enemyHp > 0 && round <= 10) {
    battleState.logs.push(`第 ${round} 回合開始。`);
    const turnOrder = playerFirst ? ["player", "enemy"] : ["enemy", "player"];

    for (const actor of turnOrder) {
      if (battleState.playerHp <= 0 || battleState.enemyHp <= 0) {
        break;
      }

      if (actor === "player") {
        const skill = resolvePlayerSkill(player, derivedStats, battleState.playerHp, round);
        let damage = Math.max(3, derivedStats.str + Math.floor(Math.random() * 6));

        if (skill) {
          damage = Math.round(damage * skill.multiplier + skill.flatBonus);
          battleState.logs.push(`你自動施放【${skill.label}】。`);
        }

        battleState.enemyHp = Math.max(0, battleState.enemyHp - damage);
        battleState.logs.push(`你對 ${enemy.name} 造成 ${damage} 點傷害，敵方剩餘 ${battleState.enemyHp} HP。`);
      } else {
        let damage = Math.max(2, enemy.str + Math.floor(Math.random() * 5));
        damage = Math.round(damage * derivedStats.guard);
        battleState.playerHp = Math.max(0, battleState.playerHp - damage);
        battleState.logs.push(`${enemy.name} 反擊造成 ${damage} 點傷害，你剩餘 ${battleState.playerHp} HP。`);
      }
    }

    round += 1;
  }

  if (battleState.enemyHp <= 0) {
    const drops = runDrops(enemy);
    battleState.victory = true;
    battleState.rewards = {
      exp: enemy.exp,
      gold: enemy.gold,
      drops,
    };
    battleState.logs.push(`你擊敗了 ${enemy.name}，獲得 ${enemy.exp} EXP 與 ${enemy.gold} 金幣。`);

    drops.forEach((drop) => {
      if (drop.type === "material") {
        battleState.logs.push(`掉落材料：${drop.label}`);
      }

      if (drop.type === "skill") {
        battleState.logs.push(`掉落技能書：${drop.label}`);
      }
    });
  } else {
    battleState.logs.push("你被迫撤退，這次沒有帶回戰利品。");
  }

  return battleState;
}
