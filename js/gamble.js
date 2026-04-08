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
    return { ok: false, message: "金幣不足，無法下注這個金額。" };
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
    lines: [`你擲出 ${player}，莊家擲出 ${dealer}。`, "平手，本局不計輸贏。"],
  };
}

export function playInBetween(playerGold, betAmount) {
  const validated = normalizeBet(playerGold, betAmount);
  if (!validated.ok) {
    return validated;
  }

  const first = drawCard();
  const second = drawCard();
  const third = drawCard();
  const low = Math.min(first, second);
  const high = Math.max(first, second);
  const win = third > low && third < high;

  return {
    ok: true,
    deltaGold: win ? Math.round(validated.bet * 1.5) : -validated.bet,
    lines: [
      `前兩張牌為 ${first} 與 ${second}，第三張翻出 ${third}。`,
      win ? `命中區間，你贏得 ${Math.round(validated.bet * 1.5)} 金幣。` : `未落在區間內，失去 ${validated.bet} 金幣。`,
    ],
  };
}

export function playCoin(playerGold, betAmount) {
  const validated = normalizeBet(playerGold, betAmount);
  if (!validated.ok) {
    return validated;
  }

  const guess = Math.random() < 0.5 ? "正面" : "反面";
  const result = flipCoin();
  const win = guess === result;

  return {
    ok: true,
    deltaGold: win ? validated.bet : -validated.bet,
    lines: [
      `你押 ${guess}，硬幣結果是 ${result}。`,
      win ? `猜中了，贏得 ${validated.bet} 金幣。` : `沒猜中，失去 ${validated.bet} 金幣。`,
    ],
  };
}
