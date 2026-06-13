import sys
import os
from flask import Flask, render_template, request, send_from_directory
import requests
from bs4 import BeautifulSoup

app = Flask(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def generate_rag_summary(query, web_snippets):
    """
    Feeds real-time web search results into an open-source AI model 
    so it can compile an accurate summary paragraph based on live facts.
    """
    if not web_snippets:
        return "No real-time web context available to analyze."
        
    # Combine the top web snippets into a single text block for the AI to read
    context_block = "\n".join([f"- {s}" for s in web_snippets[:4]])
    
    system_prompt = (
        f"You are Spectre AI, an advanced search assistant. "
        f"Analyze the following real-time web snippets and write a direct, cohesive summary paragraph answering the user's query: '{query}'.\n\n"
        f"Web Context:\n{context_block}\n\n"
        f"Rules: Start directly answering the question. Do not say 'Based on the text'. "
        f"Keep it under 4 sentences. Be highly factual and objective."
    )

    try:
        url = "https://ai4free.api.devsdocode.in/api/blackbox"
        payload = {
            "prompt": system_prompt,
            "history": []
        }
        response = requests.post(url, json=payload, timeout=5)
        if response.status_code == 200:
            return response.json().get("response", "").strip()
    except Exception as e:
        print(f"RAG AI compilation failed: {e}", file=sys.stderr)
    return "Spectre AI timed out while analyzing the search stream."

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/search")
def search():
    query = request.args.get("q")
    if not query:
        return render_template("index.html")

    # 1. Fetch live search index data from DuckDuckGo first
    ddg_url = "https://html.duckduckgo.com/html/"
    payload = {'q': query}
    search_results = []
    just_snippets = []

    try:
        response = requests.post(ddg_url, data=payload, headers=HEADERS, timeout=5)
        soup = BeautifulSoup(response.text, "html.parser")
        
        for item in soup.find_all("div", class_="result__body"):
            title_anchor = item.find("a", class_="result__url")
            snippet_box = item.find("a", class_="result__snippet")
            
            if title_anchor:
                snippet_text = snippet_box.text.strip() if snippet_box else ""
                search_results.append({
                    "title": title_anchor.text.strip(),
                    "link": title_anchor["href"],
                    "snippet": snippet_text if snippet_text else "No snippet available."
                })
                if snippet_text:
                    just_snippets.append(snippet_text)

    except Exception as e:
        print(f"Search index connection error: {e}", file=sys.stderr)

    # 2. Feed those fresh web snippets into our AI model to create the top paragraph
    ai_overview = generate_rag_summary(query, just_snippets)

    return render_template(
        "results.html", 
        query=query, 
        search_results=search_results, 
        ai_overview=ai_overview
    )

@app.route('/templates/backgrounds/<path:filename>')
def serve_background(filename):
    backgrounds_dir = os.path.join(app.root_path, 'templates', 'backgrounds')
    return send_from_directory(backgrounds_dir, filename)

if __name__ == "__main__":
    app.run(debug=True, port=5000)
