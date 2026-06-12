import sys
from flask import Flask, render_template, request
import requests
from bs4 import BeautifulSoup

app = Flask(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/search")
def search():
    query = request.args.get("q")
    if not query:
        return render_template("index.html")

    # Connect directly to DuckDuckGo's raw HTML interface
    ddg_url = "https://html.duckduckgo.com/html/"
    payload = {'q': query}

    try:
        # Send the search query using the server's identity, keeping the user invisible
        response = requests.post(ddg_url, data=payload, headers=HEADERS, timeout=5)
        soup = BeautifulSoup(response.text, "html.parser")
        
        results = []
        # Parse out the raw HTML entries
        for item in soup.find_all("div", class_="result__body"):
            title_anchor = item.find("a", class_="result__url")
            snippet_box = item.find("a", class_="result__snippet")
            
            if title_anchor:
                results.append({
                    "title": title_anchor.text.strip(),
                    "link": title_anchor["href"],
                    "snippet": snippet_box.text.strip() if snippet_box else "No snippet available."
                })
        
        # Render the custom results template using the Spectre brand layout
        return render_template("results.html", query=query, search_results=results)

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return "Failed to establish an anonymous portal connection to Spectre nodes."

if __name__ == "__main__":
    app.run(debug=True, port=5000)