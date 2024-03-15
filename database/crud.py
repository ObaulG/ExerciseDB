# from sqlalchemy.orm import Session
# from sqlalchemy import insert
# from . import models, schemas
#
#
# def get_user_by_id(db: Session, user_id: int):
#     return db.query(models.User).filter(models.User.id == user_id).first()
#
#
# def get_user_by_pseudo(db: Session, pseudo: str):
#     return db.query(models.User).filter(models.User.pseudo == pseudo).first()
#
#
# def get_user_by_email(db: Session, email: str):
#     return db.query(models.User).filter(models.User.email == email).first()
#
#
# def get_users(db: Session, skip: int = 0, limit: int = 100):
#     return db.query(models.User).offset(skip).limit(limit).all()
#
#
# # TODO: hash and salt the password...
# def create_user(db: Session, user: schemas.UserCreate):
#     fake_hashed_password = user.password + "notreallyhashed"
#     db_user = models.User(pseudo=user.pseudo,
#                           email=user.email,
#                           hashed_password=fake_hashed_password)
#     db.add(db_user)
#     db.commit()
#     db.refresh(db_user)
#     return db_user
#
#
# def get_educ_items(db: Session, skip: int = 0, limit: int = 100):
#     return db.query(models.EducItemData).offset(skip).limit(limit).all()
#
#
# def create_educ_item_from_submit(db: Session, educ_item: schemas.EducItemDataSubmit):
#     """
#     Create an EducItem from a submission. Its id and code should be generated.
#     Note: it should also add an EducItemMastery entry for each user.
#     :param db:
#     :param educ_item:
#     :return: the row saved in the db
#     """
#     db_educ_item = models.EducItemData(title=educ_item.title,
#                                        code=str(educ_item.type),
#                                        type=educ_item.type,
#                                        description=educ_item.description)
#     users = get_users()
#
#     db.add(db_educ_item)
#     db.commit()
#     db.refresh(db_educ_item)
#
#     educ_item_masteries = [(user.id, db_educ_item.id) for user in users]
#     db.execute(insert(models.EducItemMastery), educ_item_masteries)
#     return db_educ_item
#
#
# def create_educ_item_mastery_for_user(db: Session, user_id: int, educ_item_id):
#     db_educ_item_mastery = models.EducItemMastery(owner_id=user_id,
#                                                   educitem_id=educ_item_id)
#     db.commit()
#     db.refresh(db_educ_item_mastery)
#     return db_educ_item_mastery
#
# def get_educ_items(db: Session, skip: int = 0, limit: int = 1000):
#     return db.query(models.EducItemData).offset(skip).limit(limit).all()
#
#
# # /\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
# # GraphSkill functions
# # /\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
# def create_new_skillgraph(db: Session, graphcreate_data: schemas.SkillGraphCreate):
#     db_graph = models.SkillGraph(title=graphcreate_data.title, description=graphcreate_data.description)
#
#     db.add(db_graph)
#     db.commit()
#     db.refresh(db_graph)
#     return db_graph
#
#
# def get_skillgraphs(db: Session, skip: int = 0, limit: int = 1000):
#     return (db.query(models.SkillGraph)
#             .offset(skip)
#             .limit(limit)
#             .all())
#
#
# def get_skillgraph_nodes(db: Session, graph_id: int):
#     return (db.query(models.EducItemGraph)
#             .filter(models.EducItemGraph.skill_graph_id == graph_id)
#             .all())
#
#
# def get_skillgraph_edges(db: Session, graph_id: int):
#     return (db.query(models.EducItemLink)
#             .filter(models.EducItemLink.skill_graph_id == graph_id)
#             .all())
#
#
# def add_edge_in_graph(db: Session, edge: schemas.SkillGraphEdge):
#     """
#     Create a EducItemLink if all the id given exist in the tables.
#     :param db:
#     :param edge:
#     :return:
#     """
#     node_start_exists = (db.session.query(models.EducItemData.id)
#                                    .filter_by(id=edge.node_start)
#                                    .first() is not None)
#     node_end_exists = (db.session.query(models.EducItemData.id)
#                                  .filter_by(id=edge.node_end)
#                                  .first() is not None)
#     graph_exists = (db.session.query(models.SkillGraph.id)
#                               .filter_by(id=edge.graph_id)
#                               .first() is not None)
#
#     if not (node_start_exists and node_end_exists and graph_exists):
#         return
#
#     db_graph_edge = models.EducItemLink(item_start_id=edge.node_start,
#                                         item_end_id=edge.node_end,
#                                         skill_graph_id=edge.graph_id,
#                                         link_name=edge.link_name)
#     db.add(db_graph_edge)
#     db.commit()
#     db.refresh(db_graph_edge)
#     return db_graph_edge
#
#
# def update_edge_label_from_graph(db: Session, graph_edge: schemas.SkillGraphEdge):
#     db_edge = (db.session.query(models.EducItemLink)
#                          .filter(item_start_id=graph_edge.node_start,
#                                     item_end_id=graph_edge.node_end,
#                                     skill_graph_id=graph_edge.graph_id)
#                          .update({"label": graph_edge.link_name}))
#
#     db.commit()
#     db.refresh(db_edge)
#     return db_edge
#
#
# def remove_edge_from_graph(db: Session, graph_edge: schemas.SkillGraphEdge):
#     db_edge_removed = (db.session.query(models.EducItemLink)
#                          .filter(item_start_id=graph_edge.node_start,
#                                  item_end_id=graph_edge.node_end,
#                                  skill_graph_id=graph_edge.graph_id)
#                          .delete())
#
#     db.commit()
#
#
# # /\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
# # Exercise functions
# # /\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
# def create_exercise_from_submit(db: Session, exercise: schemas.BaseExercise):
#     db_exercise = models.Exercise(title=exercise.title,
#                                   difficulty=exercise.difficulty,
#                                   author_id=exercise.author_id,
#                                   educ_items=exercise.educ_items)
#     db.add(db_exercise)
#     db.commit()
#     db.refresh(db_exercise)
#     return db_exercise
#
#
# def create_static_exercise(db: Session, exercise: schemas.StaticExercise):
#     db_static_exercise = models.StaticExercise(id_exercise=exercise.id_exercise,
#                                                content=exercise.content,
#                                                answers=exercise.answers)
#     db.add(db_static_exercise)
#     db.commit()
#     db.refresh(db_static_exercise)
#     return db_static_exercise
#
#
# def get_exercise_by_id(db: Session, id: int):
#     pass
#
#
# def create_static_exercise_answer(db: Session, answer: schemas.StaticExerciseAnswer):
#     pass
#
#
# def get_exercises_from_skill(db: Session, answer: schemas.EducItemList):
#     pass
