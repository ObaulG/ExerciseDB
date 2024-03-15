from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel
from enum import IntEnum

# /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\
# App Schemas (Users and Auth)
# \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/

class EducItemType(IntEnum):
    KNOWLEDGE = 1
    SKILL = 2
    COMPETENCE = 3


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

# /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\
# Client input Schemas
# \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/

class EducFrameworkCreate(BaseModel):
    title: str
    description: str

class EducItemDataCreate(BaseModel):
    """
    Describes the basic data of an educational item created by a client.
    """
    title: str
    type: str
    description: str


class EducItemDataUpdate(BaseModel):
    """
    Data sent by a client to update an EducItemData when it is created in the graph.
    """
    id: str
    title: str
    type: str
    description: str
    x: Optional[float] = 0.0
    y: Optional[float] = 0.0

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

class EdgeItemUpdate(BaseModel):
    source_id: str
    target_id: str
    label: str
    properties: dict

class EducItemMastery(BaseModel):
    """
    Describe a mastery level of a EducItem.
    """
    id_educ_item: int
    mastery: int



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

# /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\ /\
# Neo4j Schemas
# \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/ \/


# Node response models
class NodeBase(BaseModel):
    node_id: str
    labels: list[str]


class Node(NodeBase):
    properties: Optional[dict] = None


class Nodes(BaseModel):
    nodes: list[Node]

class Relationship(BaseModel):
    """
    Relationship data from Neo4j queries. We should not hold
    all the nodes data, just their ids.
    """
    relationship_id: Optional[str]
    relationship_type: str
    source_node_id: str
    target_node_id: str
    properties: Optional[dict] = None

class Edge(BaseModel):
    """
    Edge data from the JS application.
    source and target are Node ids.
    """
    source: str
    target: str
    label: str
    properties: Optional[dict] = None

class Edges(BaseModel):
    edges: list[Edge]

# Relationship response models
class Relationships(BaseModel):
    relationships: List[Relationship]

class GraphNodesEdges(BaseModel):
    nodes_count: Optional[int]
    edges_count: Optional[int]
    nodes: Nodes
    edges: Edges

# Query response model
class Query(BaseModel):
    response: list