from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

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

def scrape_flipkart(driver, query):
    print("Scraping Flipkart...")
    products = []
    
    url = f"https://www.flipkart.com/search?q={query.replace(' ', '%20')}"
    driver.get(url)

    # Handle login popup if it appears
    try:
        close_btn = WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.XPATH, "//button[contains(text(), '✕')]"))
        )
        close_btn.click()
        print("[INFO] Closed login popup.")
    except:
        print("[INFO] No login popup detected.")

    try:
        # Wait for product blocks to appear
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "div[data-id]"))
        )
        blocks = driver.find_elements(By.CSS_SELECTOR, "div[data-id]")
    except Exception as e:
        print(f"[ERROR] Flipkart results did not load: {e}")
        return []

    print(f"[INFO] Found {len(blocks)} product blocks.")

    for block in blocks[:10]:  # Limit to 10 products
        try:
            # Title extraction
            title = None
            try:
                title = block.find_element(By.CSS_SELECTOR, "a.IRpwTa, a.s1Q9rs, div._4rR01T, a._2rpwqI").text.strip()
            except:
                pass
                
            if not title:
                continue
            title = title[:80] + "..." if len(title) > 80 else title

            # Price extraction
            price = "N/A"
            try:
                price = block.find_element(By.CSS_SELECTOR, "div._30jeq3, div._25b18c div._30jeq3, div.Nx9bqj").text.strip()
            except:
                pass

            # Link extraction
            link = "#"
            try:
                a_tag = block.find_element(By.CSS_SELECTOR, "a._1fQZEK, a.s1Q9rs, a._2rpwqI")
                link = a_tag.get_attribute("href")
                if not link.startswith("http"):
                    link = "https://www.flipkart.com" + link
            except:
                pass

            category = detect_category(title)
            print(f"[Flipkart] {title} - {price} - {link} - {category}")

            products.append({
                "site": "Flipkart",
                "title": title,
                "price": price,
                "link": link,
                "category": category
            })

        except Exception as e:
            print(f"[WARN] Failed to parse a product block: {e}")
            continue

    return products