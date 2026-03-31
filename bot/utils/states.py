from aiogram.fsm.state import State, StatesGroup


class AskTeacherState(StatesGroup):
    waiting_question = State()


class AdminState(StatesGroup):
    waiting_file = State()


class BroadcastState(StatesGroup):
    waiting_message = State()
    waiting_buttons = State()
    confirming = State()

