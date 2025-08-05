from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
import logging
from pathlib import Path
from datetime import datetime
from uuid import uuid4
from typing import Dict, List, Optional
from backend.scrapers.bing import scrape_bing
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from webdriver_manager.core.os_manager import ChromeType

# Import scrapers
from backend.scrapers.amazon import scrape_amazon
from backend.scrapers.flipkart import scrape_flipkart
from backend.scrapers.mdcomputers import scrape_mdcomputers

# Add this at the top of your Flask app
DATA_DIR = Path(__file__).parent / 'data'
DATA_DIR.mkdir(exist_ok=True)
COMPANY_INFO_PATH = DATA_DIR / 'companyinfo.json'

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Constants
COMPONENTS_FILE = Path(__file__).parent / 'backend' / 'data' / 'components.json'
MAX_SEARCH_RESULTS = 50
DEFAULT_HEADLESS = True

class Component:
    """Component data model"""
    def __init__(self, data: Dict):
        self.id: str = data.get('id', str(uuid4()))
        self.category: str = data['category']
        self.name: str = data['name']
        self.brand: str = data['brand']
        self.price: float = float(data['price'])
        self.warranty: str = data.get('warranty', '')
        self.created_at: str = data.get('created_at', datetime.now().isoformat())
        self.updated_at: str = datetime.now().isoformat()

def init_driver():
    options = webdriver.ChromeOptions()
    options.add_argument("--headless=new")  # Modern headless mode
    
    # Specific version matching Chrome 138
    driver = webdriver.Chrome(
        service=Service(
            ChromeDriverManager(
                chrome_type=ChromeType.GOOGLE,
                driver_version="138.0.7204.184"
            ).install()
        ),
        options=options
    )
    return driver

def load_components() -> List[Dict]:
    """Load components from JSON file with error handling"""
    try:
        if not COMPONENTS_FILE.exists():
            return []
        
        with open(COMPONENTS_FILE, 'r') as f:
            components = json.load(f)
            return [Component(comp).__dict__ for comp in components]
            
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in components file: {str(e)}")
        return []
    except Exception as e:
        logger.error(f"Error loading components: {str(e)}")
        return []

def save_components(components: List[Dict]) -> bool:
    """Save components to JSON file with error handling"""
    try:
        COMPONENTS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(COMPONENTS_FILE, 'w') as f:
            json.dump(components, f, indent=2)
        return True
    except Exception as e:
        logger.error(f"Error saving components: {str(e)}")
        return False

def detect_category(title: str) -> str:
    """Detect component category from product title"""
    if not title:
        return "Other"
    
    lower_title = title.lower()
    
    if any(term in lower_title for term in ['i3', 'i5', 'i7', 'i9', 'ryzen', 'core', 'pentium', 'celeron', 'xeon']):
        return "CPU"
    if any(term in lower_title for term in ['rtx', 'gtx', 'radeon', 'arc', 'gpu', 'graphics card']):
        return "GPU"
    if any(term in lower_title for term in ['ddr3', 'ddr4', 'ddr5', 'ram', 'memory']):
        return "RAM"
    if any(term in lower_title for term in ['motherboard', 'mainboard', 'h61', 'b450', 'x570', 'z690']):
        return "Motherboard"
    if any(term in lower_title for term in ['ssd', 'nvme', 'hdd', 'hard disk', 'm.2']):
        return "Storage"
    if any(term in lower_title for term in ['psu', 'power supply', 'smps']):
        return "PSU"
    if any(term in lower_title for term in ['case', 'chassis', 'cabinet']):
        return "Case"
    if any(term in lower_title for term in ['cooler', 'aio', 'fan', 'heatsink']):
        return "Cooling"
    if any(term in lower_title for term in ['monitor', 'display', 'screen']):
        return "Monitor"
    if any(term in lower_title for term in ['keyboard', 'mouse', 'headset']):
        return "Accessories"
    
    return "Other"

@app.route("/api/bing-search", methods=["GET"])
def bing_search():
    """Search products on Bing Shopping"""
    query = request.args.get("query", "").strip()
    limit = int(request.args.get("limit", MAX_SEARCH_RESULTS))

    # Validate input
    if not query or len(query) < 2:
        return jsonify({
            "success": False,
            "error": "Query must be at least 2 characters",
            "code": "QUERY_TOO_SHORT"
        }), 400

    try:
        results = scrape_bing(query)
        if not results:
            return jsonify({
                "success": False,
                "error": "No results found",
                "query": query
            }), 404

        # Format results consistently with other scrapers
        formatted_results = []
        for product in results[:limit]:
            formatted_results.append({
                "title": product.get("name", ""),
                "price": product.get("price", 0),
                "link": product.get("link", "#"),
                "site": "Bing Shopping",
                "seller": product.get("seller", ""),
                "category": detect_category(product.get("name", ""))
            })

        return jsonify({
            "success": True,
            "count": len(formatted_results),
            "results": formatted_results
        })

    except Exception as e:
        logger.error(f"Bing search error: {str(e)}", exc_info=True)
        return jsonify({
            "success": False,
            "error": "Bing search failed",
            "details": str(e)
        }), 500

