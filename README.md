# Specstar

Platform + CLI tool for collaborative spec-driven development.

Main Features:
* Project specs and documentation maintained independently from codebase
* Integrated knowledge graph for large codebase understanding and dependency mapping
* Agentic tasks and workflows for planning features, epics, sprints and whole projects
* Web-ui for managing projects, tasks and requirements
* CLI tool that connects coding agents to the platform within project repo

## Components

### Platform

* Platform as a service, open-source community edition run locally
* User authentication, user can belong to an organization
* Projects belong to user or organization
* Each project has a Knowledge-graph and markdown documents

### CLI Tool

* CLI tool `specstar` connects to platform instance (API key)
* Commands to fetch project context, specs, requirements
* Observibility hooks to monitor sessions
