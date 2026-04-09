function rollDie() {
  return Math.floor(Math.random() * 6) + 1;
}

function drawCard() {
  return Math.floor(Math.random() * 13) + 1;
}

function flipCoin() {
  return Math.random() < 0.5 ? "正面" : "反面";
}

function normalizeBet(playerGold, betAmount) {
  const bet = Number(betAmount);
  if (!Number.isInteger(bet) || bet <= 0) {
    return { ok: false, message: "下注金額必須是大於 0 的整數。" };
  }

  if (bet > playerGold) {
    return { ok: false, message: "金幣不足，無法進行這次下注。" };
  }

  return { ok: true, bet };
}

export function playDice(playerGold, betAmount) {
  const validated = normalizeBet(playerGold, betAmount);
  if (!validated.ok) {
    return validated;
  }

  const player = rollDie();
  const dealer = rollDie();

  if (player > dealer) {
    return {
      ok: true,
      deltaGold: validated.bet,
      lines: [`你擲出 ${player}，莊家擲出 ${dealer}。`, `你獲勝，贏得 ${validated.bet} 金幣。`],
    };
  }

  if (player < dealer) {
    return {
      ok: true,
      deltaGold: -validated.bet,
      lines: [`你擲出 ${player}，莊家擲出 ${dealer}。`, `你落敗，失去 ${validated.bet} 金幣。`],
    };
  }

  return {
    ok: true,
    deltaGold: 0,
    lines: [`你擲出 ${player}，莊家擲出 ${dealer}。`, "平手，這局不計輸贏。"],
  };
}

export function setupInBetween(playerGold, betAmount) {
  const validated = normalizeBet(playerGold, betAmount);
  if (!validated.ok) {
    return validated;
  }

  const first = drawCard();
  const second = drawCard();
  const low = Math.min(first, second);
  const high = Math.max(first, second);

  return {
    ok: true,
    pending: true,
    game: "inBetween",
    bet: validated.bet,
    payload: { first, second, low, high },
    lines: [`前兩張牌是 ${first} 和 ${second}。`, "請選擇要賭第三張牌「大」還是「小」。"],
  };
}

export function resolveInBetween(playerGold, betAmount, guess, payload) {
  const validated = normalizeBet(playerGold, betAmount);
  if (!validated.ok) {
    return validated;
  }

  const third = drawCard();
  const win = guess === "big" ? third > payload.high : third < payload.low;

  return {
    ok: true,
    deltaGold: win ? validated.bet : -validated.bet,
    lines: [
      `前兩張牌是 ${payload.first} 和 ${payload.second}，你選擇賭${guess === "big" ? "大" : "小"}。`,
      `第三張牌翻出 ${third}。`,
      win ? `你猜中了，贏得 ${validated.bet} 金幣。` : `沒有猜中，失去 ${validated.bet} 金幣。`,
    ],
  };
}

export function setupCoin(playerGold, betAmount) {
  const validated = normalizeBet(playerGold, betAmount);
  if (!validated.ok) {
    return validated;
  }

  return {
    ok: true,
    pending: true,
    game: "coin",
    bet: validated.bet,
    lines: ["請先選擇要猜正面還是反面。"],
  };
}

export function resolveCoin(playerGold, betAmount, guess) {
  const validated = normalizeBet(playerGold, betAmount);
  if (!validated.ok) {
    return validated;
  }

  const result = flipCoin();
  const win = guess === result;

  return {
    ok: true,
    deltaGold: win ? validated.bet : -validated.bet,
    lines: [
      `你選擇 ${guess}。`,
      `硬幣結果是 ${result}。`,
      win ? `你猜中了，贏得 ${validated.bet} 金幣。` : `你沒猜中，失去 ${validated.bet} 金幣。`,
    ],
  };
}
