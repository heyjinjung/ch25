import asyncio
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
                "Open Mini App", 
                web_app=WebAppInfo(url=mini_app_url)
            )
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        "Welcome to the XMAS 1Week Event!\nClick the button below to start playing.",
        reply_markup=reply_markup
    )

async def run_bot():
    if not settings.telegram_bot_token:
        logger.error("TELEGRAM_BOT_TOKEN not set. Bot will not start.")
        return

    # Create the Application
    application = ApplicationBuilder().token(settings.telegram_bot_token).build()
    
    # Add handlers
    application.add_handler(CommandHandler("start", start))
    
    # Start the bot
    logger.info("Starting Telegram Bot (Polling mode)...")
    
    # Run polling in the current event loop
    # Note: run_polling is normally a blocking call that manages its own loop.
    # Since we want to call this from __main__ with asyncio.run, we use this carefully.
    await application.initialize()
    await application.start()
    await application.updater.start_polling()
    
    # Keep it running until interrupted
    try:
        while True:
            await asyncio.sleep(1)
    except (KeyboardInterrupt, asyncio.CancelledError):
        logger.info("Stopping bot...")
    finally:
        await application.updater.stop()
        await application.stop()
        await application.shutdown()

if __name__ == '__main__':
    try:
        asyncio.run(run_bot())
    except KeyboardInterrupt:
        pass
