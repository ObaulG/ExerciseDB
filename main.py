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

from fastapi.middleware.cors import CORSMiddleware
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.responses import HTMLResponse
from jose import JWTError, jwt
from typing import Annotated, Any
from auth_logic import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, oauth2_scheme, verify_password
from auth_logic import create_jwt, decode_jwt
from auth_logic import RequiresLoginException
from database.schemas import User, Token, TokenData
import database.crud as crud

from database.crud_neo4j import Neo4jManager

protected_files = [
    "/exercise_submit.js",
    "/exercisedb_methods.js",
    "/skill-editor.html",
    "/skill-editor.js",
    "/skill-graph.js",
    "/submit_exercise.html"
]

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
NEO4J_USER = "admin-python-app"
#NEO4J_PASSWORD = "ACxJZm6EUr3ykwgIApuwVHj3plkekfJNIx_2jR27GAY"
#NEO4J_PASSWORD = "48bfcdez32"
NEO4J_PASSWORD = "azertyuiop123"

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


@app.exception_handler(RequiresLoginException)
async def login_exception_handler(request: Request, exc: RequiresLoginException):
    print("RequiresLoginException caught")
    return HTMLResponse(
        status_code=401,
        content=retrieve_document_as_str("static/login_create.html"),
    )


def authenticate_user(db, username: str, password: str):
    user = db.get_user_by_pseudo(username)
    if not user:
        return None
    if not verify_password(password, user.properties["password"]):
        return None
    return user


async def get_current_user_neo4j(token: Annotated[str, Depends(oauth2_scheme)],
                                 db: Neo4jManager):
    """
    Retrieves the user from the JWT he sent.
    :param token: The JWT sent by the client.
    :param db: Neo4j DB dependency
    :return: Instance of User as a schemas.Node
    """
    credentials_exception = RequiresLoginException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    exp_exception = RequiresLoginException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="The provided credentials were expired",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # also checks expiration
        print("Decoding the token",token)
        payload = decode_jwt(token)
        if payload is None:
            raise exp_exception
        username = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError as e:
        print(e, file=sys.stderr)
        raise credentials_exception
    user = db.get_user_by_pseudo(token_data.username)
    if user is None:
        raise credentials_exception
    return user


async def get_current_active_user_neo4j(
    current_user: Annotated[User, Depends(get_current_user_neo4j)]):
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


@app.middleware("http")
async def check_protected_files(request: Request, call_next):
    start_time = time.time()
    path = request.url.path
    if (path.endswith(".html") or path.endswith(".js")) and path in protected_files:
        try:
            db = get_neo4j_db().__next__()
            user = await get_current_user_neo4j(request.cookies.get("access_token"), db)
        except RequiresLoginException as e:
            print(e, file=sys.stderr)
            process_time = time.time() - start_time
            return HTMLResponse(
                status_code=401,
                content=retrieve_document_as_str("static/login_create.html"),
            )
    process_time = time.time() - start_time
    response = await call_next(request)
    response.headers["X-Process-Time"] = str(process_time)
    return response

@app.post("/token", response_model=Token)
async def login_for_access_token(
    response: Response,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Neo4jManager = Depends(get_neo4j_db)
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
        data={"sub": user.properties["pseudo"]}, expires_delta=access_token_expires
    )

    db.update_user_last_connection(user)
    response.set_cookie(key="access_token",
                        value=f"{access_token}",
                        httponly=True)

    return schemas.Token(access_token=access_token, token_type="bearer")


@app.post("/user/create_account", response_model=schemas.Node)
def create_user(user: schemas.UserCreate, db: Neo4jManager = Depends(get_neo4j_db)):
    user = db.create_user(user=user)
    return user


@app.get("/users/all", response_model=schemas.Nodes)
def read_users(db: Neo4jManager = Depends(get_neo4j_db), skip: int = 0, limit: int = 100, ):
    users = db.get_users()
    return users


