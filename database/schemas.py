from datetime import datetime
from typing import Optional, List

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

class EducItemList(BaseModel):
    educ_item_id_list: list[int]

class SkillReferential(BaseModel):
    educ_nodes: list[EducItemNode]


class SkillGraphCreate(BaseModel):
    title: str
    description: str

class SkillGraphData(SkillGraphCreate):
    id: str

class ListSkillGraphData(BaseModel):
    skillgraphs: list[SkillGraphData]

class SkillGraphNode(BaseModel):
    graph_id: int
    node_id: int

class SkillGraphNodeData(SkillGraphNode):
    node_data: EducItemData


class SkillGraphEdge(BaseModel):
    graph_id: int
    node_start: int
    node_end: int
    link_name: str = ""

class UserBase(BaseModel):
    pseudo: str
    email: str


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


class User(UserLogin):
    id: int
    is_active: bool
    educ_items: list[EducItemMastery] = []

    class Config:
        orm_mode = True

# User response models from Neo4j Database
class UserNeo4j(BaseModel):
    username: str
    password: str
    pseudo: str
    full_name: Optional[str] = None
    joined: Optional[datetime] = None
    disabled: Optional[bool] = None


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: str


class BaseExercise(BaseModel):
    title: str
    difficulty: int
    author_id: int
    educ_items: list[str]


class Exercise(BaseExercise):
    """
    An exercise should train one or multiple skills.
    """
    exercise_id: int


class StaticExerciseAnswer(BaseModel):
    id_answer: int
    id_author: int
    answer_text: str

class StaticExerciseSubmit(BaseModel):
    title: str
    difficulty: int
    educ_items_id: list[int]
    ex_content: str
    ex_answer: Optional[StaticExerciseAnswer]

class StaticExercise(BaseModel):
    id_exercise: int
    id_author: int
    content: str
    answers: list[StaticExerciseAnswer]


class Exercises(BaseModel):
    exercises: list[StaticExercise]

# Node response models
class NodeBase(BaseModel):
    node_id: int
    labels: list


class Node(NodeBase):
    properties: Optional[dict] = None


class Nodes(BaseModel):
    nodes: List[Node]

class Relationship(BaseModel):
    relationship_id: int
    relationship_type: str
    source_node: Node
    target_node: Node
    properties: Optional[dict] = None

class Edge(BaseModel):
    """
    Edge data from the JS application.
    source and target are Node ids.
    """
    source: str
    target: str
    label: str
# Relationship response models
class Relationships(BaseModel):
    relationships: List[Relationship]

class GraphNodesEdges(BaseModel):
    nodes_count: Optional[int]
    relationships_count: Optional[int]
    nodes: Nodes
    relationships: Relationships

# Query response model
class Query(BaseModel):
    response: list