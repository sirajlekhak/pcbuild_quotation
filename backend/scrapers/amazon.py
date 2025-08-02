from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium import webdriver

def detect_category(title):
    title = title.lower()
    if any(x in title for x in ["i5", "i7", "i9", "ryzen", "core"]): return "CPU"
    if any(x in title for x in ["rtx", "gtx", "radeon", "gpu"]): return "GPU"
    if "ram" in title or "ddr" in title: return "RAM"
    if "case" in title or "cabinet" in title: return "Case"
    if "cooler" in title or "fan" in title or "aio" in title: return "Cooling"
    if "monitor" in title or "display" in title: return "Monitor"
    if "keyboard" in title or "mouse" in title or "accessory" in title: return "Accessories"
    if "ssd" in title or "hdd" in title or "nvme" in title: return "Storage"
    if "motherboard" in title or any(x in title for x in ["b660", "z790", "h610"]): return "Motherboard"
    if "psu" in title or "power supply" in title: return "PSU"
    return "Other"

def init_driver():
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    return webdriver.Chrome(options=chrome_options)

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
    except:
        print("[ERROR] Amazon results did not load.")
        return []

    items = driver.find_elements(By.CSS_SELECTOR, "div.s-main-slot > div[data-component-type='s-search-result']")
    print(f"[INFO] Found {len(items)} items.")

    for item in items[:10]:
        try:
            title = item.find_element(By.CSS_SELECTOR, "h2 span").text.strip()
            title = title[:80] + "..." if len(title) > 80 else title
        except:
            print("[WARN] Skipping item without title.")
            continue

        try:
            a_tag = item.find_element(By.CSS_SELECTOR, "h2 a")
            partial_link = a_tag.get_attribute("href")
            link = "https://www.amazon.in" + partial_link if partial_link.startswith("/") else partial_link
        except:
            link = "#"

        try:
            price = item.find_element(By.CSS_SELECTOR, "span.a-price span.a-price-whole").text.strip()
        except:
            price = "N/A"

        category = detect_category(title)

        print(f"[Amazon] {title} - {price} - {link} - {category}")
        products.append({
            "site": "Amazon",
            "title": title,
            "price": price,
            "link": link,
            "category": category
        })

    return products

# -------------- Add This Part Below -----------------

from .flipkart import scrape_flipkart
# from .mdcomputers import scrape_mdcomputers  # optional for later

def scrape_all(query):
    driver = init_driver()
    all_products = []
    try:
        all_products.extend(scrape_amazon(driver, query))
        all_products.extend(scrape_flipkart(driver, query))
        # all_products.extend(scrape_mdcomputers(driver, query))
    finally:
        driver.quit()
    return all_products

# Standalone test
if __name__ == "__main__":
    results = scrape_all("intel i5")
    from pprint import pprint
    pprint(results)
