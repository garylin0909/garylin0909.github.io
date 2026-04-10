function rollDie() {
  return Math.floor(Math.random() * 6) + 1;
}

function drawCard() {
  return Math.floor(Math.random() * 13) + 1;
}

function flipCoin() {
  return Math.random() < 0.5 ? "正面" : "反面";
}

function normalizeBet(playerGold, betAmount, minimum = 1) {
  const bet = Number(betAmount);
  if (!Number.isInteger(bet) || bet < minimum) {
    return { ok: false, message: `下注金額必須是大於等於 ${minimum} 的整數。` };
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

export function createInBetweenRound() {
  const first = drawCard();
  const second = drawCard();
  const low = Math.min(first, second);
  const high = Math.max(first, second);

  return {
    ok: true,
    pending: true,
    game: "inBetween",
    payload: { low, high },
    lines: [`兩張牌翻出：${low}、${high}。`, "請輸入至少 100 金幣，然後按下「下注完成」。"],
  };
}

export function resolveInBetween(playerGold, betAmount, payload) {
  const validated = normalizeBet(playerGold, betAmount, 100);
  if (!validated.ok) {
    return validated;
  }

  const third = drawCard();
  let deltaGold = 0;
  let resultText = "";

  if (third > payload.low && third < payload.high) {
    deltaGold = validated.bet;
    resultText = `第三張牌是 ${third}，落在中間，你贏得 ${validated.bet} 金幣。`;
  } else if (third === payload.low || third === payload.high) {
    deltaGold = -validated.bet * 2;
    resultText = `第三張牌是 ${third}，剛好撞到邊牌，你失去 ${validated.bet * 2} 金幣。`;
  } else {
    deltaGold = -validated.bet;
    resultText = `第三張牌是 ${third}，落在區間外，你失去 ${validated.bet} 金幣。`;
  }

  return {
    ok: true,
    deltaGold,
    lines: [`兩張牌是 ${payload.low}、${payload.high}。`, resultText],
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
