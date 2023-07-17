from sqlalchemy import Boolean, Column, Table, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from typing import List
from typing import Optional
from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column
from sqlalchemy.orm import relationship
from .databse import Base


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

    users: Mapped[List["User"]] = relationship()


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

    exercise_id: Mapped[int] = Column(primary_key=True, index=True, autoincrement=True)
    title: Mapped[float] = Column(index=True)
    difficulty: Mapped[int] = Column()
    author_id: Mapped[int] = Column(ForeignKey("user.id"))

    educ_items_id: Mapped[List["EducItemData"]] = relationship()


class StaticExerciseAnswer(Base):
    __tablename__ = "static_exercise_answer"

    id_answer: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    id_author: Mapped[int] = mapped_column(ForeignKey("user.id"))
    answer_text: Mapped[str] = mapped_column()


class StaticExercise(Base):
    """
    Exercise with a static content. Can have multiple answers.
    """
    __tablename__ = "static_exercise"

    id_exercise: Mapped[int] = mapped_column(ForeignKey("exercise.exercise_id"), primary_key=True)
    content: Mapped[str] = mapped_column()

    answers: Mapped["StaticExerciseAnswer"] = relationship()


exercise_educ_item = Table(
    "exercise_educ_item",
    Base.metadata,
    Column("exercise_id", ForeignKey("exercise.exercise_id"), primary_key=True),
    Column("educ_item_id", ForeignKey("educitemdata.id"), primary_key=True),
)

