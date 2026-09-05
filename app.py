import sys
import os
from flask import Flask, render_template, request, send_from_directory, jsonify
import requests
from bs4 import BeautifulSoup
from groq import Groq

app = Flask(__name__, static_url_path='/static', static_folder='static')

HEADERS = {"User-Agent": "Mozilla/5.0"}


def get_groq_client():
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return None
    return Groq(api_key=api_key)

def generate_rag_summary(query, web_snippets):
    # If snippets are thin, guide the AI to use its internal training data
    context = "\n".join([f"- {s}" for s in web_snippets[:4]]) if web_snippets else "No specific web context found."
    
    system_prompt = (
        f"You are Spectre AI, developed by Spectre Technologies. Provide a precise, high-quality answer to the user's inquiry.\n\n"
        f"Context provided from current web search results:\n{context}\n\n"
        f"Rules:\n"
        f"1. Start with a single, concise paragraph of exactly 6 lines or fewer.\n"
        f"2. If applicable, provide 4 to 5 bullet points below the paragraph for key details, one by one on each line.\n"
        f"3. Keep the content extremely precise, professional, and directly relevant."
    )
    return system_prompt

@app.route("/")
def home():
    return render_template("index.html")

@app.route('/status', methods=['GET'])
def system_status():
    return jsonify({
        "status": "operational",
        "message": "Spectre core backend network is fully functional",
        "version": "1.0.0"
    }), 200

@app.route("/health")
def health_check():
    return "OK", 200
    
@app.route('/robots.txt')
def serve_robots():
    return send_from_directory(app.root_path, 'robots.txt')

# 1. Initial Search Endpoint (Fires when you submit a search query from index.html)
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
            
    # Assemble the dynamic search rules combined with current web findings
    system_instruction = generate_rag_summary(query, snippets)
    client = get_groq_client()
    
    if client is None:
        ai_overview = "AI overview is unavailable because GROQ_API_KEY is not configured."
    else:
        try:
            chat_completion = client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": query}
                ],
                model="openai/gpt-oss-120b", # <-- Fixed: Replaced old 70b model
            )
            ai_overview = chat_completion.choices[0].message.content
        except Exception as e:
            ai_overview = f"AI Error: {str(e)}"
        
    return render_template(
        "results.html", 
        query=query, 
        search_results=search_results, 
        ai_overview=ai_overview,
        system_instruction=system_instruction # Passed to frontend to keep memory of the search context
    )

# 2. Asynchronous Chat Follow-Up Endpoint (Fires in the background when typing into the thread box)
@app.route("/api/followup", methods=["POST"])
def followup():
    data = request.json or {}
    thread = data.get("thread", [])
    system_instruction = data.get("system_instruction", "You are Spectre AI, a high-precision search assistant.")
    
    if not thread:
        return jsonify({"error": "No message thread history provided"}), 400
        
    # Reassemble the complete conversation chain for Groq context evaluation
    messages_payload = [{"role": "system", "content": system_instruction}] + thread
    client = get_groq_client()

    if client is None:
        return jsonify({
            "status": "error",
            "message": "GROQ_API_KEY is not configured on the server."
        }), 503
    
    try:
        chat_completion = client.chat.completions.create(
            messages=messages_payload,
            model="openai/gpt-oss-120b", # <-- Fixed: Replaced old 70b model
        )
        reply = chat_completion.choices[0].message.content
        return jsonify({"status": "success", "reply": reply})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/templates/backgrounds/<path:filename>')
def serve_background(filename):
    return send_from_directory(os.path.join(app.root_path, 'templates', 'backgrounds'), filename)

if __name__ == "__main__":
    app.run(debug=True, port=5000)