@app.route("/api/search", methods=["GET"])
def search():
    """Search products across e-commerce sites"""
    query = request.args.get("query", "").strip()
    seller = request.args.get("seller", "all").lower()
    limit = int(request.args.get("limit", MAX_SEARCH_RESULTS))

    # Validate input
    if not query or len(query) < 2:
        return jsonify({
            "success": False,
            "error": "Query must be at least 2 characters",
            "code": "QUERY_TOO_SHORT"
        }), 400

    driver = None
    try:
        results = []
        
        # Scrape Bing if requested (doesn't need Selenium)
        if seller in ["all", "bing"]:
            try:
                bing_results = scrape_bing(query)
                results.extend([
                    {
                        "title": p.get("name", ""),
                        "price": p.get("price", 0),
                        "link": p.get("link", "#"),
                        "site": "Bing Shopping",
                        "seller": p.get("seller", ""),
                        "category": detect_category(p.get("name", ""))
                    }
                    for p in bing_results[:limit]
                ])
            except Exception as e:
                logger.error(f"Bing scrape failed: {str(e)}")

        # Scrape other sites with Selenium if requested
        if seller in ["all", "amazon", "flipkart", "mdcomputers"]:
            driver = init_driver()
            
            if seller in ["all", "amazon"]:
                try:
                    amazon_results = scrape_amazon(driver, query)
                    if amazon_results:
                        results.extend([
                            {
                                "title": p.get("title", ""),
                                "price": p.get("price", 0),
                                "link": p.get("link", "#"),
                                "site": "Amazon",
                                "brand": p.get("brand", ""),
                                "category": p.get("category", "")
                            }
                            for p in amazon_results[:limit]
                        ])
                except Exception as e:
                    logger.error(f"Amazon scrape failed: {str(e)}")

            if seller in ["all", "flipkart"]:
                try:
                    flipkart_results = scrape_flipkart(driver, query)
                    if flipkart_results:
                        results.extend([
                            {
                                "title": p.get("title", ""),
                                "price": p.get("price", 0),
                                "link": p.get("link", "#"),
                                "site": "Flipkart",
                                "brand": p.get("brand", ""),
                                "category": p.get("category", "")
                            }
                            for p in flipkart_results[:limit]
                        ])
                except Exception as e:
                    logger.error(f"Flipkart scrape failed: {str(e)}")

            if seller in ["all", "mdcomputers"]:
                try:
                    mdcomputers_results = scrape_mdcomputers(driver, query)
                    if mdcomputers_results:
                        results.extend([
                            {
                                "title": p.get("title", ""),
                                "price": p.get("price", 0),
                                "link": p.get("link", "#"),
                                "site": "MD Computers",
                                "brand": p.get("brand", ""),
                                "category": p.get("category", "")
                            }
                            for p in mdcomputers_results[:limit]
                        ])
                except Exception as e:
                    logger.error(f"MD Computers scrape failed: {str(e)}")

        if not results:
            return jsonify({
                "success": False,
                "error": "No results found",
                "query": query,
                "seller": seller
            }), 404

        return jsonify({
            "success": True,
            "count": len(results),
            "results": results
        })

    except Exception as e:
        logger.error(f"Search error: {str(e)}", exc_info=True)
        return jsonify({
            "success": False,
            "error": "Search failed",
            "details": str(e)
        }), 500
    finally:
        if driver:
            try:
                driver.quit()
            except Exception as e:
                logger.error(f"Error quitting driver: {str(e)}")

@app.route('/api/components', methods=['GET'])
def get_components():
    """Get all saved components with optional filtering"""
    try:
        category = request.args.get('category')
        components = load_components()
        
        if category:
            components = [c for c in components if c['category'].lower() == category.lower()]
        
        return jsonify({
            "success": True,
            "count": len(components),
            "components": components
        })
    except Exception as e:
        logger.error(f"Error getting components: {str(e)}")
        return jsonify({
            "error": "Failed to retrieve components",
            "details": str(e)
        }), 500

