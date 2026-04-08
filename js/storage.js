import { STORAGE_KEY } from "./data.js";

function toBase64Unicode(text) {
  return btoa(unescape(encodeURIComponent(text)));
}

function fromBase64Unicode(encodedText) {
  return decodeURIComponent(escape(atob(encodedText)));
}

export function encodeSaveData(data) {
  const payload = {
    version: 1,
    checksum: Object.keys(data).length,
    data,
  };

  return toBase64Unicode(JSON.stringify(payload));
}

export function decodeSaveData(encoded) {
  try {
    const parsed = JSON.parse(fromBase64Unicode(encoded));
    return parsed?.data ?? null;
  } catch (error) {
    console.warn("讀取存檔失敗，將改用預設進度。", error);
    return null;
  }
}

export function saveToStorage(data) {
  localStorage.setItem(STORAGE_KEY, encodeSaveData(data));
}

export function loadFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  return decodeSaveData(raw);
}

export function clearStorage() {
  localStorage.removeItem(STORAGE_KEY);
}