@app.get("/users/{user_id}", response_model=schemas.Node)
def read_user_by_id(user_id: str, db: Neo4jManager = Depends(get_neo4j_db)):
    db_user = db.get_user_by_id(user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user


@app.get("/educitem/framework/all", response_model=schemas.Nodes)
def get_educframeworks(db: Neo4jManager = Depends(get_neo4j_db), skip: int = 0, limit: int = 100):
    educ_frameworks = db.get_educ_frameworks()
    return educ_frameworks


@app.get("/educitem/framework/{framework_id}", response_model=schemas.Node)
def get_educframework_data_by_id(framework_id: str, db: Neo4jManager = Depends(get_neo4j_db)):
    educ_framework=db.get_educ_framework_by_id(framework_id)
    return educ_framework

@app.get("/educitem/skillgraph/{framework_id}", response_model=schemas.GraphNodesEdges)
def get_skill_graph(framework_id: str, db: Neo4jManager = Depends(get_neo4j_db)):
    """
    Return a schemas.GraphNodesEdges object containing a graph of all skills in this EducFramework.
    :param framework_id:
    :param db:
    :return:
    """
    skill_graph = db.get_skill_graph(framework_id)
    return skill_graph


@app.post("/educitem/framework/new", response_model=schemas.Node)
async def create_skill_graph(create_form: schemas.EducFrameworkCreate,
                             db: Annotated[Neo4jManager, Depends(get_neo4j_db)],
                             request: Request):
    user = await get_current_user_neo4j(request.cookies.get("access_token"), db);
    return db.create_educ_framework(create_form.title, create_form.description, user)


@app.get("/educitem/all", response_model = list[schemas.EducItemData])
def get_educ_items_list(db: Neo4jManager = Depends(get_neo4j_db)):
    educ_items = db.get_educ_items()
    return educ_items


@app.put("/educitem/node", response_model=schemas.Node)
async def create_node(data: schemas.EducItemDataCreate,
                      db: Annotated[Neo4jManager, Depends(get_neo4j_db)],
                      request: Request):
    user = await get_current_user_neo4j(request.cookies.get("access_token"), db)
    new_node = db.create_educ_item_from_submit(data, user)

"""
Called when a Node is updated. If the Node was created in the App, it should not
have any id.
:param db:
:return:
"""
@app.post("/educitem/node")
async def update_node(data: schemas.Node,
                      db: Annotated[Neo4jManager, Depends(get_neo4j_db)],
                      request: Request):
    user = await get_current_user_neo4j(request.cookies.get("access_token"), db)
    node = db.update_node(data.node_id, data.properties)


@app.delete("/educitem/node/{node_id}")
async def remove_node(node_id: str,
                      db: Annotated[Neo4jManager, Depends(get_neo4j_db)],
                      request: Request):
    user = await get_current_user_neo4j(request.cookies.get("access_token"), db)
    node_removed = db.delete_node(node_id)

@app.put("/educitem/node", response_model=schemas.Node)
async def create_node(data: schemas.EducItemDataCreate,
                      db: Annotated[Neo4jManager, Depends(get_neo4j_db)],
                      request: Request):
    user = await get_current_user_neo4j(request.cookies.get("access_token"), db)
    new_node = db.create_educ_item_from_submit(data, user)
    return new_node


@app.post("/educitem/edge")
async def update_edge(data: schemas.Relationship,
                      db: Annotated[Neo4jManager, Depends(get_neo4j_db)],
                      request: Request):
    user = await get_current_user_neo4j(request.cookies.get("access_token"), db)
    new_edge = db.up(data.source_node_id,
                                       data.target_node_id,
                                       data.relationship_id,
                                       user,
                                       data.properties)

@app.delete("/educitem/node/{node_id}")
async def remove_node(node_id: str,
                      db: Annotated[Neo4jManager, Depends(get_neo4j_db)],
                      request: Request):
    user = await get_current_user_neo4j(request.cookies.get("access_token"), db)
    node_removed = db.delete_node(node_id)
#
# @app.get("/exercise/all", response_model=schemas.Exercises)
# def get_exercises(db: Neo4jManager = Depends(get_neo4j_db)):
#     pass


# @app.post("/exercise/static", response_model=schemas.Exercise)
# def create_static_exercise(exercise: schemas.StaticExerciseSubmit,
#                            current_user: Annotated[User, Depends(get_current_user_neo4j)],
#                            db: Neo4jManager = Depends(get_neo4j_db)):
#     """
#
#     :param exercise:
#     :param current_user:
#     :param db:
#     :return:
#     """
#     user_id = current_user.id
#     base_exercise = schemas.BaseExercise(title=exercise.title,
#                                          difficulty=exercise.difficulty,
#                                          author=user_id,
#                                          educ_items_id=exercise.educ_items_id)
#
#     db_base_exercise = db.create_exercise(base_exercise)
#
#     return db_base_exercise


@app.get("/exercises/{exercise_id}", response_model=schemas.Exercise)
def get_exercise_by_id(exercise_id: int, db: Neo4jManager = Depends(get_neo4j_db)):
    pass


# html / css pages
app.mount("/",
          StaticFiles(directory=static_dir),
          name="static")


# uvicorn main:app
if __name__ == '__main__':
    uvicorn.run("main:app")