@app.route('/api/components', methods=['POST'])
def create_component():
    """Add a new component"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        # Validate required fields
        required_fields = ['category', 'name', 'brand', 'price']
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            return jsonify({
                "error": "Missing required fields",
                "missing": missing_fields
            }), 400

        # Validate price
        try:
            price = float(data['price'])
            if price <= 0:
                return jsonify({
                    "error": "Price must be a positive number"
                }), 400
        except (ValueError, TypeError):
            return jsonify({
                "error": "Invalid price format"
            }), 400

        # Create and save component
        component = Component(data).__dict__
        components = load_components()
        components.append(component)
        
        if not save_components(components):
            raise RuntimeError("Failed to save components")
        
        return jsonify({
            "success": True,
            "component": component
        }), 201
    
    except Exception as e:
        logger.error(f"Error creating component: {str(e)}")
        return jsonify({
            "error": "Failed to create component",
            "details": str(e)
        }), 500

@app.route('/api/components/<component_id>', methods=['PUT'])
def update_component(component_id):
    """Update an existing component"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        components = load_components()
        updated = False
        
        for i, comp in enumerate(components):
            if comp['id'] == component_id:
                # Preserve created_at, update other fields
                data['created_at'] = comp['created_at']
                components[i] = Component(data).__dict__
                updated = True
                break
        
        if not updated:
            return jsonify({
                "error": "Component not found",
                "component_id": component_id
            }), 404
            
        if not save_components(components):
            raise RuntimeError("Failed to save components")
        
        return jsonify({
            "success": True,
            "component": components[i]
        })
    except Exception as e:
        logger.error(f"Error updating component {component_id}: {str(e)}")
        return jsonify({
            "error": "Failed to update component",
            "details": str(e)
        }), 500

@app.route('/api/components/<component_id>', methods=['DELETE'])
def delete_component(component_id):
    """Delete a component"""
    try:
        components = load_components()
        original_count = len(components)
        components = [c for c in components if c['id'] != component_id]
        
        if len(components) == original_count:
            return jsonify({
                "error": "Component not found",
                "component_id": component_id
            }), 404
            
        if not save_components(components):
            raise RuntimeError("Failed to save components")
        
        return jsonify({
            "success": True,
            "message": "Component deleted successfully"
        })
    except Exception as e:
        logger.error(f"Error deleting component {component_id}: {str(e)}")
        return jsonify({
            "error": "Failed to delete component",
            "details": str(e)
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    })

@app.route('/api/components/import', methods=['POST'])
def import_components():
    try:
        data = request.get_json()
        if not data or 'components' not in data:
            return jsonify({"success": False, "error": "No components data provided"}), 400
            
        # Basic validation
        valid_components = []
        for comp in data['components']:
            if all(key in comp for key in ['name', 'brand', 'price', 'category']):
                try:
                    # Create component with default values for missing fields
                    component_data = {
                        'name': comp['name'],
                        'brand': comp['brand'],
                        'price': float(comp['price']),
                        'category': comp['category'],
                        'warranty': comp.get('warranty', ''),
                        'id': comp.get('id', str(uuid4())),
                        'created_at': comp.get('created_at', datetime.now().isoformat())
                    }
                    valid_components.append(component_data)
                except (ValueError, TypeError):
                    continue
        
        # Save the validated components
        save_components(valid_components)
        
        return jsonify({
            "success": True,
            "count": len(valid_components),
            "message": f"Imported {len(valid_components)} components"
        })
    except Exception as e:
        logger.error(f"Import error: {str(e)}", exc_info=True)
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
    

DEFAULT_COMPANY_INFO = {
    "name": "IT SERVICE WORLD",
    "address": "Siliguri, West Bengal, India",
    "phone": "+91 XXXXX XXXXX",
    "email": "info@itserviceworld.com",
    "gstin": "XXXXXXXXXXXXXXX",
    "website": "www.itserviceworld.com",
    "logo": ""
}

@app.route('/api/company', methods=['GET', 'POST'])
def handle_company_info():
    data_dir = Path(__file__).parent / 'data'
    company_file = data_dir / 'companyinfo.json'
    
    try:
        data_dir.mkdir(exist_ok=True)
        
        if request.method == 'GET':
            if not company_file.exists():
                # Create file with default data if doesn't exist
                with open(company_file, 'w') as f:
                    json.dump(DEFAULT_COMPANY_INFO, f)
                return jsonify(DEFAULT_COMPANY_INFO)
                
            with open(company_file, 'r') as f:
                return jsonify(json.load(f))
                
        elif request.method == 'POST':
            data = request.get_json()
            
            # Validate required fields
            if not data.get('name') or not data.get('gstin'):
                return jsonify({
                    "error": "Company name and GSTIN are required",
                    "received": data
                }), 400
                
            # Save to file
            with open(company_file, 'w') as f:
                json.dump(data, f, indent=2)
                
            return jsonify({
                "success": True,
                "message": "Company info saved",
                "data": data
            })
            
    except Exception as e:
        return jsonify({
            "error": str(e),
            "path": str(company_file)
        }), 500
      # In your Flask app (app.py), add this debug line:
print("Absolute path to companyinfo.json:", str(Path(__file__).parent / 'data' / 'companyinfo.json'))   
if __name__ == "__main__":
    # Verify ChromeDriver can be initialized at startup
    try:
        test_driver = init_driver()
        test_driver.quit()
        logger.info("ChromeDriver test successful")
    except Exception as e:
        logger.error(f"ChromeDriver initialization test failed: {str(e)}")
    
    app.run(debug=True, port=5001, host='0.0.0.0')