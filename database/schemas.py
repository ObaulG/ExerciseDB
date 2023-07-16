from pydantic import BaseModel
from enum import IntEnum


class EducItemType(IntEnum):
    KNOWLEDGE = 1
    SKILL = 2
    COMPETENCE = 3


class EducItemData(BaseModel):
    """
    Describes the basic data of a educational item. The item should be linkable to other items,
    thus forming a graph.
    """
    id: int
    type: EducItemType
    code: str = ""
    title: str
    description: str


class EducItemDataSubmit(BaseModel):
    """
    Data sent by a client to submit an EducItemData
    """
    title: str
    type: int
    description: str


class EducItemMastery(BaseModel):
    """
    Describe a mastery level of a EducItem.
    """
    id_educ_item: int
    mastery: int


class EducItemNode(BaseModel):
    """
    Representation of a COMPER educational skill.
    """
    educ_item: EducItemData
    composed_of: list
    exercises: list
    lesson: list


class SkillReferential(BaseModel):
    educ_nodes: list[EducItemNode]


class UserBase(BaseModel):
    pseudo: str
    email: str


class UserCreate(UserBase):
    password: str


class User(UserBase):
    id: int
    is_active: bool
    educ_items: list[EducItemMastery] = []

    class Config:
        orm_mode = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: str


class BaseExercise(BaseModel):
    title: str
    difficulty: int
    author: User
    educ_items: list[EducItemData]


class Exercise(BaseExercise):
    """
    An exercise should train one or multiple skills.
    """
    exercise_id: int


class StaticExerciseSubmit(BaseModel):
    title: str
    difficulty: int
    author: User
    educ_items: list[EducItemData]
    ex_content: str
    ex_answer: str


class StaticExerciseAnswer(BaseModel):
    id_answer: int
    id_author: int
    answer_text: str


class StaticExercise(BaseModel):
    id_exercise: int
    content: str
    answers: list[StaticExerciseAnswer]
