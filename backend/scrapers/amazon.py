from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium import webdriver
from pprint import pprint
import time

def scrape_amazon(driver, query):
    print("Scraping Amazon.in...")
    products = []

    formatted_query = query.replace(" ", "+")
    url = f"https://www.amazon.in/s?k={formatted_query}"
    driver.get(url)

    try:
        WebDriverWait(driver, 15).until(
            EC.presence_of_all_elements_located((By.CSS_SELECTOR, "div.s-main-slot > div[data-component-type='s-search-result']"))
        )
    except Exception as e:
        print(f"[ERROR] Amazon results did not load: {e}")
        return []

    items = driver.find_elements(By.CSS_SELECTOR, "div.s-main-slot > div[data-component-type='s-search-result']")
    print(f"[INFO] Found {len(items)} items.")

    for item in items[:10]:
        try:
            title_elem = item.find_element(By.CSS_SELECTOR, "h2 span")
            title = title_elem.text.strip()
            title = title[:80] + "..." if len(title) > 80 else title
        except Exception:
            print("[WARN] Skipping item without title.")
            continue

        try:
            a_tag = item.find_element(By.CSS_SELECTOR, "h2 a")
            href = a_tag.get_attribute("href")
            if href:
                link = "https://www.amazon.in" + href
            else:
                link = "#"
        except Exception as e:
            print(f"[WARN] Link not found: {e}")
            link = "#"


        try:
            price = item.find_element(By.CSS_SELECTOR, "span.a-price span.a-price-whole").text.strip()
        except Exception:
            price = "N/A"

        print(f"[Amazon] {title} - ₹{price} - {link}")
        products.append({
            "site": "Amazon",
            "title": title,
            "price": price,
            "link": link
        })

    return products

if __name__ == "__main__":
    chrome_options = Options()
    chrome_options.add_argument("--headless")  # Comment out to view browser
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")

    driver = webdriver.Chrome(options=chrome_options)
    try:
        results = scrape_amazon(driver, "intel i5")
        pprint(results)
    finally:
        driver.quit()
