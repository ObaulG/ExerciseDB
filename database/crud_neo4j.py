import neo4j.exceptions
from neo4j import GraphDatabase, Result, Record
from neo4j.graph import Node
from . import models, schemas
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional
from auth_logic import get_password_hash
from uuid import uuid4

# Some parts of code are retrieved from this GitHub repo : https://github.com/dudikbender/fast-graph/tree/main

# List of acceptable node labels and relationship types
node_labels = ['User', 'Admin', 'Developper', 'EducFramework',
               'EducItem', 'Competency', 'Knowledge', "Skill",
               'Exercise', "Course", "Resource"]

educ_item_valid_labels = {'Competency', 'Knowledge', "Skill"}

relationship_types = ['comprises', 'hasTraining', 'hasLearning',
                      'hasSkill', "hasKnowledge", "hasCompetency",
                      "requires", "isComplexificationOf",
                      "isLeverOfUnderstandingOf", "masters", "needs"]

relationships_in_skillgraph = ['comprises', 'hasTraining', 'hasLearning',
                               'hasSkill', "hasKnowledge", "hasCompetency",
                               "requires",
                               "isComplexificationOf", "isLeverOfUnderstandingOf"]

# Used for validation to ensure they are not overwritten
base_properties = ['created_by', 'created_time', 'id']


