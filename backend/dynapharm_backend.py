#!/usr/bin/env python3
"""
Dynapharm Backend API Server
PostgreSQL-based backend for 15 branches
"""

import json
import os
from datetime import datetime
import socket
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import threading
import time

# PostgreSQL imports
try:
    from db_connection import init_db_pool, close_db_pool
    from db_helpers import get_all, get_by_id, insert, update, delete
    POSTGRESQL_AVAILABLE = True
except ImportError:
    POSTGRESQL_AVAILABLE = False
    print("⚠️ PostgreSQL modules not available, falling back to JSON storage")

# Data storage files
DATA_DIR = "dynapharm_data"
CLIENTS_FILE = os.path.join(DATA_DIR, "clients.json")
USERS_FILE = os.path.join(DATA_DIR, "users.json")
BRANCHES_FILE = os.path.join(DATA_DIR, "branches.json")
REPORTS_FILE = os.path.join(DATA_DIR, "reports.json")
ORDERS_FILE = os.path.join(DATA_DIR, "orders.json")
EMAILS_FILE = os.path.join(DATA_DIR, "emails.json")

# Create data directory if it doesn't exist
os.makedirs(DATA_DIR, exist_ok=True)

def load_json_file(filename, default=[]):
    """Load JSON data from file, return default if file doesn't exist"""
    try:
        if os.path.exists(filename):
            with open(filename, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        print(f"Error loading {filename}: {e}")
    return default

def save_json_file(filename, data):
    """Save data to JSON file"""
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"Error saving {filename}: {e}")
        return False

