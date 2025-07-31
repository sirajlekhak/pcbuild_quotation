from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium import webdriver
import time

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

def scrape_amazon(driver, query):
    print("Scraping Amazon.in...")
    products = []

    # Format search query
    formatted_query = query.replace(" ", "+")
    url = f"https://www.amazon.in/s?k={formatted_query}"
    driver.get(url)

    # Wait for results
    try:
        WebDriverWait(driver, 15).until(
            EC.presence_of_all_elements_located((By.CSS_SELECTOR, "div.s-main-slot > div[data-component-type='s-search-result']"))
        )
    except:
        print("[ERROR] Amazon results did not load.")
        return []

    items = driver.find_elements(By.CSS_SELECTOR, "div.s-main-slot > div[data-component-type='s-search-result']")
    print(f"[INFO] Found {len(items)} items.")

    for item in items[:10]:  # Limit to first 10 results
        try:
            title = item.find_element(By.CSS_SELECTOR, "h2 span").text.strip()
            title = title[:80] + "..." if len(title) > 80 else title
        except:
            print("[WARN] Skipping item without title.")
            continue

        try:
            a_tag = item.find_element(By.CSS_SELECTOR, "h2 a")
            partial_link = a_tag.get_attribute("href")
            if partial_link.startswith("/"):
                link = "https://www.amazon.in" + partial_link
            else:
                link = partial_link
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

# Example usage:
if __name__ == "__main__":
    chrome_options = Options()
    chrome_options.add_argument("--headless")  # Remove this line to see browser
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")

    driver = webdriver.Chrome(options=chrome_options)

    results = scrape_amazon(driver, "intel i5")
    driver.quit()

    from pprint import pprint
    pprint(results)
