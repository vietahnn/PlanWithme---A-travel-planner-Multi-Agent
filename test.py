from tools.tavily_tool import tavily_search
from backend import run_travel_agent

user_input = "Plan a complete 7 days india trip from bangladesh including flights, hotels and sightseeing under 2 lakhs"
response = run_travel_agent(user_input=user_input)
print(response)