class DynapharmAPIHandler(BaseHTTPRequestHandler):
    def _set_common_headers(self, content_type='application/json'):
        self.send_header('Content-Type', content_type)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

    def do_HEAD(self):
        """Minimal HEAD handler for health checks and browsers/tools."""
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        if path == '/api/health':
            self.send_response(200)
        else:
            self.send_response(200)
        self._set_common_headers()

    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        """Handle GET requests"""
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        # Set CORS headers
        self.send_response(200)
        self._set_common_headers('application/json')
        
        try:
            if path == '/api/health':
                data = {"status": "ok", "time": datetime.utcnow().isoformat() + 'Z'}
            elif path == '/api/clients':
                if POSTGRESQL_AVAILABLE:
                    clients = get_all('clients', order_by='full_name')
                    data = clients if clients else []
                else:
                    data = load_json_file(CLIENTS_FILE)
            elif path == '/api/users':
                if POSTGRESQL_AVAILABLE:
                    users = get_all('users', order_by='full_name')
                    # Convert PostgreSQL array to list for JSON serialization
                    for user in users:
                        if 'branches' in user and isinstance(user['branches'], str):
                            user['branches'] = user['branches'].strip('{}').split(',') if user['branches'] else []
                    data = users if users else []
                else:
                    data = load_json_file(USERS_FILE, [
                        {"id":"USR001","username":"admin","password":"admin123","fullName":"Administrator","email":"admin@dynapharm.com.na","phone":"061-300877","role":"admin","branch":"townshop","branches":["townshop"]},
                        {"id":"USR002","username":"consultant","password":"consultant123","fullName":"Dr. John Smith","email":"consultant@dynapharm.com.na","phone":"061-300877","role":"consultant","branch":"townshop","branches":["townshop","khomasdal","hochland-park"]},
                        {"id":"USR003","username":"dispenser","password":"dispenser123","fullName":"Jane Doe","email":"dispenser@dynapharm.com.na","phone":"061-300877","role":"dispenser","branch":"townshop","branches":["townshop"]}
                    ])
            elif path == '/api/branches':
                if POSTGRESQL_AVAILABLE:
                    branches = get_all('branches', order_by='name')
                    data = branches if branches else []
                else:
                    data = load_json_file(BRANCHES_FILE, [
                        {"id":"townshop","name":"TOWNSHOP (Head Office)","location":"Shop No.1 Continental Building Independence Avenue - Windhoek","phone":"814683999"},
                        {"id":"khomasdal","name":"KHOMASDAL DPC","location":"Shop No.2 Khomasdal Funky Town - Windhoek","phone":"814682991"},
                        {"id":"katima","name":"KATIMA DPC","location":"Opposite Open Market Hospital Road, Katima","phone":"817375818"},
                        {"id":"outapi","name":"OUTAPI DPC","location":"Okasilili Location in Christmas Building, Next Tolemeka Garage Main Road Oshakati - Outapi","phone":"814685886"},
                        {"id":"ondangwa","name":"ONDANGWA DPC","location":"Shop No.3 Woerman Block Oluno, Opposite Fresco, Cash and Carry Entrance Ondangwa","phone":"814685882"},
                        {"id":"okongo","name":"OKONGO DPC","location":"Handongo Festus Erf 333 Okongo Village Council","phone":"814684935"},
                        {"id":"okahao","name":"OKAHAO DPC","location":"Iteka complex opposite Pep store Okahao - Oshakati main road","phone":"814683963"},
                        {"id":"nkurenkuru","name":"NKURENKURU DPC","location":"Total Service Station, Next to Oluno Bar - Nkurenkuru","phone":"814684939"},
                        {"id":"swakopmund","name":"SWAKOPMUND DPC","location":"Opposite Mondesa Usave Swakopmund","phone":"814686806"},
                        {"id":"hochland-park","name":"HOCHLAND PARK","location":"House No.2 Robin Road, Taubern Glain Street, Next to OK Food Windhoek","phone":"813207195"},
                        {"id":"rundu","name":"RUNDU DPC","location":"Shop No.6 Fish Building opposite, Dr. Romanus Kampungi Stadium","phone":"814050125"},
                        {"id":"gobabis","name":"GOBABIS","location":"Shop No. Church Street Woerman Complex Gobabis","phone":"814685905"},
                        {"id":"walvisbay","name":"WALVISBAY","location":"Shop No.6 Pelican Mall Shop Sam Nujoma Avenue","phone":"814685894"},
                        {"id":"eenhana","name":"EENHANA","location":"Shop No.3 Tangi Complex, Next to Namibia Funeral Supply, Dimo Amaambo Street Eenhana","phone":"814682049"},
                        {"id":"otjiwarongo","name":"OTJIWARONGO DPC","location":"Erindi Complex next to Spar","phone":"814681997"}
                    ])
            elif path == '/api/reports':
                if POSTGRESQL_AVAILABLE:
                    reports = get_all('reports', order_by='date DESC')
                    # Convert JSONB to dict for JSON serialization
                    for report in reports:
                        if 'products' in report and isinstance(report['products'], str):
                            try:
                                report['products'] = json.loads(report['products'])
                            except:
                                report['products'] = []
                    data = reports if reports else []
                else:
                    data = load_json_file(REPORTS_FILE)
                    # Filter out client data that might have been mixed in
                    data = [item for item in data if 'id' in item and item.get('id', '').startswith('RPT')]
            elif path == '/api/orders':
                if POSTGRESQL_AVAILABLE:
                    query = parse_qs(urlparse(self.path).query)
                    if 'id' in query:
                        oid = query['id'][0]
                        order = get_by_id('orders', oid)
                        if order:
                            # Convert JSONB items to dict
                            if 'items' in order and isinstance(order['items'], str):
                                try:
                                    order['items'] = json.loads(order['items'])
                                except:
                                    order['items'] = []
                            data = order
                        else:
                            data = {"error": "Order not found"}
                    else:
                        orders = get_all('orders', order_by='date DESC')
                        # Convert JSONB to dict for JSON serialization
                        for order in orders:
                            if 'items' in order and isinstance(order['items'], str):
                                try:
                                    order['items'] = json.loads(order['items'])
                                except:
                                    order['items'] = []
                        data = orders if orders else []
                else:
                    # Optional query by id
                    query = parse_qs(urlparse(self.path).query)
                    orders = load_json_file(ORDERS_FILE, [])
                    if 'id' in query:
                        oid = query['id'][0]
                        data = next((o for o in orders if o.get('id') == oid), {"error": "Order not found"})
                    else:
                        data = orders
            else:
                data = {"error": "Endpoint not found"}
            
            self.wfile.write(json.dumps(data).encode('utf-8'))
        except Exception as e:
            error_response = {"error": str(e)}
            self.wfile.write(json.dumps(error_response).encode('utf-8'))

    def do_POST(self):
        """Handle POST requests"""
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        # Set CORS headers
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        try:
            data = json.loads(post_data.decode('utf-8'))
            parsed_path = urlparse(self.path)
            path = parsed_path.path
            
            if path == '/api/clients':
                if POSTGRESQL_AVAILABLE:
                    # Ensure ID exists
                    if 'id' not in data:
                        data['id'] = f"CLI{int(time.time()*1000)}"
                    # Insert into database
                    result = insert('clients', data)
                    if result:
                        response = {"success": True, "message": "Client saved", "data": result}
                    else:
                        response = {"success": False, "error": "Failed to save client"}
                else:
                    clients = load_json_file(CLIENTS_FILE)
                    clients.append(data)
                    save_json_file(CLIENTS_FILE, clients)
                    response = {"success": True, "message": "Client saved"}
                
            elif path == '/api/users':
                users = load_json_file(USERS_FILE, [
                    {"id":"USR001","username":"admin","password":"admin123","fullName":"Administrator","email":"admin@dynapharm.com.na","phone":"061-300877","role":"admin","branch":"townshop","branches":["townshop"]},
                    {"id":"USR002","username":"consultant","password":"consultant123","fullName":"Dr. John Smith","email":"consultant@dynapharm.com.na","phone":"061-300877","role":"consultant","branch":"townshop","branches":["townshop","khomasdal","hochland-park"]},
                    {"id":"USR003","username":"dispenser","password":"dispenser123","fullName":"Jane Doe","email":"dispenser@dynapharm.com.na","phone":"061-300877","role":"dispenser","branch":"townshop","branches":["townshop"]}
                ])
                users.append(data)
                save_json_file(USERS_FILE, users)
                response = {"success": True, "message": "User saved"}
                
            elif path == '/api/branches':
                if POSTGRESQL_AVAILABLE:
                    # Ensure ID exists
                    if 'id' not in data:
                        data['id'] = f"BR{int(time.time()*1000)}"
                    # Insert into database
                    result = insert('branches', data)
                    if result:
                        response = {"success": True, "message": "Branch saved", "data": result}
                    else:
                        response = {"success": False, "error": "Failed to save branch"}
                else:
                    branches = load_json_file(BRANCHES_FILE, [
                        {"id":"townshop","name":"TOWNSHOP (Head Office)","location":"Shop No.1 Continental Building Independence Avenue - Windhoek","phone":"814683999"},
                        {"id":"khomasdal","name":"KHOMASDAL DPC","location":"Shop No.2 Khomasdal Funky Town - Windhoek","phone":"814682991"},
                        {"id":"katima","name":"KATIMA DPC","location":"Opposite Open Market Hospital Road, Katima","phone":"817375818"},
                        {"id":"outapi","name":"OUTAPI DPC","location":"Okasilili Location in Christmas Building, Next Tolemeka Garage Main Road Oshakati - Outapi","phone":"814685886"},
                        {"id":"ondangwa","name":"ONDANGWA DPC","location":"Shop No.3 Woerman Block Oluno, Opposite Fresco, Cash and Carry Entrance Ondangwa","phone":"814685882"},
                        {"id":"okongo","name":"OKONGO DPC","location":"Handongo Festus Erf 333 Okongo Village Council","phone":"814684935"},
                        {"id":"okahao","name":"OKAHAO DPC","location":"Iteka complex opposite Pep store Okahao - Oshakati main road","phone":"814683963"},
                        {"id":"nkurenkuru","name":"NKURENKURU DPC","location":"Total Service Station, Next to Oluno Bar - Nkurenkuru","phone":"814684939"},
                        {"id":"swakopmund","name":"SWAKOPMUND DPC","location":"Opposite Mondesa Usave Swakopmund","phone":"814686806"},
                        {"id":"hochland-park","name":"HOCHLAND PARK","location":"House No.2 Robin Road, Taubern Glain Street, Next to OK Food Windhoek","phone":"813207195"},
                        {"id":"rundu","name":"RUNDU DPC","location":"Shop No.6 Fish Building opposite, Dr. Romanus Kampungi Stadium","phone":"814050125"},
                        {"id":"gobabis","name":"GOBABIS","location":"Shop No. Church Street Woerman Complex Gobabis","phone":"814685905"},
                        {"id":"walvisbay","name":"WALVISBAY","location":"Shop No.6 Pelican Mall Shop Sam Nujoma Avenue","phone":"814685894"},
                        {"id":"eenhana","name":"EENHANA","location":"Shop No.3 Tangi Complex, Next to Namibia Funeral Supply, Dimo Amaambo Street Eenhana","phone":"814682049"},
                        {"id":"otjiwarongo","name":"OTJIWARONGO DPC","location":"Erindi Complex next to Spar","phone":"814681997"}
                    ])
                    branches.append(data)
                    save_json_file(BRANCHES_FILE, branches)
                    response = {"success": True, "message": "Branch saved"}
                
            elif path == '/api/reports':
                if POSTGRESQL_AVAILABLE:
                    # Ensure ID exists
                    if 'id' not in data:
                        data['id'] = f"RPT{int(time.time()*1000)}"
                    # Convert products list to JSONB format
                    if 'products' in data and isinstance(data['products'], list):
                        data['products'] = json.dumps(data['products'])
                    # Insert into database
                    result = insert('reports', data)
                    if result:
                        # Convert JSONB back to list for response
                        if 'products' in result and isinstance(result['products'], str):
                            try:
                                result['products'] = json.loads(result['products'])
                            except:
                                pass
                        response = {"success": True, "message": "Report saved", "data": result}
                    else:
                        response = {"success": False, "error": "Failed to save report"}
                else:
                    reports = load_json_file(REPORTS_FILE)
                    # Filter out client data that might have been mixed in
                    reports = [item for item in reports if 'id' in item and item.get('id', '').startswith('RPT')]
                    reports.append(data)
                    save_json_file(REPORTS_FILE, reports)
                    response = {"success": True, "message": "Report saved"}
                
            elif path == '/api/orders':
                if POSTGRESQL_AVAILABLE:
                    # Basic validation and idempotency by client-provided id
                    incoming_id = (data.get('id') or '').strip()
                    if incoming_id:
                        existing = get_by_id('orders', incoming_id)
                        if existing:
                            response = {"success": True, "message": "Order already exists", "order": existing}
                            self.wfile.write(json.dumps(response).encode('utf-8'))
                            return
                    # Assign server id if missing
                    if not incoming_id:
                        data['id'] = f"ORD{int(time.time()*1000)}"
                    # Timestamp and initial status
                    data.setdefault('date', datetime.utcnow().isoformat() + 'Z')
                    data.setdefault('status', 'pending')
                    # Convert items list to JSONB format
                    if 'items' in data and isinstance(data['items'], list):
                        data['items'] = json.dumps(data['items'])
                    # Insert into database
                    result = insert('orders', data)
                    if result:
                        # Convert JSONB back to list for response
                        if 'items' in result and isinstance(result['items'], str):
                            try:
                                result['items'] = json.loads(result['items'])
                            except:
                                pass
                        response = {"success": True, "message": "Order saved", "order": result}
                    else:
                        response = {"success": False, "error": "Failed to save order"}
                else:
                    # Basic validation and idempotency by client-provided id
                    orders = load_json_file(ORDERS_FILE, [])
                    incoming_id = (data.get('id') or '').strip()
                    if incoming_id:
                        existing = next((o for o in orders if o.get('id') == incoming_id), None)
                        if existing:
                            response = {"success": True, "message": "Order already exists", "order": existing}
                            self.wfile.write(json.dumps(response).encode('utf-8'))
                            return
                    # Assign server id if missing
                    if not incoming_id:
                        data['id'] = f"ORD{int(time.time()*1000)}"
                    # Timestamp and initial status
                    data.setdefault('date', datetime.utcnow().isoformat() + 'Z')
                    data.setdefault('status', 'pending')
                    orders.append(data)
                    save_json_file(ORDERS_FILE, orders)
                    response = {"success": True, "message": "Order saved", "order": data}
            
            elif path == '/api/email':
                # Store email payloads for auditing/testing in lieu of SMTP
                emails = load_json_file(EMAILS_FILE, [])
                email_record = {
                    "id": f"EML{int(time.time()*1000)}",
                    "to": data.get('to'),
                    "subject": data.get('subject'),
                    "body": data.get('body'),
                    "meta": {"createdAt": datetime.utcnow().isoformat() + 'Z'}
                }
                emails.append(email_record)
                save_json_file(EMAILS_FILE, emails)
                response = {"success": True, "message": "Email queued", "email": email_record}
            
            elif path == '/api/payments/verify/flutterwave':
                # Verify a Flutterwave transaction and optionally update an order
                # Expected payload: { "transaction_id": "...", "order_id": "..." }
                tx_id = (data.get('transaction_id') or '').strip()
                order_id = (data.get('order_id') or '').strip()
                secret_key = os.environ.get('FLW_SECRET_KEY', '').strip()
                if not tx_id or not secret_key:
                    response = {"success": False, "error": "Missing transaction_id or FLW_SECRET_KEY"}
                    self.wfile.write(json.dumps(response).encode('utf-8'))
                    return
                # Call Flutterwave verify endpoint using stdlib to avoid extra deps
                import urllib.request
                import urllib.error
                verify_url = f"https://api.flutterwave.com/v3/transactions/{tx_id}/verify"
                req = urllib.request.Request(verify_url, method='GET', headers={
                    'Authorization': f'Bearer {secret_key}',
                    'Content-Type': 'application/json'
                })
                verify_result = {"success": False}
                try:
                    with urllib.request.urlopen(req, timeout=15) as res:
                        body = res.read().decode('utf-8')
                        vr = json.loads(body)
                        status = (vr.get('status') or '').lower()
                        data_block = vr.get('data') or {}
                        charge_code = (data_block.get('processor_response') or '').lower()
                        amount = data_block.get('amount')
                        currency = data_block.get('currency')
                        tx_ref = data_block.get('tx_ref')
                        flw_id = data_block.get('id')
                        if status == 'success':
                            verify_result = {
                                "success": True,
                                "amount": amount,
                                "currency": currency,
                                "tx_ref": tx_ref,
                                "transaction_id": flw_id
                            }
                except urllib.error.HTTPError as e:
                    verify_result = {"success": False, "error": f"HTTP {e.code}"}
                except Exception as e:
                    verify_result = {"success": False, "error": str(e)}

                # If order_id provided and verification succeeded, mark order paid
                if verify_result.get('success') and order_id:
                    if POSTGRESQL_AVAILABLE:
                        # Get existing order
                        order = get_by_id('orders', order_id)
                        if order:
                            # Update order status and payment info
                            payment_data = {
                                'status': 'paid',
                                'payment_status': 'paid',
                                'payment_provider': 'flutterwave',
                                'transaction_id': verify_result.get('transaction_id')
                            }
                            # Store payment details in items JSONB or as separate field
                            # For now, update the main fields
                            update('orders', order_id, payment_data)
                    else:
                        orders = load_json_file(ORDERS_FILE, [])
                        updated = False
                        for i, o in enumerate(orders):
                            if o.get('id') == order_id:
                                o['status'] = 'paid'
                                o.setdefault('payment', {})
                                o['payment'].update({
                                    'provider': 'flutterwave',
                                    'verified': True,
                                    'transaction_id': verify_result.get('transaction_id'),
                                    'tx_ref': verify_result.get('tx_ref'),
                                    'amount': verify_result.get('amount'),
                                    'currency': verify_result.get('currency'),
                                    'verifiedAt': datetime.utcnow().isoformat() + 'Z'
                                })
                                orders[i] = o
                                updated = True
                                break
                        if updated:
                            save_json_file(ORDERS_FILE, orders)
                response = {"success": verify_result.get('success', False), "verify": verify_result}
                
            else:
                response = {"error": "Endpoint not found"}
            
            self.wfile.write(json.dumps(response).encode('utf-8'))
        except Exception as e:
            error_response = {"error": str(e)}
            self.wfile.write(json.dumps(error_response).encode('utf-8'))

    def do_PUT(self):
        """Handle PUT requests for updates"""
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        # Set CORS headers
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        try:
            data = json.loads(post_data.decode('utf-8'))
            parsed_path = urlparse(self.path)
            path = parsed_path.path
            
            if path == '/api/users':
                if POSTGRESQL_AVAILABLE:
                    user_id = data.get('id')
                    if not user_id:
                        response = {"success": False, "error": "User ID required"}
                    else:
                        # Convert branches array to PostgreSQL array format
                        if 'branches' in data and isinstance(data['branches'], list):
                            data['branches'] = '{' + ','.join(data['branches']) + '}'
                        result = update('users', user_id, data)
                        if result:
                            # Convert back to list for response
                            if 'branches' in result and isinstance(result['branches'], str):
                                result['branches'] = result['branches'].strip('{}').split(',') if result['branches'] else []
                            response = {"success": True, "message": "User updated", "data": result}
                        else:
                            response = {"success": False, "error": "Failed to update user"}
                else:
                    users = load_json_file(USERS_FILE, [
                        {"id":"USR001","username":"admin","password":"admin123","fullName":"Administrator","email":"admin@dynapharm.com.na","phone":"061-300877","role":"admin","branch":"townshop","branches":["townshop"]},
                        {"id":"USR002","username":"consultant","password":"consultant123","fullName":"Dr. John Smith","email":"consultant@dynapharm.com.na","phone":"061-300877","role":"consultant","branch":"townshop","branches":["townshop","khomasdal","hochland-park"]},
                        {"id":"USR003","username":"dispenser","password":"dispenser123","fullName":"Jane Doe","email":"dispenser@dynapharm.com.na","phone":"061-300877","role":"dispenser","branch":"townshop","branches":["townshop"]}
                    ])
                    # Update user
                    for i, user in enumerate(users):
                        if user['id'] == data['id']:
                            users[i] = data
                            break
                    save_json_file(USERS_FILE, users)
                    response = {"success": True, "message": "User updated"}
                
            elif path == '/api/clients':
                if POSTGRESQL_AVAILABLE:
                    client_id = data.get('id') or data.get('reference_number')
                    if not client_id:
                        response = {"success": False, "error": "Client ID or reference number required"}
                    else:
                        # Try by ID first, then by reference_number
                        if data.get('id'):
                            result = update('clients', client_id, data)
                        else:
                            # Update by reference_number
                            client = get_all('clients', {'reference_number': client_id})
                            if client:
                                result = update('clients', client[0]['id'], data)
                            else:
                                result = None
                        if result:
                            response = {"success": True, "message": "Client updated", "data": result}
                        else:
                            response = {"success": False, "error": "Client not found"}
                else:
                    clients = load_json_file(CLIENTS_FILE)
                    # Update client
                    client_found = False
                    for i, client in enumerate(clients):
                        if client.get('referenceNumber') == data.get('referenceNumber'):
                            clients[i] = data
                            client_found = True
                            break
                    
                    if client_found:
                        save_json_file(CLIENTS_FILE, clients)
                        response = {"success": True, "message": "Client updated"}
                    else:
                        response = {"error": "Client not found"}
                
            elif path == '/api/reports':
                if POSTGRESQL_AVAILABLE:
                    report_id = data.get('id')
                    if not report_id:
                        response = {"success": False, "error": "Report ID required"}
                    else:
                        # Convert products list to JSONB if present
                        if 'products' in data and isinstance(data['products'], list):
                            data['products'] = json.dumps(data['products'])
                        result = update('reports', report_id, data)
                        if result:
                            # Convert JSONB back to list for response
                            if 'products' in result and isinstance(result['products'], str):
                                try:
                                    result['products'] = json.loads(result['products'])
                                except:
                                    pass
                            response = {"success": True, "message": "Report updated", "data": result}
                        else:
                            response = {"success": False, "error": "Report not found"}
                else:
                    reports = load_json_file(REPORTS_FILE)
                    # Filter out client data that might have been mixed in
                    reports = [item for item in reports if 'id' in item and item.get('id', '').startswith('RPT')]
                    # Update report
                    report_found = False
                    for i, report in enumerate(reports):
                        if report.get('id') == data.get('id'):
                            reports[i] = data
                            report_found = True
                            break
                    
                    if report_found:
                        save_json_file(REPORTS_FILE, reports)
                        response = {"success": True, "message": "Report updated"}
                    else:
                        response = {"error": "Report not found"}
            
            elif path == '/api/orders':
                if POSTGRESQL_AVAILABLE:
                    order_id = data.get('id')
                    if not order_id:
                        response = {"success": False, "error": "Order id is required"}
                    else:
                        # Convert items list to JSONB if present
                        if 'items' in data and isinstance(data['items'], list):
                            data['items'] = json.dumps(data['items'])
                        result = update('orders', order_id, data)
                        if result:
                            # Convert JSONB back to list for response
                            if 'items' in result and isinstance(result['items'], str):
                                try:
                                    result['items'] = json.loads(result['items'])
                                except:
                                    pass
                            response = {"success": True, "message": "Order updated", "data": result}
                        else:
                            response = {"success": False, "error": "Order not found"}
                else:
                    # Update an existing order (status, assignments, fulfillment details)
                    orders = load_json_file(ORDERS_FILE, [])
                    order_id = data.get('id')
                    if not order_id:
                        response = {"error": "Order id is required"}
                    else:
                        updated = False
                        for i, o in enumerate(orders):
                            if o.get('id') == order_id:
                                # Merge top-level fields conservatively
                                for k, v in data.items():
                                    if k == 'id':
                                        continue
                                    o[k] = v
                                o.setdefault('updatedAt', datetime.utcnow().isoformat() + 'Z')
                                orders[i] = o
                                updated = True
                                break
                        if updated:
                            save_json_file(ORDERS_FILE, orders)
                            response = {"success": True, "message": "Order updated"}
                        else:
                            response = {"error": "Order not found"}
                
            else:
                response = {"error": "Endpoint not found"}
            
            self.wfile.write(json.dumps(response).encode('utf-8'))
        except Exception as e:
            error_response = {"error": str(e)}
            self.wfile.write(json.dumps(error_response).encode('utf-8'))

    def do_DELETE(self):
        """Handle DELETE requests"""
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        query_params = parse_qs(parsed_path.query)
        
        # Set CORS headers
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        try:
            if path == '/api/users' and 'id' in query_params:
                user_id = query_params['id'][0]
                if POSTGRESQL_AVAILABLE:
                    success = delete('users', user_id)
                    if success:
                        response = {"success": True, "message": "User deleted"}
                    else:
                        response = {"success": False, "error": "User not found"}
                else:
                    users = load_json_file(USERS_FILE, [
                        {"id":"USR001","username":"admin","password":"admin123","fullName":"Administrator","email":"admin@dynapharm.com.na","phone":"061-300877","role":"admin","branch":"townshop","branches":["townshop"]},
                        {"id":"USR002","username":"consultant","password":"consultant123","fullName":"Dr. John Smith","email":"consultant@dynapharm.com.na","phone":"061-300877","role":"consultant","branch":"townshop","branches":["townshop","khomasdal","hochland-park"]},
                        {"id":"USR003","username":"dispenser","password":"dispenser123","fullName":"Jane Doe","email":"dispenser@dynapharm.com.na","phone":"061-300877","role":"dispenser","branch":"townshop","branches":["townshop"]}
                    ])
                    users = [u for u in users if u['id'] != user_id]
                    save_json_file(USERS_FILE, users)
                    response = {"success": True, "message": "User deleted"}
                
            elif path == '/api/branches' and 'id' in query_params:
                branch_id = query_params['id'][0]
                if POSTGRESQL_AVAILABLE:
                    success = delete('branches', branch_id)
                    if success:
                        response = {"success": True, "message": "Branch deleted"}
                    else:
                        response = {"success": False, "error": "Branch not found"}
                else:
                    branches = load_json_file(BRANCHES_FILE, [
                        {"id":"townshop","name":"TOWNSHOP (Head Office)","location":"Shop No.1 Continental Building Independence Avenue - Windhoek","phone":"814683999"},
                        {"id":"khomasdal","name":"KHOMASDAL DPC","location":"Shop No.2 Khomasdal Funky Town - Windhoek","phone":"814682991"},
                        {"id":"katima","name":"KATIMA DPC","location":"Opposite Open Market Hospital Road, Katima","phone":"817375818"},
                        {"id":"outapi","name":"OUTAPI DPC","location":"Okasilili Location in Christmas Building, Next Tolemeka Garage Main Road Oshakati - Outapi","phone":"814685886"},
                        {"id":"ondangwa","name":"ONDANGWA DPC","location":"Shop No.3 Woerman Block Oluno, Opposite Fresco, Cash and Carry Entrance Ondangwa","phone":"814685882"},
                        {"id":"okongo","name":"OKONGO DPC","location":"Handongo Festus Erf 333 Okongo Village Council","phone":"814684935"},
                        {"id":"okahao","name":"OKAHAO DPC","location":"Iteka complex opposite Pep store Okahao - Oshakati main road","phone":"814683963"},
                        {"id":"nkurenkuru","name":"NKURENKURU DPC","location":"Total Service Station, Next to Oluno Bar - Nkurenkuru","phone":"814684939"},
                        {"id":"swakopmund","name":"SWAKOPMUND DPC","location":"Opposite Mondesa Usave Swakopmund","phone":"814686806"},
                        {"id":"hochland-park","name":"HOCHLAND PARK","location":"House No.2 Robin Road, Taubern Glain Street, Next to OK Food Windhoek","phone":"813207195"},
                        {"id":"rundu","name":"RUNDU DPC","location":"Shop No.6 Fish Building opposite, Dr. Romanus Kampungi Stadium","phone":"814050125"},
                        {"id":"gobabis","name":"GOBABIS","location":"Shop No. Church Street Woerman Complex Gobabis","phone":"814685905"},
                        {"id":"walvisbay","name":"WALVISBAY","location":"Shop No.6 Pelican Mall Shop Sam Nujoma Avenue","phone":"814685894"},
                        {"id":"eenhana","name":"EENHANA","location":"Shop No.3 Tangi Complex, Next to Namibia Funeral Supply, Dimo Amaambo Street Eenhana","phone":"814682049"},
                        {"id":"otjiwarongo","name":"OTJIWARONGO DPC","location":"Erindi Complex next to Spar","phone":"814681997"}
                    ])
                    branches = [b for b in branches if b['id'] != branch_id]
                    save_json_file(BRANCHES_FILE, branches)
                    response = {"success": True, "message": "Branch deleted"}
                
            else:
                response = {"error": "Endpoint not found"}
            
            self.wfile.write(json.dumps(response).encode('utf-8'))
        except Exception as e:
            error_response = {"error": str(e)}
            self.wfile.write(json.dumps(error_response).encode('utf-8'))

    def log_message(self, format, *args):
        """Override to reduce log noise"""
        pass

