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
    code: str
    title: str
    description: str


class EducItemMastery(BaseModel):
    """
    Describe a mastery level of a EducItem.
    """
    id_user: int
    id_educitem: int
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