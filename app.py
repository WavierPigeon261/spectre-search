import sys
from flask import Flask, render_template, request
import requests
from bs4 import BeautifulSoup

app = Flask(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def fetch_ai_summary(query):
    """
    Connects to a fast, open-source inference router to get an instant,
    anonymous text response without requiring private developer API keys.
    """
    try:
        # Using an anonymous text generation endpoint for quick search summaries
        url = "https://ai4free.api.devsdocode.in/api/blackbox"
        payload = {
            "prompt": f"Provide a concise, direct, 2-3 sentence summary answering this search query: {query}. Do not say 'Here is your summary'. Start directly.",
            "history": []
        }
        response = requests.post(url, json=payload, timeout=4)
        if response.status_code == 200:
            return response.json().get("response", "").strip()
    except Exception as e:
        print(f"AI Fetch timed out or failed: {e}", file=sys.stderr)
    return None

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/search")
def search():
    query = request.args.get("q")
    if not query:
        return render_template("index.html")

    # 1. Fetch the AI overview in the background
    ai_overview = fetch_ai_summary(query)

    # 2. Fetch standard private search engine index results
    ddg_url = "https://html.duckduckgo.com/html/"
    payload = {'q': query}
    search_results = []

    try:
        response = requests.post(ddg_url, data=payload, headers=HEADERS, timeout=5)
        soup = BeautifulSoup(response.text, "html.parser")
        
        for item in soup.find_all("div", class_="result__body"):
            title_anchor = item.find("a", class_="result__url")
            snippet_box = item.find("a", class_="result__snippet")
            
            if title_anchor:
                search_results.append({
                    "title": title_anchor.text.strip(),
                    "link": title_anchor["href"],
                    "snippet": snippet_box.text.strip() if snippet_box else "No snippet available."
                })

    except Exception as e:
        print(f"Search index connection error: {e}", file=sys.stderr)

    # Pass both the AI text and the links directly to your layout template
    return render_template(
        "results.html", 
        query=query, 
        search_results=search_results, 
        ai_overview=ai_overview
    )

if __name__ == "__main__":
    app.run(debug=True, port=5000)
