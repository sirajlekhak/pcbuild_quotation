from flask import Blueprint, Flask, request, jsonify, send_file
from flask_cors import CORS
import json
import os
import logging
from pathlib import Path
from datetime import datetime
from uuid import uuid4
from typing import Dict, List, Optional, Union
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from webdriver_manager.core.os_manager import ChromeType
import base64


# Import scrapers
from backend.scrapers.bing import scrape_bing
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
# Proper CORS configuration
CORS(app, resources={
    r"/api/*": {
        "origins": "http://localhost:5173",
        "supports_credentials": True,
        "allow_headers": ["Content-Type", "Authorization"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    }
})



# Handle OPTIONS requests for all API routes
@app.route('/api/<path:path>', methods=['OPTIONS'])
def handle_options(path):
    return '', 204

# ====================== PDF Blueprint ======================
pdf_bp = Blueprint('pdf', __name__)
PDF_INFO_PATH = Path(__file__).parent / 'backend' / 'data' / 'pdfinfo.json'

@pdf_bp.route('/api/save_pdf_info', methods=['POST', 'OPTIONS'])
def save_pdf_info():
    if request.method == 'OPTIONS':
        return '', 204
        
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Ensure directory exists
        PDF_INFO_PATH.parent.mkdir(parents=True, exist_ok=True)

        # Load existing data
        existing_data = []
        if PDF_INFO_PATH.exists():
            with open(PDF_INFO_PATH, 'r') as f:
                try:
                    existing_data = json.load(f)
                    if not isinstance(existing_data, list):
                        existing_data = []
                except json.JSONDecodeError:
                    existing_data = []

        # Add or update entry
        if 'id' in data:
            # Update existing entry if ID exists
            found = False
            for i, item in enumerate(existing_data):
                if item.get('id') == data['id']:
                    existing_data[i] = data
                    found = True
                    break
            if not found:
                existing_data.append(data)
        else:
            # Add new entry with generated ID
            data['id'] = str(uuid4())
            existing_data.append(data)

        # Write back to file
        with open(PDF_INFO_PATH, 'w') as f:
            json.dump(existing_data, f, indent=2)

        return jsonify({'success': True, 'id': data['id']})

    except Exception as e:
        logger.error(f"Error saving PDF info: {str(e)}")
        return jsonify({'error': str(e)}), 500

@pdf_bp.route('/api/delete_pdf_info/<id>', methods=['DELETE', 'OPTIONS'])
def delete_pdf_info(id):
    if request.method == 'OPTIONS':
        return '', 204
        
    try:
        # Ensure directory exists
        PDF_INFO_PATH.parent.mkdir(parents=True, exist_ok=True)
        
        # Load existing data
        if not PDF_INFO_PATH.exists():
            return jsonify({'error': 'No PDF info found'}), 404
            
        with open(PDF_INFO_PATH, 'r') as f:
            try:
                existing_data = json.load(f)
                if not isinstance(existing_data, list):
                    existing_data = []
            except json.JSONDecodeError:
                existing_data = []

        # Find and remove the entry
        initial_count = len(existing_data)
        existing_data = [item for item in existing_data if item.get('id') != id]
        
        if len(existing_data) == initial_count:
            return jsonify({'error': 'PDF info not found'}), 404

        # Write back to file
        with open(PDF_INFO_PATH, 'w') as f:
            json.dump(existing_data, f, indent=2)

        response = jsonify({'success': True})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    except Exception as e:
        logger.error(f"Error deleting PDF info: {str(e)}")
        response = jsonify({'error': str(e)})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 500
    
@pdf_bp.route('/api/load_pdf_info', methods=['GET', 'OPTIONS'])
def load_pdf_info():
    if request.method == 'OPTIONS':
        return '', 204
        
    try:
        # Ensure directory exists
        PDF_INFO_PATH.parent.mkdir(parents=True, exist_ok=True)
        
        # Return empty array if file doesn't exist
        if not PDF_INFO_PATH.exists():
            return jsonify([])
            
        with open(PDF_INFO_PATH, 'r') as f:
            try:
                data = json.load(f)
                
                # Ensure we always return an array
                if not isinstance(data, list):
                    data = []
                
                # Validate and transform each item
                validated_data = []
                for item in data:
                    # Skip invalid items
                    if not isinstance(item, dict):
                        continue
                        
                    # Ensure required fields exist
                    validated_item = {
                        'id': item.get('id') or str(uuid4()),
                        'date': item.get('date') or datetime.now().isoformat(),
                        'customer': {
                            'name': item.get('customer', {}).get('name') or '',
                            'phone': item.get('customer', {}).get('phone') or '',
                            'email': item.get('customer', {}).get('email') or '',
                            'address': item.get('customer', {}).get('address') or ''
                        },
                        'components': [],
                        'gstRate': float(item.get('gstRate', 18)),
                        'discountRate': float(item.get('discountRate', 0)),
                        'notes': item.get('notes', ''),
                        'pdfData': item.get('pdfData', ''),
                        'type': item.get('type', 'quotation')
                    }
                    
                    # Validate components
                    if isinstance(item.get('components'), list):
                        for component in item['components']:
                            if isinstance(component, dict):
                                validated_component = {
                                    'id': component.get('id') or str(uuid4()),
                                    'name': component.get('name') or '',
                                    'brand': component.get('brand') or '',
                                    'price': float(component.get('price', 0)),
                                    'quantity': int(component.get('quantity', 1)),
                                    'category': component.get('category') or 'Other'
                                }
                                validated_item['components'].append(validated_component)
                    
                    validated_data.append(validated_item)
                
                return jsonify(validated_data)
                
            except json.JSONDecodeError:
                return jsonify([])
                
    except Exception as e:
        logger.error(f"Error loading PDF info: {str(e)}", exc_info=True)
        return jsonify({
            'error': 'Failed to load PDF info',
            'details': str(e)
        }), 500
    
# Register the blueprint
app.register_blueprint(pdf_bp)

# ====================== Quotation Endpoints ======================
DATA_DIR = Path(__file__).parent / 'data'
DATA_DIR.mkdir(exist_ok=True)
COMPANY_INFO_PATH = DATA_DIR / 'companyinfo.json'
QUOTATIONS_DIR = DATA_DIR / 'quotations'
QUOTATIONS_DIR.mkdir(exist_ok=True)

# Constants
COMPONENTS_FILE = Path(__file__).parent / 'backend' / 'data' / 'components.json'
MAX_SEARCH_RESULTS = 50
DEFAULT_HEADLESS = True

class Component:
    """Component data model with validation"""
    def __init__(self, data: Dict):
        self.id: str = data.get('id', str(uuid4()))
        self.category: str = data['category']
        self.name: str = data['name']
        self.brand: str = data['brand']
        try:
            self.price: float = float(data['price'])
            if self.price <= 0:
                raise ValueError("Price must be positive")
        except (ValueError, TypeError):
            raise ValueError("Invalid price format")
        self.warranty: str = data.get('warranty', '')
        self.created_at: str = data.get('created_at', datetime.now().isoformat())
        self.updated_at: str = datetime.now().isoformat()

    def to_dict(self) -> Dict:
        return {
            'id': self.id,
            'category': self.category,
            'name': self.name,
            'brand': self.brand,
            'price': self.price,
            'warranty': self.warranty,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }

def init_driver():
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    
    try:
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
    except Exception as e:
        logger.error(f"Failed to initialize ChromeDriver: {str(e)}")
        raise

def load_components() -> List[Dict]:
    """Load components from JSON file with error handling"""
    try:
        if not COMPONENTS_FILE.exists():
            return []
        
        with open(COMPONENTS_FILE, 'r') as f:
            components = json.load(f)
            return [Component(comp).to_dict() for comp in components]
            
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
    
    category_mapping = {
        "CPU": ['i3', 'i5', 'i7', 'i9', 'ryzen', 'core', 'pentium', 'celeron', 'xeon'],
        "GPU": ['rtx', 'gtx', 'radeon', 'arc', 'gpu', 'graphics card'],
        "RAM": ['ddr3', 'ddr4', 'ddr5', 'ram', 'memory'],
        "Motherboard": ['motherboard', 'mainboard', 'h61', 'b450', 'x570', 'z690'],
        "Storage": ['ssd', 'nvme', 'hdd', 'hard disk', 'm.2'],
        "PSU": ['psu', 'power supply', 'smps'],
        "Case": ['case', 'chassis', 'cabinet'],
        "Cooling": ['cooler', 'aio', 'fan', 'heatsink'],
        "Monitor": ['monitor', 'display', 'screen'],
        "Accessories": ['keyboard', 'mouse', 'headset']
    }
    
    for category, terms in category_mapping.items():
        if any(term in lower_title for term in terms):
            return category
    
    return "Other"

# ====================== Quotation History Endpoints ======================

@app.route('/api/quotations', methods=['POST', 'OPTIONS'])
def save_quotation():
    """Save a new quotation PDF with metadata"""
    if request.method == 'OPTIONS':
        return '', 204
        
    try:
        data = request.get_json()
        if not data or 'pdfData' not in data:
            response = jsonify({'error': 'No PDF data provided'})
            response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
            response.headers.add('Access-Control-Allow-Credentials', 'true')
            return response, 400
        
        # Validate required fields
        required_fields = ['customerName', 'phone', 'quotationNumber']
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            response = jsonify({
                'error': 'Missing required fields',
                'missing': missing_fields
            })
            response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
            response.headers.add('Access-Control-Allow-Credentials', 'true')
            return response, 400

        # Generate unique ID for the quotation
        quotation_id = str(uuid4())
        filename = f"{quotation_id}.pdf"
        filepath = QUOTATIONS_DIR / filename

        # Save PDF file (convert from base64)
        pdf_data = data['pdfData'].split(',')[1]  # Remove data URI prefix
        with open(filepath, 'wb') as f:
            f.write(base64.b64decode(pdf_data))

        # Save metadata
        quotation_data = {
            'id': quotation_id,
            'date': datetime.now().isoformat(),
            'customerName': data['customerName'],
            'phone': data['phone'],
            'quotationNumber': data['quotationNumber'],
            'filename': filename
        }

        # Save metadata to JSON file
        metadata_file = QUOTATIONS_DIR / 'metadata.json'
        metadata = []
        if metadata_file.exists():
            with open(metadata_file, 'r') as f:
                metadata = json.load(f)
        metadata.append(quotation_data)
        with open(metadata_file, 'w') as f:
            json.dump(metadata, f, indent=2)

        response = jsonify({
            'success': True,
            'quotation': quotation_data
        })
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 201

    except Exception as e:
        logger.error(f"Error saving quotation: {str(e)}")
        response = jsonify({
            'error': 'Failed to save quotation',
            'details': str(e)
        })
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 500

@app.route('/api/quotations', methods=['GET', 'OPTIONS'])
def get_quotations():
    """Get all saved quotations with metadata"""
    if request.method == 'OPTIONS':
        return '', 204
        
    try:
        metadata_file = QUOTATIONS_DIR / 'metadata.json'
        if not metadata_file.exists():
            response = jsonify({'quotations': []})
            response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
            response.headers.add('Access-Control-Allow-Credentials', 'true')
            return response

        with open(metadata_file, 'r') as f:
            metadata = json.load(f)

        # Sort by date (newest first)
        metadata.sort(key=lambda x: x['date'], reverse=True)

        response = jsonify({
            'success': True,
            'count': len(metadata),
            'quotations': metadata
        })
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    except Exception as e:
        logger.error(f"Error getting quotations: {str(e)}")
        response = jsonify({
            'error': 'Failed to retrieve quotations',
            'details': str(e)
        })
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 500

@app.route('/api/quotations/<quotation_id>', methods=['GET', 'OPTIONS'])
def get_quotation(quotation_id):
    """Get a specific quotation PDF file"""
    if request.method == 'OPTIONS':
        return '', 204
        
    try:
        # First find the metadata
        metadata_file = QUOTATIONS_DIR / 'metadata.json'
        if not metadata_file.exists():
            response = jsonify({'error': 'No quotations found'})
            response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
            response.headers.add('Access-Control-Allow-Credentials', 'true')
            return response, 404

        with open(metadata_file, 'r') as f:
            metadata = json.load(f)

        quotation = next((q for q in metadata if q['id'] == quotation_id), None)
        if not quotation:
            response = jsonify({'error': 'Quotation not found'})
            response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
            response.headers.add('Access-Control-Allow-Credentials', 'true')
            return response, 404

        # Return the PDF file
        filepath = QUOTATIONS_DIR / quotation['filename']
        if not filepath.exists():
            response = jsonify({'error': 'PDF file not found'})
            response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
            response.headers.add('Access-Control-Allow-Credentials', 'true')
            return response, 404

        response = send_file(
            filepath,
            mimetype='application/pdf',
            as_attachment=False
        )
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    except Exception as e:
        logger.error(f"Error getting quotation {quotation_id}: {str(e)}")
        response = jsonify({
            'error': 'Failed to retrieve quotation',
            'details': str(e)
        })
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 500

@app.route('/api/quotations/<quotation_id>', methods=['DELETE', 'OPTIONS'])
def delete_quotation(quotation_id):
    """Delete a quotation and its metadata"""
    if request.method == 'OPTIONS':
        return '', 204
        
    try:
        metadata_file = QUOTATIONS_DIR / 'metadata.json'
        if not metadata_file.exists():
            response = jsonify({'error': 'No quotations found'})
            response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
            response.headers.add('Access-Control-Allow-Credentials', 'true')
            return response, 404

        with open(metadata_file, 'r') as f:
            metadata = json.load(f)

        # Find and remove the quotation
        quotation = next((q for q in metadata if q['id'] == quotation_id), None)
        if not quotation:
            response = jsonify({'error': 'Quotation not found'})
            response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
            response.headers.add('Access-Control-Allow-Credentials', 'true')
            return response, 404

        # Delete the PDF file
        filepath = QUOTATIONS_DIR / quotation['filename']
        if filepath.exists():
            filepath.unlink()

        # Update metadata
        updated_metadata = [q for q in metadata if q['id'] != quotation_id]
        with open(metadata_file, 'w') as f:
            json.dump(updated_metadata, f, indent=2)

        response = jsonify({
            'success': True,
            'message': 'Quotation deleted successfully'
        })
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    except Exception as e:
        logger.error(f"Error deleting quotation {quotation_id}: {str(e)}")
        response = jsonify({
            'error': 'Failed to delete quotation',
            'details': str(e)
        })
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 500

# ====================== Existing Endpoints ======================

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

if __name__ == "__main__":
    # Verify ChromeDriver can be initialized at startup
    try:
        test_driver = init_driver()
        test_driver.quit()
        logger.info("ChromeDriver test successful")
    except Exception as e:
        logger.error(f"ChromeDriver initialization test failed: {str(e)}")
    
    app.run(debug=True, port=5001, host='0.0.0.0')