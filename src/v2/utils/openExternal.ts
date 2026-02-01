export const openExternal = (url: string) => {
  const tg = (window as any)?.Telegram?.WebApp;

  try {
    if (
      typeof tg?.openTelegramLink === "function" &&
      url.startsWith("https://t.me")
    ) {
      tg.openTelegramLink(url);
      return;
    }

    if (typeof tg?.openLink === "function") {
      tg.openLink(url);
      return;
    }
  } catch {
    // ignore and fallback
  }

  window.open(url, "_blank", "noopener,noreferrer");
};
