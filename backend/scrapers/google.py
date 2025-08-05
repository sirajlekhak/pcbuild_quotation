from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium import webdriver
import
import time

def scrape_google_shopping(driver, query):
    print("Scraping Google Shopping...")
    products = []
    
    formatted_query = query.replace(" ", "+")
    url = f"https://www.google.com/search?q={formatted_query}&tbm=shop"
    driver.get(url)
    
    try:
        # Wait for either the organic results or the shopping ads to load
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".sh-dgr__content, .sh-dlr__list-result"))
        )
    except:
        print("[ERROR] Google Shopping results did not load.")
        return []
    
    # Scroll to load more results (optional)
    driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
    time.sleep(2)
    
    # Handle both organic shopping results and sponsored ads
    items = driver.find_elements(By.CSS_SELECTOR, ".sh-dgr__content, .sh-dlr__list-result")
    print(f"[INFO] Found {len(items)} items.")
    
    for item in items[:10]:  # Limit to first 10 results
        try:
            # Extract title
            title = item.find_element(By.CSS_SELECTOR, ".tAxDx, .sh-np__product-title").text.strip()
            title = title[:80] + "..." if len(title) > 80 else title
            
            # Extract price
            try:
                price = item.find_element(By.CSS_SELECTOR, ".a8Pemb, .T14wmb").text.strip()
            except:
                price = "N/A"
            
            # Extract link
            try:
                link = item.find_element(By.CSS_SELECTOR, "a.shntl").get_attribute("href")
            except:
                link = "#"
            
            # Extract seller/store
            try:
                seller = item.find_element(By.CSS_SELECTOR, ".aULzUe, .IuHnof").text.strip()
            except:
                seller = "Unknown"
            
            # Detect category
            category = detect_category(title)
            
            print(f"[Google Shopping] {title} - {price} - {seller} - {link} - {category}")
            products.append({
                "site": "Google Shopping",
                "title": title,
                "price": price,
                "link": link,
                "seller": seller,
                "category": category
            })
            
        except Exception as e:
            print(f"[WARN] Error processing item: {str(e)}")
            continue
    
    return products

# Update your scrape_all function to include Google Shopping
def scrape_all(query):
    driver = init_driver()
    all_products = []
    try:
        all_products.extend(scrape_amazon(driver, query))
        all_products.extend(scrape_flipkart(driver, query))
        all_products.extend(scrape_google_shopping(driver, query))
        # all_products.extend(scrape_mdcomputers(driver, query))
    finally:
        driver.quit()
    return all_products

# Standalone test
if __name__ == "__main__":
    results = scrape_all("intel i5")
    from pprint import pprint
    pprint(results)