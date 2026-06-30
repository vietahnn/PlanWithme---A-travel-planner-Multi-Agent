# ✈️ PlanWithme — Multi-Agent AI Travel Planner

A full-stack travel planning application powered by **4 collaborative AI agents** running on LangGraph. Users describe their dream trip in natural language, and the system automatically searches live flights, finds hotels, builds a day-by-day itinerary, and delivers a polished travel plan.

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.136-009688?logo=fastapi&logoColor=white)
![LangGraph](https://img.shields.io/badge/LangGraph-1.2-FF6F00)
![Groq](https://img.shields.io/badge/LLM-Llama_3.3_70B-8B5CF6)
![License](https://img.shields.io/badge/License-MIT-green)

## How It Works

PlanWithme uses a **sequential multi-agent pipeline** where each agent handles one specialized step of the travel planning process:

```
User Query
    │
    ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  ✈️ Flight Agent │────▶│  🏨 Hotel Agent  │────▶│ 📅 Itinerary    │────▶│  ✅ Final Agent  │
│                 │     │                 │     │    Agent        │     │                 │
│ AviationStack   │     │ Tavily Search   │     │ LLM generates   │     │ Combines all    │
│ live flight API │     │ web research    │     │ day-by-day plan │     │ into final plan │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
                                                                              │
                                                                              ▼
                                                                      Complete Travel Plan
                                                                    (flights + hotels +
                                                                     itinerary + budget)
```

**Agent Details:**

| Agent | Role | Data Source |
|-------|------|-------------|
| **Flight Agent** | Searches live flight data based on origin/destination parsed from the user query | [AviationStack API](https://aviationstack.com/) |
| **Hotel Agent** | Finds top-rated hotel recommendations for the destination | [Tavily Search API](https://tavily.com/) |
| **Itinerary Agent** | Generates a practical, budget-aware day-by-day travel itinerary | Groq LLM (Llama 3.3 70B) |
| **Final Agent** | Combines all results into a formatted travel plan with budget estimates | Groq LLM (Llama 3.3 70B) |

Conversation state is persisted in **PostgreSQL** via LangGraph's checkpoint system, so users can continue a planning session across multiple messages.

## Tech Stack

**Backend:**
- **FastAPI** — async web framework with automatic API docs
- **LangGraph** — multi-agent orchestration with stateful workflows
- **LangChain + Groq** — LLM integration using Llama 3.3 70B Versatile
- **PostgreSQL** — conversation memory via LangGraph checkpointing
- **Jinja2** — server-side HTML templating

**Frontend:**
- Vanilla **HTML/CSS/JavaScript** — no framework dependencies
- Dark-mode glassmorphism UI with animated backgrounds
- Real-time agent pipeline visualization

**External APIs:**
- **AviationStack** — live flight status and route data
- **Tavily** — AI-optimized web search for hotel information

## Project Structure

```
PlanWithme/
├── app.py              # FastAPI application (routes, API endpoints)
├── backend.py          # LangGraph agent pipeline & orchestration
├── main.py             # CLI entry point
├── tools/
│   ├── flight_tool.py  # AviationStack flight search + NLP route parsing
│   └── tavily_tool.py  # Tavily web search wrapper
├── templates/
│   └── index.html      # Jinja2 HTML template
├── static/
│   ├── style.css       # UI design system (dark mode, glassmorphism)
│   └── script.js       # Client-side chat logic & pipeline animation
├── requirements.txt
├── pyproject.toml
└── .env                # API keys (not committed)
```

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-username/PlanWithme---A-travel-planner-Multi-Agent.git
cd PlanWithme---A-travel-planner-Multi-Agent
```

### 2. Create a virtual environment

```bash
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

Or with `uv`:

```bash
uv sync
```

### 4. Configure environment variables

Create a `.env` file in the project root:

```env
# Required — Groq LLM
GROQ_API_KEY=your_groq_api_key

# Required — PostgreSQL (for conversation memory)
DATABASE_URL=postgresql://user:password@host:port/dbname

# Required — AviationStack (for flight data)
AVIATIONSTACK_API_KEY=your_aviationstack_api_key

# Required — Tavily (for hotel search)
TAVILY_API_KEY=your_tavily_api_key

# Optional — Default departure airport (default: DAC)
DEFAULT_ORIGIN_IATA=SGN
```

**Where to get API keys:**

| Service | Sign Up | Free Tier |
|---------|---------|-----------|
| [Groq](https://console.groq.com/) | Free account | Generous free usage |
| [AviationStack](https://aviationstack.com/) | Free plan available | 100 requests/month |
| [Tavily](https://tavily.com/) | Free plan available | 1000 searches/month |
| [Render PostgreSQL](https://render.com/) | Free database | 90-day free tier |

### 5. Run the application

```bash
python app.py
```

Open your browser at **http://127.0.0.1:8000**

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Main web interface |
| `POST` | `/api/travel` | Submit a travel planning query |
| `GET` | `/health` | Health check |

### POST `/api/travel`

**Request:**
```json
{
  "message": "Plan a 5-day trip to Tokyo from Vietnam",
  "thread_id": null
}
```

**Response:**
```json
{
  "success": true,
  "thread_id": "user_abc123...",
  "answer": "Complete formatted travel plan...",
  "flight_results": "Live flight data...",
  "hotel_result": "Hotel recommendations...",
  "itinerary": "Day-by-day itinerary...",
  "llm_calls": 4
}
```

## Example Queries

- *"Plan a 5-day trip to Tokyo from Vietnam including flights and hotels"*
- *"Budget trip to Bangkok from Ho Chi Minh City for 3 days"*
- *"7-day Paris trip with sightseeing from Vietnam"*
- *"Find flights from Singapore to London"*
- *"Plan a complete Korea trip for 6 days"*

The flight tool supports natural language parsing — it can extract origins, destinations, city names, country names, and IATA airport codes from conversational queries.

## Notes

- AviationStack provides **live flight status data**, not ticket prices. For actual fare pricing, a dedicated flight pricing API (like Amadeus) would be needed.
- Conversation history is stored in PostgreSQL, so the same `thread_id` can be reused to continue a planning session.
- The LLM (Llama 3.3 70B) runs on Groq's infrastructure for fast inference.

## License

This project is for educational purposes as part of an LLM & Agent course.
