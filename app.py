from flask import Flask, request, jsonify
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager

from backend.scrapers.amazon import scrape_amazon
from backend.scrapers.flipkart import scrape_flipkart
from backend.scrapers.mdcomputers import scrape_mdcomputers

app = Flask(__name__)

def init_driver(headless=True):
    options = Options()
    if headless:
        options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    return webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)

@app.route("/api/search", methods=["GET"])
def search():
    query = request.args.get("query")
    if not query:
        return jsonify({"error": "Query parameter is required"}), 400

    driver = init_driver()
    results = []

    try:
        results.extend(scrape_amazon(driver, query))
        results.extend(scrape_flipkart(driver, query))
        results.extend(scrape_mdcomputers(driver, query))
    finally:
        driver.quit()

    return jsonify(results)

if __name__ == "__main__":
    app.run(debug=True, port=5001)
