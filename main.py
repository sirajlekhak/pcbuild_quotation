from flask import Flask, request, jsonify
from scrapers.amazon import search_amazon
from scrapers.flipkart import search_flipkart
from scrapers.mdcomputers import search_md

app = Flask(__name__)

@app.route("/api/search")
def search():
    query = request.args.get("q", "")
    if not query:
        return jsonify({"error": "Missing query"}), 400

    amazon_results = search_amazon(query)
    flipkart_results = search_flipkart(query)
    md_results = search_md(query)

    all_results = amazon_results + flipkart_results + md_results

    return jsonify({
        "products": all_results
    })

if __name__ == "__main__":
    app.run(debug=True, port=5000)
