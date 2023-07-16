import os
import time
from datetime import datetime, timedelta
import logging
from fastapi import Request, Depends, FastAPI, HTTPException
from sqlalchemy.orm import Session

from database import crud, models, schemas
from database.databse import SessionLocal, engine

from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

from database.schemas import EducItemDataSubmit

from fastapi.middleware.cors import CORSMiddleware
from fastapi import Depends, FastAPI, HTTPException, status
from jose import JWTError, jwt
from typing import Annotated
from auth_logic import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, oauth2_scheme
from auth_logic import authenticate_user, create_access_token
from database.schemas import User, Token, TokenData
import database.crud as crud


models.Base.metadata.create_all(bind=engine)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "UPDATE"],
    allow_headers=["*"],
)
static_dir = os.path.join(os.path.dirname(__file__), "static")
app.mount("/",
          StaticFiles(directory=static_dir, html=True),
          name="static")

# setup loggers
logging.config.fileConfig('logging.conf', disable_existing_loggers=False)

# get root logger
logger = logging.getLogger(__name__)  # the __name__ resolve to "main" since we are at the root of the project.
                                      # This will get the root logger since no logger in the configuration has this name.


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


async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = crud.get_user_by_pseudo(db, username=token_data.username)
    if user is None:
        raise credentials_exception
    return user


async def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)]
):
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):

    start_time = time.time()
    response = await call_next(request)
    print(request.method, request.url)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response


@app.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Session = Depends(get_db)
):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


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


@app.post("/educitem/submit", response_model=schemas.EducItemData)
def submit_educ_item(educitem: EducItemDataSubmit, db: Session = Depends(get_db)):
    logging.info("submit educ item now")
    new_educ_item = crud.create_educ_item_from_submit(db=db, educ_item=educitem)

    return new_educ_item


@app.post("/exercises/submit", response_model=schemas.Exercise)
def create_static_exercise(exercise: schemas.StaticExerciseSubmit, db: Session = Depends(get_db)):
    base_exercise = schemas.BaseExercise(title=exercise.title,
                                         difficulty=exercise.difficulty,
                                         author=exercise.author,
                                         educ_items=exercise.educ_items)

    db_base_exercise = crud.create_exercise_from_submit(db, base_exercise)

    # the exercise now has an id, we can create the entry in static_exercise
    static_exercise = schemas.StaticExercise(id_exercise=db_base_exercise.id_exercise,
                                             content=exercise.ex_content,
                                             answers=[exercise.ex_answer])
    db_static_answer = crud.create_static_exercise(static_exercise)

    return base_exercise


@app.get("/exercises/{exercise_id}", response_model=schemas.Exercise)
def get_exercise_by_id(exercise_id: int, db: Session = Depends(get_db)):
    pass


@app.get("/educitem/all")
def get_educ_items_list(db: Session = Depends(get_db)):
    educ_items = crud.get_educ_items(db)
    return educ_items



