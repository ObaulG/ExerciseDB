import os, sys
import time
import uvicorn
from datetime import datetime, timedelta
import logging
from fastapi import Response, Request, Depends, FastAPI, HTTPException
from sqlalchemy.orm import Session

from database import crud, models, schemas
from database.database import SessionLocal, engine

from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

from database.schemas import EducItemDataSubmit

from fastapi.middleware.cors import CORSMiddleware
from fastapi import Depends, FastAPI, HTTPException, status
from jose import JWTError, jwt
from typing import Annotated
from auth_logic import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, oauth2_scheme
from auth_logic import authenticate_user, create_jwt
from database.schemas import User, Token, TokenData
import database.crud as crud

from database.crud_neo4j import Neo4jManager


models.Base.metadata.create_all(bind=engine)

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000", "http://localhost:8000/"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Neo4j configuration
NEO4J_URI = "bolt://localhost:7687"
NEO4J_USER = "neo4j"
#NEO4J_PASSWORD = "ACxJZm6EUr3ykwgIApuwVHj3plkekfJNIx_2jR27GAY"
NEO4J_PASSWORD = "48bfcdez32"

static_dir = os.path.join(os.path.dirname(__file__), "static")


# setup loggers
logging.config.fileConfig('logging.conf', disable_existing_loggers=False)

# get root logger
logger = logging.getLogger(__name__)  # the __name__ resolve to "main" since we are at the root of the project.
                                      # This will get the root logger since no logger in the configuration has this name.

#handler = logging.StreamHandler(sys.stdout)
#handler.setLevel(logging.DEBUG)
#logging.getLogger("neo4j").addHandler(handler)
#logging.getLogger("neo4j").setLevel(logging.DEBUG)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Dependency to get the Neo4j connection
def get_neo4j_db():
    exercise_db = Neo4jManager(NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD)
    try:
        yield exercise_db
    finally:
        exercise_db.close()


def retrieve_document_as_str(path: str) -> str:
    doc = ""
    with open(path, 'r') as f:
        doc = f.read()
    return doc


async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], db: Session = Depends(get_db)):
    """
    Retrieve the user from the JWT he sends.
    :param token: The JWT sent by the client.
    :param db:
    :return: Instance of user as stored in DB or None
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None or payload.get("exp") >= time.time():
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = crud.get_user_by_pseudo(db, username=token_data.username)
    if user is None:
        raise credentials_exception
    return user


async def get_current_user_neo4j(token: Annotated[str, Depends(oauth2_scheme)], db: Session = Depends(get_neo4j_db)):
    """
    Retrieve the user from the JWT he sends.
    :param token: The JWT sent by the client.
    :param db:
    :return: Instance of User as a schemas.Node
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None or payload.get("exp") >= time.time():
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = Neo4jManager.get_user_by_pseudo(db, username=token_data.username)
    if user is None:
        raise credentials_exception
    return user


async def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)]
):
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

async def get_current_active_user_neo4j(
    current_user: Annotated[User, Depends(get_current_user_neo4j)]
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
    response: Response,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Session = Depends(get_neo4j_db)
):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_jwt(
        data={"sub": user.username}, expires_delta=access_token_expires
    )

    response.set_cookie(key="access_token",
                        value=f"Bearer {access_token}",
                        httponly=True)
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/user/create_account", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_neo4j_db)):
    db_user_by_email = db.get_user_by_email(db, email=user.email)
    if db_user_by_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    db_user_by_pseudo = db.get_user_by_pseudo(db, email=user.pseudo)
    if db_user_by_pseudo:
        raise HTTPException(status_code=400, detail="Pseudo is already used.")
    return db.create_user(db=db, user=user)


@app.get("/users/all", response_model=list[schemas.User])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_neo4j_db)):
    users = db.get_users(db, skip=skip, limit=limit)
    return users


@app.get("/users/{user_id}", response_model=schemas.User)
def read_user_by_id(user_id: int, db: Session = Depends(get_neo4j_db)):
    db_user = db.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

@app.get("/educitem/framework/all", response_model = schemas.ListSkillGraphData)
def get_educframeworks(skip: int = 0, limit: int = 100, db: Neo4jManager = Depends(get_neo4j_db)):
    educ_frameworks = db.get_educ_frameworks()
    return educ_frameworks


@app.get("/educitem/framework/{framework_id}", response_model=list[schemas.SkillGraphData])
def get_educframework_data_by_id(framework_id: str, db: Neo4jManager = Depends(get_neo4j_db)):
    educ_framework=db.get_educ_framework_by_id(framework_id)
    return educ_framework

@app.get("/skillgraph/{framework_id}", response_model=schemas.GraphNodesEdges)
def get_skill_graph(framework_id: str, db: Neo4jManager = Depends(get_neo4j_db)):
    skill_graph = db.get_skill_graph(framework_id)
    return skill_graph

@app.post("/skillgraph", response_model=schemas.GraphNodesEdges)
def create_skill_graph(create_form: schemas.SkillGraphCreate, db: Neo4jManager = Depends(get_neo4j_db)):
    return db.create_educ_framework(create_form.title, create_form.description)
@app.get("/educitem/all", response_model = list[schemas.EducItemData])
def get_educ_items_list(db: Session = Depends(get_db)):
    educ_items = crud.get_educ_items(db)
    return educ_items


@app.post("/edge", response_model=schemas.Relationship)
def add_edge_in_skill_graph(edge: schemas.Edge,
                            current_user: Annotated[User, Depends(get_current_user)],
                            db: Session = Depends(get_neo4j_db)):
    pass

@app.post("/edge/{edge_id}", response_model=schemas.Relationship)
def delete_edge_in_skill_graph(edge_id: str,
                               current_user: Annotated[User, Depends(get_current_user)],
                               db: Session = Depends(get_neo4j_db)):
    pass

@app.post("/educitem", response_model=schemas.EducItemData)
def submit_educ_item(educitem: EducItemDataSubmit,
                     current_user: Annotated[User, Depends(get_current_user)],
                     db: Session = Depends(get_neo4j_db)):
    logging.info("submit educ item now")
    new_educ_item = crud.create_educ_item_from_submit(db=db, educ_item=educitem)

    return new_educ_item


@app.get("/exercise/all", response_model=schemas.Exercises)
def get_exercises(db: Session = Depends(get_neo4j_db)):
    pass

@app.post("/exercise/static", response_model=schemas.Exercise)
def create_static_exercise(exercise: schemas.StaticExerciseSubmit,
                           current_user: Annotated[User, Depends(get_current_user)],
                           db: Session = Depends(get_neo4j_db)):
    """

    :param exercise:
    :param current_user:
    :param db:
    :return:
    """
    user_id = current_user.id
    base_exercise = schemas.BaseExercise(title=exercise.title,
                                         difficulty=exercise.difficulty,
                                         author=user_id,
                                         educ_items_id=exercise.educ_items_id)

    db_base_exercise = db.create_exercise(base_exercise)


    return db_base_exercise


@app.get("/exercises/{exercise_id}", response_model=schemas.Exercise)
def get_exercise_by_id(exercise_id: int, db: Session = Depends(get_db)):
    pass

# html / css pages
app.mount("/",
          StaticFiles(directory=static_dir),
          name="static")


# uvicorn main:app
if __name__ == '__main__':
    uvicorn.run("main:app")