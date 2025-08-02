from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
from pathlib import Path

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager

from backend.scrapers.amazon import scrape_amazon
from backend.scrapers.flipkart import scrape_flipkart
from backend.scrapers.mdcomputers import scrape_mdcomputers

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Path to components data file (in your backend directory)
COMPONENTS_FILE = Path(__file__).parent / 'backend' / 'data' / 'components.json'

def init_driver(headless=True):
    options = Options()
    if headless:
        options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    return webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)

def load_components():
    """Load components from JSON file"""
    if not COMPONENTS_FILE.exists():
        # Initialize with empty array if file doesn't exist
        return []
    with open(COMPONENTS_FILE, 'r') as f:
        return json.load(f)

def save_components(components):
    """Save components to JSON file"""
    COMPONENTS_FILE.parent.mkdir(parents=True, exist_ok=True)  # Ensure directory exists
    with open(COMPONENTS_FILE, 'w') as f:
        json.dump(components, f, indent=2)

@app.route("/api/search", methods=["GET"])
def search():
    """Search products across e-commerce sites"""
    query = request.args.get("query")
    seller = request.args.get("seller", "all")  # default is all

    if not query:
        return jsonify({"error": "Query parameter is required"}), 400

    driver = init_driver()
    results = []

    try:
        if seller == "amazon":
            results = scrape_amazon(driver, query)
        elif seller == "flipkart":
            results = scrape_flipkart(driver, query)
        elif seller in ("mdcomputers", "md"):
            results = scrape_mdcomputers(driver, query)
        else:  # 'all' or unknown
            amazon_results = scrape_amazon(driver, query)
            flipkart_results = scrape_flipkart(driver, query)
            md_results = scrape_mdcomputers(driver, query)
            
            results.extend(amazon_results)
            results.extend(flipkart_results)
            results.extend(md_results)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        driver.quit()

    return jsonify(results)

@app.route('/api/components', methods=['GET'])
def get_components():
    """Get all saved components"""
    try:
        components = load_components()
        return jsonify(components)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/components', methods=['POST'])
def create_component():
    """Add a new component"""
    try:
        # Get and validate input data
        new_component = request.get_json()
        if not new_component:
            return jsonify({"error": "No data provided"}), 400
            
        # Required fields (removed 'model' as per your request)
        required_fields = ['category', 'name', 'brand', 'price']
        for field in required_fields:
            if field not in new_component:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        # Validate price is a positive number
        try:
            price = float(new_component['price'])
            if price <= 0:
                return jsonify({"error": "Price must be a positive number"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid price format"}), 400

        # Load existing components
        components = load_components()
        
        # Generate ID (simple increment for demo - consider UUID in production)
        new_component['id'] = str(len(components) + 1)
        
        # Set default warranty if not provided
        new_component['warranty'] = new_component.get('warranty', '')
        
        # Add to collection
        components.append(new_component)
        save_components(components)
        
        return jsonify(new_component), 201
    
    except Exception as e:
        # Log the error for debugging
        app.logger.error(f"Error creating component: {str(e)}")
        return jsonify({"error": "Failed to create component"}), 500
@app.route('/api/components/<component_id>', methods=['PUT'])
def update_component(component_id):
    """Update an existing component"""
    try:
        updated_data = request.get_json()
        components = load_components()
        
        for i, comp in enumerate(components):
            if comp['id'] == component_id:
                # Merge existing component with updated data
                components[i] = {**comp, **updated_data}
                save_components(components)
                return jsonify(components[i])
        
        return jsonify({"error": "Component not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/components/<component_id>', methods=['DELETE'])
def delete_component(component_id):
    """Delete a component"""
    try:
        components = load_components()
        updated_components = [comp for comp in components if comp['id'] != component_id]
        
        if len(updated_components) == len(components):
            return jsonify({"error": "Component not found"}), 404
            
        save_components(updated_components)
        return jsonify({"message": "Component deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5001)