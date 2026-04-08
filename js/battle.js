import { DROP_RATES, ENEMIES, MAPS, MATERIAL_DEFS, SKILL_BOOKS } from "./data.js";

function rollChance(rate) {
  return Math.random() <= rate;
}

function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function getEnemyTemplate(mapId, floor) {
  const map = MAPS.find((entry) => entry.id === mapId) ?? MAPS[0];
  const isBossFloor = floor % 25 === 0;
  const enemyId = isBossFloor ? map.bossEnemy : randomFrom(map.baseEnemyPool);
  const enemy = structuredClone(ENEMIES[enemyId]);
  const floorScale = 1 + (floor - 1) * 0.04;
  return {
    map,
    isBossFloor,
    enemyId,
    enemy: {
      ...enemy,
      hp: Math.round(enemy.hp * floorScale * (isBossFloor ? 1.6 : 1)),
      atk: Math.round(enemy.atk * floorScale * (isBossFloor ? 1.35 : 1)),
      agi: Math.round(enemy.agi * (1 + (floor - 1) * 0.015)),
      exp: Math.round(enemy.exp * floorScale * (isBossFloor ? 2 : 1)),
      gold: Math.round(enemy.gold * floorScale * (isBossFloor ? 1.6 : 1)),
    },
  };
}

function getEquipmentCombatStats(equipment) {
  const bonus = { atk: 0, def: 0, luck: 0, durability: 0 };
  Object.values(equipment).forEach((item) => {
    if (!item?.stats) {
      return;
    }
    bonus.atk += item.stats.atk ?? 0;
    bonus.def += item.stats.def ?? 0;
    bonus.luck += item.stats.luck ?? 0;
    bonus.durability += item.stats.durability ?? 0;
  });
  return bonus;
}

function getPlayerStats(player) {
  const gear = getEquipmentCombatStats(player.equipped);
  return {
    maxHp: 70 + player.attributes.vit * 22 + gear.def * 3,
    atk: 6 + player.attributes.str * 4 + player.attributes.dex * 2 + gear.atk,
    def: 2 + player.attributes.vit * 3 + gear.def,
    agi: 4 + player.attributes.agi * 3,
    luck: player.attributes.luck * 2 + gear.luck,
  };
}

function resolveSkill(player, combatStats, currentHp, isFirstTurn) {
  if (isFirstTurn && player.skills.includes("focus") && rollChance(0.25 + combatStats.luck * 0.005)) {
    return { label: "集中射擊", extra: Math.round(combatStats.atk * 0.45) };
  }

  if (currentHp <= combatStats.maxHp * 0.5 && player.skills.includes("burst") && rollChance(0.18 + combatStats.luck * 0.004)) {
    return { label: "破甲連擊", extra: Math.round(combatStats.atk * 0.6) };
  }

  return null;
}

function rollDrops(enemy, floor) {
  const materialRate = Math.min(0.88, DROP_RATES.material + floor * 0.004);
  const skillRate = Math.min(0.28, DROP_RATES.skill + floor * 0.0015);
  const drops = [];

  enemy.drops.forEach((dropId) => {
    if (MATERIAL_DEFS[dropId] && rollChance(materialRate)) {
      drops.push({ type: "material", id: dropId, label: MATERIAL_DEFS[dropId].name });
    }

    if (SKILL_BOOKS[dropId] && rollChance(skillRate)) {
      drops.push({ type: "skill", id: dropId, label: SKILL_BOOKS[dropId].name });
    }
  });

  return drops;
}

export function createEncounter(mapId, floor) {
  return getEnemyTemplate(mapId, floor);
}

export function runAdventure(player, mode = "battle") {
  const mapState = player.mapProgress[player.selectedMapId];
  const floor = mapState.floor;
  const encounter = createEncounter(player.selectedMapId, floor);
  const stats = getPlayerStats(player);
  const logs = [
    `你來到「${encounter.map.name}」第 ${floor} 層。`,
    encounter.isBossFloor ? `本層為 Boss 層，遭遇 ${encounter.enemy.name}。` : `遭遇 ${encounter.enemy.name}。`,
  ];

  if (mode === "travel") {
    const successRate = encounter.isBossFloor ? 0.18 : 0.72;
    if (rollChance(successRate)) {
      return {
        mode,
        logs: [...logs, "你成功趕路，避開正面衝突並前往更高樓層。"],
        victory: false,
        climbed: 1,
        floor,
      };
    }

    logs.push("趕路途中被攔下，只能強制進入戰鬥。");
  }

  let playerHp = stats.maxHp;
  let enemyHp = encounter.enemy.hp;
  let round = 1;
  const playerFirst = stats.agi >= encounter.enemy.agi;

  // 戰鬥與趕路共用同一份戰鬥核心，差異只在進戰率與戰後上樓率。
  while (playerHp > 0 && enemyHp > 0 && round <= 12) {
    logs.push(`第 ${round} 回合。`);
    const turnOrder = playerFirst ? ["player", "enemy"] : ["enemy", "player"];

    for (const actor of turnOrder) {
      if (playerHp <= 0 || enemyHp <= 0) {
        break;
      }

      if (actor === "player") {
        let damage = Math.max(3, stats.atk + Math.floor(Math.random() * 6) - Math.round(encounter.enemy.atk * 0.08));
        const skill = resolveSkill(player, stats, playerHp, round === 1);
        if (skill) {
          damage += skill.extra;
          logs.push(`你自動施放【${skill.label}】。`);
        }
        enemyHp = Math.max(0, enemyHp - damage);
        logs.push(`你造成 ${damage} 點傷害，敵方剩餘 ${enemyHp} HP。`);
      } else {
        let damage = Math.max(2, encounter.enemy.atk + Math.floor(Math.random() * 5) - stats.def);
        if (player.skills.includes("guard") && rollChance(0.18 + stats.luck * 0.003)) {
          damage = Math.max(1, Math.round(damage * 0.6));
          logs.push("【穩固守勢】發動，傷害被壓低。");
        }
        playerHp = Math.max(0, playerHp - damage);
        logs.push(`${encounter.enemy.name} 造成 ${damage} 點傷害，你剩餘 ${playerHp} HP。`);
      }
    }

    round += 1;
  }

  if (enemyHp <= 0) {
    const climbRate = mode === "battle" ? 0.28 : 0.56;
    const climbed = rollChance(climbRate) ? 1 : 0;
    const rewards = {
      exp: encounter.enemy.exp,
      gold: encounter.enemy.gold,
      drops: rollDrops(encounter.enemy, floor),
    };
    logs.push(`你擊敗 ${encounter.enemy.name}，獲得 ${rewards.exp} EXP 與 ${rewards.gold} 金幣。`);
    rewards.drops.forEach((drop) => logs.push(`掉落：${drop.label}`));
    logs.push(climbed ? "你順勢往上推進了一層。" : "你停留在原層，準備繼續周回。");

    return {
      mode,
      logs,
      victory: true,
      climbed,
      floor,
      rewards,
    };
  }

  logs.push("你撤退了，這次沒有帶回戰利品。");
  return {
    mode,
    logs,
    victory: false,
    climbed: 0,
    floor,
  };
}
