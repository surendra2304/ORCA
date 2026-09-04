import operator
from typing import TypedDict, Annotated

class ORCAState(TypedDict):
    query: str
    language: str                # "en" | "te"
    entities: dict               # {lat, lon, location_name, date}
    needed_agents: list[str]
    execution_plan: list[list[str]]
    agent_outputs: dict
    final_answer: str
    # trace uses operator.add so we can easily append by returning new list elements
    trace: Annotated[list[dict], operator.add]
