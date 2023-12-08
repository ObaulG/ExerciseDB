from sqlalchemy.orm import Session

from . import models, schemas


def get_user_by_id(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()


def get_user_by_pseudo(db: Session, pseudo: str):
    return db.query(models.User).filter(models.User.pseudo == pseudo).first()


def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()


def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.User).offset(skip).limit(limit).all()


# TODO: hash and salt the password...
def create_user(db: Session, user: schemas.UserCreate):
    fake_hashed_password = user.password + "notreallyhashed"
    db_user = models.User(pseudo=user.pseudo,
                          email=user.email,
                          hashed_password=fake_hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def get_educ_items(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.EducItemData).offset(skip).limit(limit).all()


# TODO: should be removed because we are adding a SkillGraph editor
def create_educ_item_from_submit(db: Session, educ_item: schemas.EducItemDataSubmit):
    """
    Create an EducItem from a submission. Its id and code should be generated.
    :param db:
    :param educ_item:
    :return: the row saved in the db
    """
    db_educ_item = models.EducItemData(title=educ_item.title,
                                       code=str(educ_item.type),
                                       type=educ_item.type,
                                       description=educ_item.description)
    db.add(db_educ_item)
    db.commit()
    db.refresh(db_educ_item)
    return db_educ_item


def create_educ_item_mastery_for_user(db: Session):
    pass


def get_educ_items(db: Session, skip: int = 0, limit: int = 1000):
    return db.query(models.EducItemData).offset(skip).limit(limit).all()


# /\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
# GraphSkill functions
# /\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
def create_new_graphskill(db: Session, graphcreate_data: schemas.SkillGraphCreate):
    db_graph = models.SkillGraph(title=graphcreate_data.title, description=graphcreate_data.description)

    db.add(db_graph)
    db.commit()
    db.refresh(db_graph)
    return db_graph


def get_graphskills(db: Session, skip: int = 0, limit: int = 1000):
    return (db.query(models.SkillGraph)
            .offset(skip)
            .limit(limit)
            .all())


def get_graphskill_nodes(db: Session, graph_id: int):
    return (db.query(models.EducItemGraph)
            .filter(models.EducItemGraph.skill_graph_id == graph_id)
            .all())


def get_graphskill_edges(db: Session, graph_id: int):
    return (db.query(models.EducItemLink)
            .filter(models.EducItemLink.skill_graph_id == graph_id)
            .all())


def add_edge_in_graph(db: Session, edge: schemas.SkillGraphEdge):
    pass
def update_edge_from_graph(db: Session, graph_edge: schemas.SkillGraphEdge):
    pass
def remove_edge_from_graph(db: Session, graph_edge: schemas.SkillGraphEdge):
    pass


# /\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
# Exercise functions
# /\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
def create_exercise_from_submit(db: Session, exercise: schemas.BaseExercise):
    db_exercise = models.Exercise(title=exercise.title,
                                  difficulty=exercise.difficulty,
                                  author=exercise.author,
                                  educ_items=exercise.educ_items)
    db.add(db_exercise)
    db.commit()
    db.refresh(db_exercise)
    return db_exercise


def create_static_exercise(db: Session, exercise: schemas.StaticExercise):
    db_static_exercise = models.StaticExercise(id_exercise=exercise.id_exercise,
                                               content=exercise.content,
                                               answers=exercise.answers)
    db.add(db_static_exercise)
    db.commit()
    db.refresh(db_static_exercise)
    return db_static_exercise


def get_exercise_by_id(db: Session, id: int):
    pass


def create_static_exercise(db: Session, exercise: schemas.StaticExercise):
    pass


def create_static_exercise_answer(db: Session, answer: schemas.StaticExerciseAnswer):
    pass


def get_exercises_from_skill(db: Session, answer: schemas.EducItemList):
    pass
