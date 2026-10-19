**Spectre Search - a lightweight web search and AI-answer interface.**

---
<!--![Service Down](https://img.shields.io/badge/service-down-red?style=for-the-badge) -->

[![Spectre-Search](https://img.shields.io/badge/Click_to_open-Spectre_Search-blue?style=for-the-badge)](https://spectresearch.vercel.app)

![License](https://img.shields.io/badge/License-AGPL--V3.0-yellow?style=for-the-badge)

---

Spectre Search is a lightweight search and AI-answer application. Search queries are sent from the server to DuckDuckGo, and AI prompts and any supplied conversation context are sent to Groq when AI answers are enabled. The app does not guarantee anonymity or control providers' retention and processing practices; review their current privacy policies before use.

---

## ⚙️ How It Works

* **Web search:** The Flask server requests HTML search results from DuckDuckGo.
* **AI answers:** When `GROQ_API_KEY` is configured, search snippets and questions are sent to Groq to generate answers.
* **Browser storage:** Search and Ask history and Ask conversation threads are stored in the browser's `localStorage`. They are not synchronized by this app but remain on the device until cleared.
* **Hosting:** The hosting provider necessarily handles incoming network requests. Consult its privacy and logging settings before deploying.

## Run locally

Install the packages listed in `requirements.txt`, set `GROQ_API_KEY` if AI answers are needed, then run `python app.py`. For production, use a WSGI server such as Gunicorn; Flask debug mode is off unless `FLASK_DEBUG=1` is explicitly set.

The `/status` and `/health` endpoints only report that the Flask application is responding; they do not check DuckDuckGo or Groq availability. `robots.txt` gives crawler guidance only and does not restrict access to API routes.

---
