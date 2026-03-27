"""
PharmaTrack — Cosine Similarity Microservice
Flask app that exposes GET /api/cosine-alternatives?med=<query>
Runs on port 5000 alongside the existing Node.js server on port 3000.
"""

import os
import csv
from flask import Flask, request, jsonify
from flask_cors import CORS
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

app = Flask(__name__)
CORS(app)  # Allow Node.js on :3000 to call this service

# ── CONFIG ──
CSV_PATH = os.path.join(os.path.dirname(__file__), 'dataset', 'alternative_medicine.csv')

# ── LOAD & VECTORISE DATASET AT STARTUP ──
medicines = []      # list of dicts: {brand, name, chemical_composition, price, form}
corpus    = []      # one string per medicine (used for TF-IDF)

def load_data():
    global medicines, corpus
    medicines = []
    corpus    = []

    with open(CSV_PATH, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Normalise keys to lowercase and strip whitespace
            clean = {k.strip().lower(): v.strip() for k, v in row.items()}
            medicines.append(clean)
            # Combine all text fields into one document for TF-IDF
            doc = ' '.join([
                clean.get('chemical_composition', ''),
                clean.get('name', ''),
                clean.get('brand', ''),
                clean.get('form', '')
            ])
            corpus.append(doc.lower())

    print(f"✅ Loaded {len(medicines)} medicines from CSV")

# ── TF-IDF VECTORISER ──
# Fit once at startup so every request is just a transform + dot product
vectorizer = TfidfVectorizer(
    analyzer='word',
    ngram_range=(1, 2),   # unigrams + bigrams catches "500mg", "acid aspirin" etc.
    min_df=1,
    sublinear_tf=True     # log(1+tf) dampens very common terms
)

tfidf_matrix = None   # shape: (n_medicines, n_features)

def build_vectors():
    global tfidf_matrix
    tfidf_matrix = vectorizer.fit_transform(corpus)
    print(f"✅ TF-IDF matrix built: {tfidf_matrix.shape[0]} docs × {tfidf_matrix.shape[1]} features")

# Run on import
load_data()
build_vectors()


# ── ROUTE ──
@app.route('/api/cosine-alternatives', methods=['GET'])
def cosine_alternatives():
    query = request.args.get('med', '').strip()
    if not query:
        return jsonify({'results': []})

    # Vectorise the query using the already-fitted vocabulary
    query_vec = vectorizer.transform([query.lower()])

    # Cosine similarity: shape (1, n_medicines)
    scores = cosine_similarity(query_vec, tfidf_matrix).flatten()

    # Pair each medicine with its score, filter zero-score rows
    scored = [
        {**medicines[i], 'score': float(scores[i])}
        for i in range(len(medicines))
        if scores[i] > 0
    ]

    # Sort: highest similarity first, then cheapest price on tie
    scored.sort(key=lambda r: (-r['score'], float(r.get('price', 0) or 0)))

    # Return top 10
    top10 = scored[:10]

    return jsonify({'results': top10})


# ── HEALTH CHECK ──
@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'medicines_loaded': len(medicines),
        'vocab_size': len(vectorizer.vocabulary_) if tfidf_matrix is not None else 0
    })


if __name__ == '__main__':
    app.run(port=5000, debug=False)
