import sys
import os
from flask import Flask, render_template, request, send_from_directory
import requests
from bs4 import BeautifulSoup
from groq import Groq

app = Flask(__name__)
# REPLACE THIS WITH YOUR KEY
client = Groq(api_key="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")

HEADERS = {"User-Agent": "Mozilla/5.0"}

def generate_rag_summary(query, web_snippets):
    if not web_snippets: return "No context available."
    context = "\n".join([f"- {s}" for s in web_snippets[:3]])
    
    try:
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": f"Query: {query}\nContext: {context}\nSummarize in 3 sentences."}],
            model="llama3-8b-8192",
        )
        return chat_completion.choices[0].message.content
    except Exception as e:
        return f"AI Error: {str(e)}"

@app.route("/search")
def search():
    query = request.args.get("q")
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
            snippets.append(s_text)
            
    ai_overview = generate_rag_summary(query, snippets)
    return render_template("results.html", query=query, search_results=search_results, ai_overview=ai_overview)

# ... (keep your home and background routes)
