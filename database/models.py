from sqlalchemy import Boolean, Column, Table, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from typing import List
from typing import Optional
from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column
from sqlalchemy.orm import relationship
from .database import Base


"""
Associative table between Exercise and EducItemId
"""
exercise_educ_item = Table(
    "exercise_educ_item",
    Base.metadata,
    Column("exercise_id", Integer, ForeignKey("exercise.exercise_id"), primary_key=True),
    Column("educ_item_id", Integer, ForeignKey("educitemdata.id"), primary_key=True),
)


class User(Base):
    __tablename__ = "user"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    pseudo: Mapped[str] = mapped_column(String(30))
    email: Mapped[str] = mapped_column(unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column()
    is_active: Mapped[bool] = mapped_column(default=True)

    educ_items_masteries: Mapped[List["EducItemMastery"]] = relationship(back_populates="user")
    exercises_written: Mapped[List["Exercise"]] = relationship()


class EducItemData(Base):
    __tablename__ = "educitemdata"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    type: Mapped[int] = mapped_column()
    code: Mapped[str] = mapped_column(default="")
    title: Mapped[str] = mapped_column(index=True)
    description: Mapped[str] = mapped_column(index=True)


class EducItemLink(Base):
    """
    Associative table between two EducItemData in a SkillGraph.
    """
    __tablename__ = "educitemlink"

    item_start_id: Mapped[int] = mapped_column(ForeignKey("educitemdata.id"), primary_key=True)
    item_end_id: Mapped[int] = mapped_column(ForeignKey("educitemdata.id"), primary_key=True)
    skill_graph_id: Mapped[int] = mapped_column(ForeignKey("skillgraph.id"), primary_key=True)
    link_name: Mapped[str] = mapped_column(default="")


class SkillGraph(Base):

    __tablename__ = "skillgraph"

    id: Mapped[int] = mapped_column(autoincrement=True, primary_key=True)
    title: Mapped[str] = mapped_column(default="")
    description: Mapped[str] = mapped_column(default="")

class EducItemGraph(Base):
    """
    Associative table between an EducItemData and a Graph. An EducItem can be
    present in several SkillGraph.
    """
    __tablename__ = "educitemgraph"

    educitem_id: Mapped[int] = mapped_column(ForeignKey("educitemdata.id"), primary_key=True)
    skill_graph_id: Mapped[int] = mapped_column(ForeignKey("skillgraph.id"), primary_key=True)

class EducItemMastery(Base):
    """
    Associative table between a User an EducItemData : each user has
    a mastery level on each existing EducItem.
    """
    __tablename__ = "educitemuser"

    educitem_id: Mapped[int] = mapped_column(ForeignKey("educitemdata.id"), primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("user.id"), primary_key=True)
    mastery: Mapped[float] = mapped_column()

    user: Mapped["User"] = relationship()
    educ_item: Mapped["EducItemData"] = relationship()


class Exercise(Base):
    """
    Basic data for all kind of exercises.
    """
    __tablename__ = "exercise"

    exercise_id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    title: Mapped[str] = mapped_column(index=True)
    difficulty: Mapped[int] = mapped_column()
    author_id: Mapped[int] = mapped_column(ForeignKey("user.id"))

    educ_items_id: Mapped[List["EducItemData"]] = relationship(secondary=exercise_educ_item)


class StaticExerciseAnswer(Base):
    __tablename__ = "static_exercise_answer"

    id_answer: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    id_author: Mapped[int] = mapped_column(ForeignKey("user.id"))
    id_exercise: Mapped[int] = mapped_column(ForeignKey("static_exercise.exercise_id"))
    answer_text: Mapped[str] = mapped_column()

    static_exercise: Mapped["StaticExercise"] = relationship()


class StaticExercise(Base):
    """
    Exercise with a static content. Can have multiple answers.
    """
    __tablename__ = "static_exercise"

    exercise_id: Mapped[int] = mapped_column(ForeignKey("exercise.exercise_id"), primary_key=True)
    content: Mapped[str] = mapped_column()





