# netlify/functions/api.py
from app import app  # Import your Flask app instance

def handler(event, context):
    from serverless_wsgi import handle_request
    return handle_request(app, event, context)