from aiogram import Router
from utils.middlewares import AdminOnlyMiddleware
from handlers.admin.documents import router as documents_router
from handlers.admin.stats import router as stats_router
from handlers.admin.users import router as users_router

router = Router()
router.message.middleware(AdminOnlyMiddleware())
router.callback_query.middleware(AdminOnlyMiddleware())

router.include_router(documents_router)
router.include_router(stats_router)
router.include_router(users_router)