# netlify/functions/api.py
from app import app  # Import your Flask app instance

# This handler is required by Netlify to run a WSGI app (like Flask)
def handler(event, context):
    # The serverless-wsgi library handles the translation between
    # Netlify's event format and the WSGI format Flask expects.
    # You must add 'serverless-wsgi' to your requirements.txt for this to work.
    from serverless_wsgi import handle_request
    return handle_request(app, event, context)