from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
import logging
from pathlib import Path
from datetime import datetime
from uuid import uuid4
from typing import Dict, List, Optional

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from webdriver_manager.core.os_manager import ChromeType

# Import scrapers
from backend.scrapers.amazon import scrape_amazon
from backend.scrapers.flipkart import scrape_flipkart
from backend.scrapers.mdcomputers import scrape_mdcomputers

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
        driver = init_driver()
        results = []

        # Scrape based on seller parameter
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

        # Add similar blocks for other sellers (flipkart, mdcomputers)

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

if __name__ == "__main__":
    # Verify ChromeDriver can be initialized at startup
    try:
        test_driver = init_driver()
        test_driver.quit()
        logger.info("ChromeDriver test successful")
    except Exception as e:
        logger.error(f"ChromeDriver initialization test failed: {str(e)}")
    
    app.run(debug=True, port=5001, host='0.0.0.0')