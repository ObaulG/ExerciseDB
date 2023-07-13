import os

from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy.orm import Session

from database import crud, models, schemas
from database.databse import SessionLocal, engine

from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from database.schemas import EducItemDataSubmit

from fastapi.middleware.cors import CORSMiddleware

models.Base.metadata.create_all(bind=engine)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
static_dir = os.path.join(os.path.dirname(__file__), "static")
app.mount("/",
          StaticFiles(directory=static_dir, html=True),
          name="static")


# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def retrieve_document_as_str(path: str) -> str:
    doc = ""
    with open(path, 'r') as f:
        doc = f.read()
    return doc


@app.post("/users/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db=db, user=user)


@app.get("/users/all", response_model=list[schemas.User])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    users = crud.get_users(db, skip=skip, limit=limit)
    return users


@app.get("/users/{user_id}", response_model=schemas.User)
def read_user(user_id: int, db: Session = Depends(get_db)):
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user


@app.post("/exercises/", response_model=schemas.User)
def create_exercise(exercise: schemas.Exercise, db: Session = Depends(get_db)):
    pass


@app.get("/exercises/{exercise_id}", response_model=schemas.Exercise)
def get_exercise_by_id(exercise_id: int, db: Session = Depends(get_db)):
    pass


@app.get("/skills/all")
def get_skills_list(db: Session = Depends(get_db)):
    pass


@app.post("/skills/submit/", response_model=schemas.EducItemData)
def submit_skill(educitem: EducItemDataSubmit, db: Session = Depends(get_db)):
    return crud.create_educ_item(db=db, educ_item=educitem)