def _detect_ip() -> str:
    """Best-effort detection of the primary local IP for display/logging."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            # Doesn't need to be reachable; no packets sent
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except Exception:
        return 'localhost'

def start_backend_server(port=None):
    """Start the backend API server"""
    # Initialize PostgreSQL connection pool if available
    if POSTGRESQL_AVAILABLE:
        if init_db_pool():
            print("✅ PostgreSQL connection pool initialized")
        else:
            print("⚠️ Failed to initialize PostgreSQL, using JSON fallback")
    
    # Use PORT environment variable for Railway/Heroku deployment
    if port is None:
        port = int(os.environ.get('PORT', 8001))
    
    server_address = ('', port)
    httpd = HTTPServer(server_address, DynapharmAPIHandler)
    ip = _detect_ip()
    print(f"🚀 Dynapharm Backend API Server running on port {port}")
    if POSTGRESQL_AVAILABLE:
        print("📊 Using PostgreSQL database")
    else:
        print("📄 Using JSON file storage (PostgreSQL not available)")
    print(f"📡 API Base URL: http://localhost:{port}/api")
    print(f"🌐 Network URL: http://{ip}:{port}/api")
    print("📊 Available endpoints:")
    print("   GET  /api/clients   - Get all clients")
    print("   POST /api/clients   - Add new client")
    print("   GET  /api/users     - Get all users")
    print("   POST /api/users     - Add new user")
    print("   PUT  /api/users     - Update user")
    print("   DELETE /api/users   - Delete user")
    print("   GET  /api/branches  - Get all branches")
    print("   POST /api/branches  - Add new branch")
    print("   DELETE /api/branches - Delete branch")
    print("   GET  /api/reports   - Get all reports")
    print("   POST /api/reports   - Add new report")
    print("   PUT  /api/reports   - Update report")
    print("   GET  /api/orders    - Get all orders or one by ?id=")
    print("   POST /api/orders    - Create order (idempotent if same id)")
    print("   GET  /api/health    - Health check")
    print("\n🔄 Data is now synchronized across all devices!")
    print("⏹️  Press Ctrl+C to stop the server")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped")
        httpd.server_close()

if __name__ == "__main__":
    start_backend_server()
