import sys
import os
from flask import Flask, render_template, request, send_from_directory
import requests
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor

app = Flask(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def generate_rag_summary(query, web_snippets):
    if not web_snippets:
        return "No real-time web context available to analyze."
        
    context_block = "\n".join([f"- {s}" for s in web_snippets[:4]])
    
    system_prompt = (
        f"You are Spectre AI. Analyze these snippets and write a direct, cohesive summary paragraph "
        f"answering: '{query}'.\n\nContext:\n{context_block}\n\n"
        f"Rules: Start answering directly. No filler. Under 4 sentences. Factual."
    )

    try:
        url = "https://ai4free.api.devsdocode.in/api/blackbox"
        payload = {"prompt": system_prompt, "history": []}
        # Increased timeout to 12s for the AI to process
        response = requests.post(url, json=payload, timeout=12)
        if response.status_code == 200:
            return response.json().get("response", "").strip()
    except Exception as e:
        print(f"RAG AI error: {e}", file=sys.stderr)
    return "Spectre AI is currently unavailable. Please refresh."

def fetch_search_results(query):
    ddg_url = "https://html.duckduckgo.com/html/"
    payload = {'q': query}
    results = []
    snippets = []
    try:
        response = requests.post(ddg_url, data=payload, headers=HEADERS, timeout=8)
        soup = BeautifulSoup(response.text, "html.parser")
        for item in soup.find_all("div", class_="result__body"):
            title = item.find("a", class_="result__url")
            snip = item.find("a", class_="result__snippet")
            if title:
                s_text = snip.text.strip() if snip else ""
                results.append({"title": title.text.strip(), "link": title["href"], "snippet": s_text or "No snippet."})
                if s_text: snippets.append(s_text)
    except Exception as e:
        print(f"Scrape error: {e}", file=sys.stderr)
    return results, snippets

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/search")
def search():
    query = request.args.get("q")
    if not query:
        return render_template("index.html")

    # Use ThreadPoolExecutor to run Search and AI in parallel
    with ThreadPoolExecutor(max_workers=2) as executor:
        future_search = executor.submit(fetch_search_results, query)
        search_results, snippets = future_search.result()
        
        # Now trigger the AI summary using the snippets we just got
        future_ai = executor.submit(generate_rag_summary, query, snippets)
        ai_overview = future_ai.result()

    return render_template(
        "results.html", 
        query=query, 
        search_results=search_results, 
        ai_overview=ai_overview
    )

@app.route('/templates/backgrounds/<path:filename>')
def serve_background(filename):
    return send_from_directory(os.path.join(app.root_path, 'templates', 'backgrounds'), filename)

if __name__ == "__main__":
    app.run(debug=True, port=5000)
