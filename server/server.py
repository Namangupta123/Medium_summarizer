from flask import Flask, request, jsonify
from flask_cors import CORS
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser 
from langchain_mistralai import ChatMistralAI
import os
from dotenv import load_dotenv
from functools import wraps
import jwt
from google.oauth2 import id_token
from google.auth.transport import requests

load_dotenv()

app = Flask(__name__)
CORS(app)

template = """
You are an AI summarization agent tasked with summarizing the provided content. Your goal is to create a concise and informative summary that highlights the key points and important notes. Please follow these instructions:

1. **Content Analysis**: Carefully read and analyze the provided content.
2. **Summary Creation**: Write a summary that captures the main ideas and essential details. Ensure the summary is clear and concise.
3. **Important Notes**: Identify and list any critical notes or insights that should be emphasized.
4. **Bullet Points**: Present the summary and notes using bullet points for clarity and easy reading.

### Input Variables
- {{content}}: The text or document you want summarized.

Please ensure that the summary is accurate and reflects the original content's intent.
"""

mistral_key = os.getenv("mistral_key")
llm = ChatMistralAI(model="mistral-large-latest", temperature=0.6, mistral_api_key=mistral_key, max_tokens=5000)
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are an AI summarization agent tasked with summarizing the provided content."),
    ("human", template),
])

def verify_google_token(token):
    try:
        idinfo = id_token.verify_oauth2_token(
            token, 
            requests.Request(), 
            os.getenv('GOOGLE_CLIENT_ID')
        )
        return idinfo
    except ValueError:
        return None

def verify_token(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        
        try:
            token = token.split('Bearer ')[1]
            user_info = verify_google_token(token)
            if not user_info:
                return jsonify({'message': 'Invalid token'}), 401
            request.user = user_info
        except:
            return jsonify({'message': 'Invalid token'}), 401
        
        return f(*args, **kwargs)
    return decorated

@app.route('/summarize', methods=['POST'])
@verify_token
def summarize():
    try:
        content = request.json['content']
        input_data = {
            "content": content
        }
        response = (
            prompt
            | llm.bind(stop=["\nsummarization"])
            | StrOutputParser()
        )
        summary = response.invoke(input_data)
        return jsonify({"summary": summary})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(port=5000)