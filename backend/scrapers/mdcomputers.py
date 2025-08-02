import re
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def init_driver(headless=True):
    options = Options()
    if headless:
        options.add_argument("--headless")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    return webdriver.Chrome(options=options)

def detect_category(title: str) -> str:
    title = title.lower()
    if any(x in title for x in ["i3", "i5", "i7", "i9", "ryzen", "core"]): return "CPU"
    if any(x in title for x in ["gtx", "rtx", "radeon"]): return "GPU"
    if "ram" in title or "ddr" in title: return "RAM"
    if "motherboard" in title or any(x in title for x in ["b660", "z790", "h610"]): return "Motherboard"
    if any(x in title for x in ["ssd", "nvme", "hdd"]): return "Storage"
    if "psu" in title or "power supply" in title: return "PSU"
    if "case" in title or "cabinet" in title: return "Case"
    if "fan" in title or "cooling" in title or "aio" in title: return "Cooling"
    if "monitor" in title: return "Monitor"
    return "Other"

def scrape_mdcomputers(query: str, limit: int = 10) -> list[dict]:
    print(f"[INFO] MDComputers • scraping '{query}'")
    driver = init_driver()
    products = []
    seen = set()

    try:
        search_url = f"https://mdcomputers.in/?route=product/search&search={query.replace(' ', '%20')}"
        driver.get(search_url)

        # Wait until product titles load
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "a[href*='/product/']"))
        )

        # Collect all anchor tags pointing to products
        anchors = driver.find_elements(By.CSS_SELECTOR, "a[href*='/product/']")

        for a in anchors:
            if len(products) >= limit:
                break

            title = a.text.strip()
            href = a.get_attribute("href")

            if not title or title.lower().startswith("add to cart") or not href:
                continue

            # Try to find price near the anchor
            price = "N/A"
            try:
                price_el = a.find_element(By.XPATH, "following-sibling::*[1]")
                match = re.search(r"₹\s?[\d,]+", price_el.text)
                if match:
                    price = match.group(0)
            except:
                try:
                    ctx = a.find_element(By.XPATH, "ancestor::li").text
                    match = re.search(r"₹\s?[\d,]+", ctx)
                    if match:
                        price = match.group(0)
                except:
                    pass

            key = (title, href)
            if key in seen:
                continue
            seen.add(key)

            products.append({
                "site": "mdcomputers",
                "title": title[:80] + ("..." if len(title) > 80 else ""),
                "price": price,
                "link": href,
                "category": detect_category(title),
            })

    except Exception as e:
        print(f"[ERROR] {e}")
    finally:
        driver.quit()

    return products
