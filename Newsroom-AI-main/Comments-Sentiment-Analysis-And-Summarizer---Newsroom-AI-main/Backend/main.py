from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from datetime import datetime

from Backend.clustering import cluster_comments, generate_cluster_headline
from Backend.db import articles_col, comments_col
from Backend.news_fetcher import fetch_and_store_articles
from ML.summarizer import summarize_comments

app = FastAPI()

# ---------------- CACHE ----------------
summary_cache = {}

# ---------------- STATIC & TEMPLATES ----------------

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# ---------------- CORS ----------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- STARTUP PIPELINE ----------------
import threading
from ML.sentiment import load_model as load_emotion_model, start_watcher as start_emotion_watcher

@app.on_event("startup")
def startup_event():
    print("🚀 Starting VISAI backend...")
    
    def bg_fetch():
        fetch_and_store_articles()
        print("✅ Startup pipeline complete")

    def bg_sentiment_watcher():
        load_emotion_model()
        start_emotion_watcher()

    threading.Thread(target=bg_fetch, daemon=True).start()
    threading.Thread(target=bg_sentiment_watcher, daemon=True).start()
    print("✅ Server started. Background fetching and sentiment watcher initiated.")


# ---------------- PAGE ROUTES ----------------

@app.get("/")
def root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/articles")
def get_articles_page(request: Request):
    # To maintain existing API functionality while serving the template
    if "text/html" in request.headers.get("accept", ""):
        return templates.TemplateResponse("articles.html", {"request": request})
    return list(articles_col.find({}, {"_id": 0}))


@app.get("/article")
def get_article_page(request: Request):
    return templates.TemplateResponse("article.html", {"request": request})


@app.get("/analytics")
def get_analytics_page(request: Request):
    return templates.TemplateResponse("analytics.html", {"request": request})


# ---------------- ARTICLES API ----------------

@app.get("/articles/{article_id}")
def get_article(article_id: str):
    article = articles_col.find_one({"id": article_id}, {"_id": 0})
    if not article:
        return {"error": "Article not found"}
    return article


# ---------------- COMMENTS API ----------------

@app.get("/articles/{article_id}/comments")
def get_comments(article_id: str):
    return list(
        comments_col.find(
            {"article_id": article_id},
            {"_id": 0}
        ).sort("created_at", -1)
    )


@app.post("/articles/{article_id}/comments")
def add_comment(article_id: str, comment: dict):
    if not comment.get("text"):
        return {"error": "Comment text is required"}
        
    username = comment.get("username", "Anonymous")

    comments_col.insert_one({
        "article_id": article_id,
        "text": comment["text"],
        "source": f"manual user: {username}",
        "created_at": datetime.utcnow()
    })

    return {"message": "Comment added successfully"}


# ---------------- AI CLUSTERS API ----------------

@app.get("/articles/{article_id}/clusters")
def get_clusters(article_id: str):

    comments = list(
        comments_col.find(
            {"article_id": article_id},
            {"_id": 0, "text": 1}
        )
    )

    comment_texts = [c["text"] for c in comments if c.get("text")]

    if not comment_texts:
        return {"error": "No comments found"}

    clusters = cluster_comments(comment_texts, n_clusters=4)
    total_comments = len(comment_texts)

    result = []

    for cluster_id, cluster_comments_list in clusters.items():

        if not cluster_comments_list:
            continue

        headline = generate_cluster_headline(cluster_comments_list)

        percentage = round(
            (len(cluster_comments_list) / total_comments) * 100,
            1
        )

        result.append({
            "cluster_id": int(cluster_id),
            "headline": headline,
            "percentage": percentage
        })

    return result


# ---------------- SUMMARY API ----------------

@app.get("/articles/{article_id}/summary")
def get_summary(article_id: str):

    if article_id in summary_cache:
        print("⚡ Returning cached summary")
        return summary_cache[article_id]

    comments = list(
        comments_col.find(
            {"article_id": article_id},
            {"_id": 0, "text": 1}
        )
    )

    comment_texts = [c["text"] for c in comments if c.get("text")]

    if not comment_texts:
        return {"error": "No comments found"}

    print("🧠 Generating new Gemini summary...")

    summary = summarize_comments(comment_texts)
    summary_cache[article_id] = summary

    return summary


# ---------------- ANALYTICS API ----------------

@app.get("/api/analytics/{article_id}")
def get_analytics(article_id: str):

    comments = list(
        comments_col.find(
            {"article_id": article_id},
            {"_id": 0, "emotion_label": 1, "created_at": 1}
        )
    )

    article = articles_col.find_one({"id": article_id}, {"_id": 0, "title": 1})
    article_title = article.get("title", "Live Article") if article else "Live Article"

    if not comments:
        return {"error": "No comments found"}

    total = len(comments)

    # ---------------- SENTIMENT DISTRIBUTION ----------------

    classified_comments = [
        c for c in comments if c.get("emotion_label")
    ]

    classified_total = len(classified_comments)

    emotion_counts = {}

    for c in classified_comments:
        label = c.get("emotion_label")
        emotion_counts[label] = emotion_counts.get(label, 0) + 1

    if classified_total == 0:
        sentiment_dist = {}
    else:
        sentiment_dist = {
            label.lower(): round((count / classified_total) * 100, 1)
            for label, count in emotion_counts.items()
        }

    # ---------------- SENTIMENT TREND ----------------
    # Sort comments by time
    comments_sorted = sorted(
        comments,
        key=lambda x: x.get("created_at", datetime.utcnow())
    )

    trend_data = []
    running_negative = 0
    running_total = 0

    negative_labels = {"anger", "sadness", "fear"}

    for c in comments_sorted:
        running_total += 1
        if c.get("emotion_label") in negative_labels:
            running_negative += 1

        trend_data.append(
            round((running_negative / running_total), 2)
        )

    # ---------------- KPIs ----------------
    dominant_sentiment = max(emotion_counts, key=emotion_counts.get) if emotion_counts else "Unknown"

    positive_count = emotion_counts.get("joy", 0) + emotion_counts.get("love", 0)
    negative_count = (
        emotion_counts.get("anger", 0) +
        emotion_counts.get("sadness", 0) +
        emotion_counts.get("fear", 0)
    )

    kpis = [
        {
            "title": "Total Comments",
            "value": total,
            "subtitle": "live",
            "trend": None
        },
        {
            "title": "Dominant Emotion",
            "value": dominant_sentiment,
            "subtitle": "most frequent",
            "trend": None
        },
        {
            "title": "Positive %",
            "value": f"{round((positive_count / total) * 100)}%",
            "subtitle": "joy + love",
            "trend": None
        },
        {
            "title": "Negative %",
            "value": f"{round((negative_count / total) * 100)}%",
            "subtitle": "anger + sadness + fear",
            "trend": None
        }
    ]

    return {
        "article": {
            "title": article_title,
            "source": "Database",
            "category": "General",
            "published": "Live",
            "totalComments": total
        },
        "kpis": kpis,
        "topics": {"labels": [], "values": []},
        "sentimentDist": sentiment_dist,
        "sentimentTrend": trend_data,
        "heatmap": [],
        "topicEvolution": {"labels": [], "datasets": []},
        "entities": [],
        "safety": {"toxicity": "low", "hate": "low", "spam": "low"}
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("Backend.main:app", host="0.0.0.0", port=8000)