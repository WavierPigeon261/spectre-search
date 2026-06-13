import sys
import os
from flask import Flask, render_template, request, send_from_directory
import requests
from bs4 import BeautifulSoup
from groq import Groq

app = Flask(__name__)

# Ensure the key is pulled from your environment variables
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
HEADERS = {"User-Agent": "Mozilla/5.0"}

def generate_rag_summary(query, web_snippets):
    # If snippets are thin, we guide the AI to use its internal training data
    context = "\n".join([f"- {s}" for s in web_snippets[:4]]) if web_snippets else "No specific web context found."
    
    system_prompt = (
        f"You are Spectre AI. Provide a precise, high-quality answer to: '{query}'.\n\n"
        f"Context provided:\n{context}\n\n"
        f"Rules:\n"
        f"1. Start with a single, concise paragraph of exactly 6 lines or fewer.\n"
        f"2. If applicable, provide 4 to 5 bullet points below the paragraph for key details.\n"
        f"3. Keep the content extremely precise, professional, and directly relevant."
    )
    
    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a concise, high-precision search assistant."},
                {"role": "user", "content": system_prompt}
            ],
            model="llama-3.3-70b-versatile",
        )
        return chat_completion.choices[0].message.content
    except Exception as e:
        return f"AI Error: {str(e)}"

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/search")
def search():
    query = request.args.get("q", "").strip()
    if not query: return render_template("index.html")
    
    ddg_url = "https://html.duckduckgo.com/html/"
    response = requests.post(ddg_url, data={'q': query}, headers=HEADERS)
    soup = BeautifulSoup(response.text, "html.parser")
    
    search_results = []
    snippets = []
    for item in soup.find_all("div", class_="result__body"):
        title = item.find("a", class_="result__url")
        snip = item.find("a", class_="result__snippet")
        if title:
            s_text = snip.text.strip() if snip else ""
            search_results.append({"title": title.text.strip(), "link": title["href"], "snippet": s_text})
            if s_text: snippets.append(s_text)
            
    ai_overview = generate_rag_summary(query, snippets)
    return render_template("results.html", query=query, search_results=search_results, ai_overview=ai_overview)

@app.route('/templates/backgrounds/<path:filename>')
def serve_background(filename):
    return send_from_directory(os.path.join(app.root_path, 'templates', 'backgrounds'), filename)

if __name__ == "__main__":
    app.run(debug=True, port=5000)
