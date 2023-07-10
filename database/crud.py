from sqlalchemy.orm import Session

from . import models, schemas


def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()


def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()


def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.User).offset(skip).limit(limit).all()


# TODO: hash and salt the password...
def create_user(db: Session, user: schemas.UserCreate):
    fake_hashed_password = user.password + "notreallyhashed"
    db_user = models.User(email=user.email, hashed_password=fake_hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def get_items(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Item).offset(skip).limit(limit).all()


def create_educ_item(db: Session, educ_item: schemas.EducItemData):
    db_educ_item = models.EducItemData(id=educ_item.id,
                                       code=educ_item.code,
                                       title=educ_item.title,
                                       description=educ_item.description)
    db.add(db_educ_item)
    db.commit()
    db.refresh(db_educ_item)
    return db_educ_item


def get_educ_items(db: Session, skip: int = 0, limit: int = 1000):
    return db.query(models.EducItemData).offset(skip).limit(limit).all()


def create_exercise(db: Session, exercise: schemas.Exercise):
    db_exercise = models.Exercise(id_exercise=exercise.id,
                                  title=exercise.title,
                                  difficulty=exercise.difficulty,
                                  author=exercise.author,
                                  educ_items=exercise.educ_items)



def get_exercise_by_id(db: Session, id: int):
    pass


def create_static_exercise(db: Session, exercise: schemas.StaticExercise):
    pass


def create_static_exercise_answer(db: Session, answer: schemas.StaticExerciseAnswer):
    pass
