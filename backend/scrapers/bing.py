from selectolax.lexbor import LexborHTMLParser
import requests

def scrape_bing(query: str) -> list[dict]:
    """Scrape Bing Shopping results for a given query"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36'
    }
    
    url = f'https://www.bing.com/shop?q={query.replace(" ", "+")}'
    results = []
    
    try:
        response = requests.get(url, headers=headers)
        parser = LexborHTMLParser(response.text)
        
        for product in parser.root.css('.br-fullCard'):
            try:
                # Extract product name
                title_elem = product.css_first('.br-title span')
                title = title_elem.attributes.get('title', '') if title_elem else product.css_first('.br-title').text().strip()
                
                # Extract price
                price_text = product.css_first('.pd-price').text().strip()
                price = float(price_text.replace('₹', '').replace(',', '').strip())
                
                # Extract seller
                seller = product.css_first('.br-seller').text().strip()
                
                # Extract product link
                product_link = f"https://www.bing.com{product.css_first('.br-titlelink').attributes.get('href', '')}"
                
                results.append({
                    'name': title,
                    'price': price,
                    'seller': seller,
                    'link': product_link
                })
            except Exception as e:
                continue
    
    except Exception as e:
        raise Exception(f"Bing scraping failed: {str(e)}")
    
    return results