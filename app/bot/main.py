import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes
from app.core.config import get_settings

# Configure logging
logging.basicConfig(
    format='[TELEGRAM_BOT] %(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

settings = get_settings()

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handler for the /start command."""
    mini_app_url = settings.telegram_mini_app_url
    
    keyboard = [
        [
            InlineKeyboardButton(
                "지금 바로 입장하기 🚀", 
                web_app=WebAppInfo(url=mini_app_url)
            )
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        "🎉 **지민코드에 오신 것을 환영합니다!**\n\n 2월코드 멤버로 선정되셨습니다.\n지금 바로 입장하여 다양한 혜택을 확인하세요!",
        reply_markup=reply_markup,
        parse_mode='Markdown'
    )

def run_bot() -> None:
    if not settings.telegram_bot_token:
        logger.error("TELEGRAM_BOT_TOKEN not set. Bot will not start.")
        return

    application = ApplicationBuilder().token(settings.telegram_bot_token).build()
    application.add_handler(CommandHandler("start", start))

    use_webhook = bool(settings.telegram_use_webhook or settings.telegram_webhook_url)
    if use_webhook:
        if not settings.telegram_webhook_url:
            logger.error("TELEGRAM_USE_WEBHOOK enabled but TELEGRAM_WEBHOOK_URL is missing.")
            return

        webhook_path = (settings.telegram_webhook_path or "/telegram/webhook").lstrip("/")
        webhook_url = settings.telegram_webhook_url.rstrip("/") + "/" + webhook_path

        logger.info(
            "Starting Telegram Bot (Webhook mode) listen=%s:%s url_path=/%s webhook_url=%s",
            settings.telegram_webhook_listen,
            settings.telegram_webhook_port,
            webhook_path,
            webhook_url,
        )

        application.run_webhook(
            listen=settings.telegram_webhook_listen,
            port=settings.telegram_webhook_port,
            url_path=webhook_path,
            webhook_url=webhook_url,
            secret_token=settings.telegram_webhook_secret_token,
            drop_pending_updates=True,
        )
        return

    logger.info("Starting Telegram Bot (Polling mode)...")
    application.run_polling(drop_pending_updates=True)

if __name__ == '__main__':
    try:
        run_bot()
    except KeyboardInterrupt:
        pass
