# netlify/functions/api.py

def handler(event, context):
    print("Hello from the function logs!")
    return {
        'statusCode': 200,
        'body': "Hello from the AI! If you see this, the function is working."
    }