class Neo4jManager:
    """
    In this Neo4j database, all nodes have an id custom property,
    as said in the documentation.
    """
    def __init__(self, uri, user, password):
        self._driver = GraphDatabase.driver(uri,
                                            auth=(user, password),
                                            database="skills",
                                            encrypted=False)
        self.database = "neo4j"

    def close(self):
        self._driver.close()

    def generate_node_list_from_query_result(self, query_result: Result):
        node_list = []
        for record in query_result:
            # print(record)
            record_data = record.data()
            # print(record_data)
            node_data = record_data.get("node", {})
            labels = record_data.get("labels", [])
            # Create node for each result in query
            # note: str conversion just in case.
            node = schemas.Node(node_id=str(node_data['id']),
                                labels=labels,
                                properties=node_data)

            # Append each node result into Nodes list
            node_list.append(node)
        return schemas.Nodes(nodes=node_list)

    def generate_GraphNodeEdges_from_records(self, records: list[Record]) -> schemas.GraphNodesEdges:
        """
        neo4j.Record.data() removes the labels of the Nodes, but our app needs it.
        :param records: A list of Record
        :return: The corresponding schemas.GraphNodesEdges
        """
        node_list = []
        rel_list = []
        for record in records:
            print("record:", record)
            nodes = record.get("nodes")
            rels = record.get("rels")
            print(nodes)
            node_list.extend([schemas.Node(node_id=node.get("id", "-1"),
                                           labels=node.labels,
                                           properties={key: value for (key, value) in node.items()})
                              for node in nodes])

            rel_list.extend([schemas.Edge(source=str(rel[0]),
                                          target=str(rel[1]),
                                          label=str(rel[2]),
                                          properties=rel[3]) for rel in rels])

        return schemas.GraphNodesEdges(nodes=schemas.Nodes(nodes=node_list),
                                       edges=schemas.Edges(edges=rel_list),
                                       nodes_count=len(node_list),
                                       edges_count=len(rel_list))

    def generic_get_nodes(self, label: str):
        """
        Executes a simple MATCH request on a Node Label
        :param label: String of the wanted label.
        :return: a list of Nodes
        """
        cypher = f"MATCH (node :{label} ) RETURN ID(node) as id, LABELS(node) as labels, node"
        records, summary, keys = self._driver.execute_query(cypher,
                                                            database=self.database)

        node_list = self.generate_node_list_from_query_result(records)

        print("The query `{query}` returned {records_count} records in {time} ms.".format(query=summary.query,
                                                                                          records_count=len(records),
                                                                                          time=summary.result_available_after))
        # Return Nodes response with collection as list
        return node_list

    def get_node_by_id(self, node_id: str):
        cypher = "MATCH (n) WHERE n.id = $node_id RETURN n, LABELS(n)"
        with self._driver.session() as session:
            result = session.run(query=cypher,
                                 parameters={'id': node_id})
            result_data = result.data()
            if not result_data:
                return None
            node_data = result_data[0]

        return schemas.Node(node_id=node_data["properties"]["id"],
                            labels=node_data["labels"],
                            properties=node_data["properties"])
    def create_node(self, label: str, node_attributes: dict, user: schemas.Node):
        # Check that node is not User
        if label == 'User':
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Operation not permitted, cannot create a User with this method.",
                headers={"WWW-Authenticate": "Bearer"})

        # Check that node has an acceptable label
        if label not in node_labels:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Operation not permitted, node label is not accepted.",
                headers={"WWW-Authenticate": "Bearer"})

        # Check that attributes dictionary does not modify base fields
        for key in node_attributes:
            if key in base_properties:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                                    detail="Operation not permitted, you cannot modify those fields with this method.",
                                    headers={"WWW-Authenticate": "Bearer"})

        node_attributes["id"] = uuid4().hex

        unpacked_attributes = 'SET ' + ', '.join(
            f'new_node.{key}=\'{value}\'' for (key, value) in node_attributes.items())

        cypher = f"""
                CREATE (new_node:{label})\n
                SET new_node.created_by = $created_by\n
                SET new_node.created_time = $created_time\n
                {unpacked_attributes}\n
                RETURN new_node, LABELS(new_node) as labels, ID(new_node) as id
                """

        with self._driver.session() as session:
            result = session.run(
                query=cypher,
                parameters={
                    'created_by': user.properties.get("pseudo", "?"),
                    'created_time': str(datetime.now(timezone.utc)),
                },
            )
            user_result = result.single()

        return schemas.Node(node_id=user_result["new_node"]['id'],
                            labels=user_result["labels"],
                            properties=user_result["new_node"])

    def update_node(self, node_id: str, attributes: dict):
        # Check that property to update is not part of base list
        for key in attributes:
            if key in base_properties:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Operation not permitted, that property field cannot be updated.",
                    headers={"WWW-Authenticate": "Bearer"})

        cypher = f'''MATCH (node) WHERE node.id = $id
                        SET node += $attributes
                        RETURN node, node.id as id, LABELS(node) as labels'''

        with self._driver.session() as session:
            result = session.run(query=cypher,
                                 parameters={'id': node_id, 'attributes': attributes})

            node = result.single()

        return schemas.Node(node_id=node.properties['id'],
                            labels=node.labels,
                            properties=node.properties)

    def delete_node(self, node_id: str):

        cypher = f"""
        MATCH (node)
        WHERE node.id = $id
        DETACH DELETE node
        """

        with self._driver.session() as session:
            result = session.run(query=cypher,
                                 parameters={'id': node_id})

            node_data = result.data()

        # Confirm deletion was completed by empty response
        return node_data or {
            'response': f'Node with ID: {node_id} was successfully deleted from the graph.'
        }

    def create_relationship(self, source_node_label: str, source_node_property: str, source_node_property_value: str,
                            target_node_label: str, target_node_property: str, target_node_property_value: str,
                            relationship_type: str, user: schemas.Node,
                            relationship_attributes: Optional[dict] = None):
        # Check that relationship has an acceptable type
        if relationship_type not in relationship_types:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Operation not permitted, relationship type is not accepted.",
                headers={"WWW-Authenticate": "Bearer"})

        # Check that attributes dictionary does not modify base fields
        for key in relationship_attributes:
            if key in base_properties:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                                    detail="Operation not permitted, you cannot modify those fields with this method.",
                                    headers={"WWW-Authenticate": "Bearer"})

        # We won't force the user to send a properties dict. We check this case here.
        if not relationship_attributes:
            relationship_attributes = {}
        relationship_attributes["id"] = uuid4()
        unpacked_attributes = 'SET ' + ', '.join(
            f'relationship.{key}=\'{value}\'' for (key, value) in relationship_attributes.items())

        cypher = f"""
            MATCH (nodeA:{source_node_label}) WHERE nodeA.{source_node_property} = $nodeA_property
            MATCH (nodeB:{target_node_label}) WHERE nodeB.{target_node_property} = $nodeB_property
            CREATE (nodeA)-[relationship:{relationship_type}]->(nodeB)
            SET relationship.created_by = $created_by
            SET relationship.created_time = $created_time
            {unpacked_attributes}
            RETURN nodeA, nodeB, LABELS(nodeA), LABELS(nodeB), relationship.id, TYPE(relationship), PROPERTIES(relationship)
            """

        with self._driver.session() as session:
            result = session.run(
                query=cypher,
                parameters={
                    'created_by': user.properties.get("pseudo", "?"),
                    'created_time': str(datetime.now(timezone.utc)),
                    'nodeA_property': source_node_property_value,
                    'nodeB_property': target_node_property_value,
                },
            )

            relationship_data = result.data()[0]

        # Organise the data about the nodes in the relationship
        source_node = schemas.Node(node_id=relationship_data['nodeA']["id"],
                                   labels=relationship_data['LABELS(nodeA)'],
                                   properties=relationship_data['nodeA'])

        target_node = schemas.Node(node_id=relationship_data['nodeB']["id"],
                                   labels=relationship_data['LABELS(nodeB)'],
                                   properties=relationship_data['nodeB'])

        # Return Relationship response
        return schemas.Relationship(relationship_id=relationship_data['relationship.id'],
                                    relationship_type=relationship_data['TYPE(relationship)'],
                                    properties=relationship_data['PROPERTIES(relationship)'],
                                    source_node=source_node,
                                    target_node=target_node)

    def create_relationship_from_ids(self, nodeA_id: str, nodeB_id: str, relationship_type: str,
                                     user: schemas.Node,
                                     relationship_attributes: Optional[dict] = None):
        # Check that relationship has an acceptable type
        if relationship_type not in relationship_types:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Operation not permitted, relationship type is not accepted.",
                headers={"WWW-Authenticate": "Bearer"})

        # Check that attributes dictionary does not modify base fields
        for key in relationship_attributes:
            if key in base_properties:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                                    detail="Operation not permitted, you cannot modify those fields with this method.",
                                    headers={"WWW-Authenticate": "Bearer"})

        # We won't force the user to send a properties dict. We check this case here.
        if not relationship_attributes:
            relationship_attributes = {}
        relationship_attributes["id"] = uuid4()
        unpacked_attributes = 'SET ' + ', '.join(
            f'relationship.{key}=\'{value}\'' for (key, value) in relationship_attributes.items())

        cypher = f"""
                    MATCH (nodeA) WHERE nodeA.id = $nodeA_id
                    MATCH (nodeB) WHERE nodeB.id = $nodeB_id
                    CREATE (nodeA)-[relationship:$relationship_type]->(nodeB)
                    SET relationship.created_by = $created_by
                    SET relationship.created_time = $created_time
                    {unpacked_attributes}
                    RETURN nodeA, nodeB, LABELS(nodeA), LABELS(nodeB), relationship.id, TYPE(relationship), PROPERTIES(relationship)
                    """

        with self._driver.session() as session:
            result = session.run(
                query=cypher,
                parameters={
                    'created_by': user.properties.get("pseudo", "?"),
                    'created_time': str(datetime.now(timezone.utc)),
                    'nodeA_id': nodeA_id,
                    'nodeB_id': nodeB_id,
                },
            )

            relationship_data = result.data()[0]

        # Organise the data about the nodes in the relationship
        source_node = schemas.Node(node_id=relationship_data['nodeA']["id"],
                                   labels=relationship_data['LABELS(nodeA)'],
                                   properties=relationship_data['nodeA'])

        target_node = schemas.Node(node_id=relationship_data['nodeB']["id"],
                                   labels=relationship_data['LABELS(nodeB)'],
                                   properties=relationship_data['nodeB'])

        # Return Relationship response
        return schemas.Relationship(relationship_id=relationship_data['relationship.id'],
                                    relationship_type=relationship_data['TYPE(relationship)'],
                                    properties=relationship_data['PROPERTIES(relationship)'],
                                    source_node=source_node,
                                    target_node=target_node)

    # READ data about a relationship
    def read_relationship(self, relationship_id: str):

        cypher = f"""
            MATCH (nodeA)-[relationship]->(nodeB)
            WHERE relationship.id = $relationship_id
            RETURN nodeA, LABELS(nodeA), relationship, TYPE(relationship), nodeB, LABELS(nodeB), PROPERTIES(relationship)
            """

        with self._driver.session() as session:
            result = session.run(query=cypher,
                                 parameters={'id': relationship_id})

            relationship_data = result.data()[0]

        # Organise the data about the nodes in the relationship
        source_node = schemas.Node(node_id=relationship_data["nodeA"]["id"],
                                   labels=relationship_data["LABELS(nodeA)"],
                                   properties=relationship_data["nodeA"])

        target_node = schemas.Node(node_id=relationship_data["nodeB"]["id"],
                                   labels=relationship_data["LABELS(nodeB)"],
                                   properties=relationship_data["nodeB"])

        # Return Relationship response
        return schemas.Relationship(relationship_id=relationship_data["relationship"]["id"],
                                    relationship_type=relationship_data["TYPE(relationship)"],
                                    properties=relationship_data["PROPERTIES(relationship)"],
                                    source_node=source_node,
                                    target_node=target_node)

    def update_relationship(self, relationship_id: str, attributes: dict, user: schemas.Node):
        # Check that attributes dictionary does not modify base fields
        for key in attributes:
            if key in base_properties:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                                    detail="Operation not permitted, you cannot modify those fields with this method.",
                                    headers={"WWW-Authenticate": "Bearer"})

        cypher = f"""
        MATCH (nodeA)-[relationship]->(nodeB)
        WHERE relationship.id = {relationship_id}
        SET relationship += $attributes
        RETURN nodeA, ID(nodeA), LABELS(nodeA), relationship, ID(relationship), TYPE(relationship), nodeB, ID(nodeB), LABELS(nodeB), PROPERTIES(relationship)
        """

        with self._driver.session() as session:
            result = session.run(query=cypher,
                                 parameters={'rel_id': relationship_id,
                                             'attributes': attributes})

            relationship_data = result.data()[0]

        # Organise the data about the nodes in the relationship
        source_node = schemas.Node(node_id=relationship_data['ID(nodeA)'],
                                   labels=relationship_data['LABELS(nodeA)'],
                                   properties=relationship_data['nodeA'])

        target_node = schemas.Node(node_id=relationship_data['ID(nodeB)'],
                                   labels=relationship_data['LABELS(nodeB)'],
                                   properties=relationship_data['nodeB'])

        # Return Relationship response
        return schemas.Relationship(relationship_id=relationship_data['ID(relationship)'],
                                    relationship_type=relationship_data['TYPE(relationship)'],
                                    properties=relationship_data['PROPERTIES(relationship)'],
                                    source_node=source_node,
                                    target_node=target_node)

    # DELETE relationship in the graph
    def delete_relationship(self, relationship_id: str):

        cypher = f"""
            MATCH (a)-[relationship]->(b)
            WHERE relationship.id = {relationship_id}
            DELETE relationship
            """

        with self._driver.session() as session:
            result = session.run(query=cypher,
                                 parameters={'relationship_id': relationship_id})

            relationship_data = result.data()

        # Confirm deletion was completed by empty response
        return relationship_data or {
            'response': f'Relationship with ID: {relationship_id} was successfully deleted from the graph.'
        }

    def get_users(self):
        return self.generic_get_nodes("User")

    def get_user_by_id(self, user_id: str):
        cypher = f"""
        MATCH (user:User)
        WHERE user.id = $user_id
        RETURN user
        """

        with self._driver.session() as session:
            result = session.run(query=cypher,
                                 parameters={'id': user_id})
            result_data = result.data()
            if not result_data:
                return None
            node_data = result_data[0]

        return schemas.Node(node_id=node_data["id"],
                            labels=["User"],
                            properties=node_data)

    def get_user_by_pseudo(self, pseudo: str):
        cypher = f"""
        MATCH (user:User)
        WHERE user.pseudo = $pseudo
        RETURN user
        """
        with self._driver.session() as session:
            try:
                result = session.run(query=cypher,
                                     parameters={'pseudo': pseudo})
            # TODO: Why is it returning an Exception when the auth fails
            except neo4j.exceptions.AuthError as e:
                print(e)
                return None
            result_data = result.data()
            if not result_data:
                return None
            node_data = result_data[0]["user"]
            print("NODE DATA:", node_data)
        return schemas.Node(node_id=node_data["id"],
                            labels=["User"],
                            properties=node_data)

    def get_user_by_email(self, email: str):
        cypher = f"""
                MATCH (user:User)
                WHERE user.email = $email
                RETURN user
                """
        with self._driver.session() as session:
            result = session.run(query=cypher,
                                 parameters={'email': email})
            result_data = result.data()

            if not result_data:
                return None
            node_data = result_data[0]["user"]
            print(node_data)
        return schemas.Node(node_id=node_data["id"],
                            labels=["User"],
                            properties=node_data)

    def create_user(self, user: schemas.UserCreate):
        """
        Tries to create the user in the Database. Will raise HTTPException if the email or pseudo
        already exists in the database, i.e. there is a user with one of these info.
        :param user: The user trying to create its account
        :return: a schemas.Node containing the data (not the password) of the user created on the DB.
        """
        db_user_by_email = self.get_user_by_email(user.email)
        if db_user_by_email:
            raise HTTPException(status_code=400, detail="Email already registered")
        db_user_by_pseudo = self.get_user_by_pseudo(user.pseudo)
        if db_user_by_pseudo:
            raise HTTPException(status_code=400, detail="Pseudo is already used.")

        current_date = str(datetime.now(timezone.utc))
        cypher = """CREATE (new_node:User {
                                pseudo:$pseudo, 
                                password:$password, 
                                email:$email, 
                                id:$id, 
                                created_by:$created_by, 
                                created_time:$created_time,
                                last_connection_time:$last_connection_time})

                    RETURN new_node, LABELS(new_node) as labels, ID(new_node) as id
                    """
        with self._driver.session() as session:
            result = session.run(
                query=cypher,
                parameters={
                    'pseudo': user.pseudo,
                    'password': get_password_hash(user.password),
                    'email': user.email,
                    'id': uuid4().hex,
                    'created_by': user.pseudo,
                    'created_time': current_date,
                    'last_connection_time': current_date,
                },
            )
            result_data = result.data()
            if not result_data:
                raise HTTPException(status_code=500, detail="Error when trying to create an account.")

            # {new_node: {}, labels: [...], id: ... }
            request_result = result_data[0]

        # we don't want to send back the password...
        del request_result["new_node"]["password"]

        neo4juser = schemas.Node(node_id=request_result["new_node"]["id"],
                                 labels=request_result["labels"],
                                 properties=request_result["new_node"])

        # TODO: When creating a User, we also have to link it to every Skill Node
        educ_items = self.get_educ_items(1000000)
        for educ_item in educ_items.nodes:
            relationship_result = self.create_relationship("User",
                                                           "id",
                                                           request_result["new_node"]['id'],
                                                           "EducItem",
                                                           "id",
                                                           educ_item.properties['id'],
                                                           "masters",
                                                           neo4juser,
                                                           {"mastery_level": 0.0})

        return neo4juser

    def update_user_last_connection(self, user: schemas.Node):
        current_date = str(datetime.now(timezone.utc))
        cypher = "MATCH (u:User {id:$id}) SET u.last_connection_time = $current_date"
        with self._driver.session() as session:
            result = session.run(
                query=cypher,
                parameters={
                    'id': user.properties["id"],
                    'current_date': current_date,
                },
            )
    def read_node_id(self, node_id: str):
        """
        **Retrieves data about a node in the graph, based on node ID.**

        :param **node_id** (str) - node id, used for indexed search

        :returns: Node response, with node id, labels, and properties.
        """

        cypher = f"""
        MATCH (node)
        WHERE node.id = {node_id}
        RETURN ID(node) as id, LABELS(node) as labels, node
        """

        with self._driver.session() as session:
            result = session.run(query=cypher,
                                 parameters={'id': node_id})

            node_data = result.data()[0]

        # Return Node response
        return schemas.Node(node_id=node_data['id'],
                            labels=node_data['labels'],
                            properties=node_data['node'])

    # /\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
    # EducFramework methods
    # /\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
    def get_educ_frameworks(self):
        return self.generic_get_nodes("EducFramework")

    def get_educ_framework_by_id(self, id: str):
        cypher = f"""
                MATCH (n:EducFramework)
                WHERE n.id = $id
                RETURN n
                """
        with self._driver.session() as session:
            result = session.run(query=cypher,
                                 parameters={'id': id})
            node_data = result.data()[0]

        return schemas.Node(**node_data)

    def get_educ_framework_by_title(self, title: str):
        cypher = f"""
                MATCH (n:EducFramework)
                WHERE n.title = $title
                RETURN n
                """
        with self._driver.session() as session:
            result = session.run(query=cypher,
                                 parameters={'title': title})
            node_data = result.data()[0]

        return schemas.Node(**node_data)

    # source: https://gist.github.com/jexp/5c1092933781ec4ea2a3
    def get_skill_graph(self, id: str):
        """
        Get all the nodes labelled EducItem starting from a Node labelled EducFramework with the id property given,
        with any path length (r*0..). In order to get only the wanted Nodes, we should not follow any Relation
        which is not part of the meta-pedagogical model (comprises, isLevelOfUnderstanding, etc.), so we should
        remove any link with a User (masters), or with an EducItem from any other EducFramework
        TODO: will make 2 requests, one for the EducFramework, the other for the corresponding graph
        :param id: The EducFramework id from which the traversal should start
        :return:
        """

        """
        if we only want to get the ids of nodes and relationships...
        cypher =  MATCH p = (:EducFramework {id: $id})-[r*0..]->(x)
                     WHERE ALL(rel IN relationships(p) WHERE type(rel) IN $relationship_types)
                     WITH collect(DISTINCT id(x)) as nodes, [r in collect(distinct last(r)) | [id(startNode(r)),id(endNode(r))]] as rels
                     RETURN size(nodes), size(rels), nodes, rels
        """

        # Here: x is a Node and r is the list of Relationship that leads from
        # the first node to x.
        """
        cypher = MATCH p = (:EducFramework {id:$id})-[r*0..]->(x)
                    WHERE ALL(rel IN relationships(p) WHERE type(rel) IN $relationship_types)
                    RETURN x, r
        """
        """
        cypher = MATCH path = (:EducFramework {id:$id})-[r*0..]->(x)
                 WHERE ALL(rel IN relationships(path) WHERE type(rel) IN ["comprises"])
                 RETURN collect(DISTINCT x) as nodes,
                       [r in collect(distinct last(r)) | [ID(startNode(r)), ID(endNode(r)), properties(r) ]] as rels
        """
        """
        # the EducFramework node is not retrieved...
        cypher = MATCH path = (origin:EducFramework {id:$id})-[r*0..]->(x)
                    WHERE ALL(rel IN relationships(path) WHERE type(rel) IN ["comprises"])
                    RETURN collect(DISTINCT x) as nodes,
                       [r in collect(distinct last(r)) | [startNode(r).id, endNode(r).id, type(r), properties(r) ]] as rels
        """

        """cypher = MATCH path = (origin:EducFramework {id:$id})-[r*0..]->(x)
        WHERE ALL(rel IN relationships(path) WHERE type(rel) IN["comprises","hasSkill"])
        RETURN collect(DISTINCT x) as nodes,
        [r in collect(distinct last(r))] as rels"""

        # it works on Neo4j desktop, but it does not return anything ?
        cypher = """MATCH path = (origin:EducFramework {id:$id})-[rel:comprises|hasSkill*0..]->(retVal) 
        WHERE NOT EXISTS((retVal)-[:comprises|hasSkill]->())
        RETURN nodes(path) as nodes, relationships(path) as rels      
        """
        records, summary, keys = self._driver.execute_query(cypher,
                                                            {'id': str(id)},
                                                            database=self.database)
        print(f"{len(records)} records for id {id}: {records}")
        print("The query `{query}` returned {records_count} records in {time} ms.".format(query=summary.query,
                                                                                          records_count=len(records),
                                                                                          time=summary.result_available_after))
        graph_result = self.generate_GraphNodeEdges_from_records(records)

        return graph_result

    def create_educ_framework(self, title: str, description: str, user: schemas.Node):
        return self.create_node(label="EducFramework",
                                node_attributes={"title": title, "description": description},
                                user=user)

    def update_educ_framework(self, node_id: str, new_attributes: dict):
        return self.update_node(node_id, new_attributes)

    def update_educ_item_labels(self, node_id: str, new_labels: list[str]):
        """

        :param node_id:
        :param new_labels: The list of new labels to add to this node. The EducItem label should remain,
                           and one of the extra label should be one from the list given in the metamodel
                           (Competency, Skill, Knowledge)
        :return:
        """
        node = self.get_node_by_id(node_id)
        if not node:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                                detail="Node not found.",
                                headers={"WWW-Authenticate": "Bearer"})

        # if at least 1 label given is not valid, we raise an Exception
        if sum(map(lambda x: 1 if x not in educ_item_valid_labels else 0, new_labels)) > 0:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                                detail="Operation not valid. Cannot set one of the labels given",
                                headers={"WWW-Authenticate": "Bearer"})

        # holds the label among educ_item_valid_labels items
        educitem_labels = list(set(node.labels).intersection(educ_item_valid_labels))
        new_labels_to_assign = list(set(new_labels).intersection(educ_item_valid_labels))

        # we must remove the label if it exists (if not, since REMOVE is idenmpotent, we ask
        # to remove a non-existant label.

        cypher = (f"MATCH (n:EducItem) WHERE n.id = $node_id"
                  "REMOVE n:{educitem_labels[0] if educitem_labels else a}"
                  "SET n:{new_labels_to_assign[0]}"
                  "RETURN n, LABELS(n)")

        with self._driver.session() as session:
            result = session.run(query=cypher,
                                 parameters={'node_id': node_id})
            node_data = result.data()[0]

    # /\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
    # EducItem methods
    # /\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
    def get_educ_items(self, limit: int = 100):
        return self.generic_get_nodes("EducItem")

    def create_educ_item_from_submit(self, educ_item: schemas.EducItemDataCreate, user: schemas.Node):
        educ_item_node = self.create_node(label="EducItem",
                                          node_attributes=educ_item.model_dump(),
                                          user=user)

        # when an EducItem is created, it should be linked to each user in the graph.
        users = self.get_users()
        for user in users:
            self.create_relationship(user["id"], educ_item_node["id"], "masters", user,
                                     {"mastery_level": 0.0})
        return educ_item_node

    def create_exercise(self, exercise: schemas.BaseExercise, user: schemas.Node):

        exercise_id = uuid4()
        properties = {"title": exercise.title,
                      "difficulty": exercise.difficulty,
                      }
        author_id = exercise.author_id
        educ_items_ids = exercise.educ_items
        unpacked_attributes = 'SET ' + ', '.join(
            f'new_node.{key}=\'{value}\'' for (key, value) in properties.items())

        cypher_author = self.get_user_by_id(author_id)

        cypher_exercise = f"""
            CREATE (new_node:Resource:Exercise)\n'
            SET new_node.created_by = $created_by\n'
            SET new_node.created_time = $created_time\n'
            {unpacked_attributes}\n
            RETURN new_node, LABELS(new_node) as labels, ID(new_node) as id')
            """
        with self._driver.session() as session:
            result = session.run(
                query=cypher_exercise,
                parameters={
                    'created_by': user.properties.get("pseudo", "?"),
                    'created_time': str(datetime.now(timezone.utc)),
                    'attributes': properties,
                },
            )

            node_exercise = result.data()[0]
        # When an exercise is created, it should be linked to the corresponding EducItems, and User.
        cypher_educ_items = """
            MATCH (n:EducItem) WHERE ANY (id in n.id WHERE id in $educ_items_ids
        """
        with self._driver.session() as session:
            result = session.run(query=cypher_educ_items,
                                 parameters={"educ_items_ids": exercise.educ_items})
            educ_item_nodes = result.data()

        for educ_item_node in educ_item_nodes:
            self.create_relationship(node_exercise["new_node"]["id"], educ_item_node["id"], "needs", user)
        return schemas.Node(node_id=node_exercise["new_node"]["id"],
                            labels=node_exercise["labels"],
                            properties=node_exercise["new_node"])
