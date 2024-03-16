# Intro

This is a personnal project I started in order to learn FastAPI, JS and Neo4j programming. The main goal is to propose a small website that allows :

1. To store and publish math and CS exercises in LaTeX format ;
2. To propose a skill-graph builder, in a similar way as the COMPeR project did (https://comper.fr/);
3. To link exercises to the related skills;
4. To track skill mastery of users by solving exercises online;
5. To propose exercises automatically with adaptive learning algorithms.

# How to install

You would need Python 3.9+, FastAPI and Neo4j Desktop (since the DB is not deployed yet).

# How does it work

When launching the uvicorn server and the Neo4j application, you have to create an account first and then log in. When logged in,
you can access to the skill builder.
