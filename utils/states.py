from aiogram.fsm.state import State, StatesGroup


class AskTeacherState(StatesGroup):
    waiting_question = State()


class AdminState(StatesGroup):
    waiting_file = State()
