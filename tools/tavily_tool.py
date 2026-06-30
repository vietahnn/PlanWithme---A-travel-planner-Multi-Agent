from tavily import TavilyClient
import os
from dotenv import load_dotenv
load_dotenv()

client = TavilyClient(
    api_key=os.getenv("TAVILY_API_KEY")
)

def tavily_search(query:str):
    response = client.search(
        query=query,
        max_results= 5 ,  
    )
    result = []
    
    for index, data in enumerate(response["results"]):
        title = data.get("title","")
        url = data.get("url"," ")
        content = data.get("content"," ")

        if len(content)> 300:
            content = content[:300].rsplit(" ",1)[0] + "..."
        result.append(f"{index+1}. **{title}** \n {url} \n {content}")
    return "\n\n".join(result)