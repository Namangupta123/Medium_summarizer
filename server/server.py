from flask import Flask, request, jsonify
from flask_cors import CORS
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser 
from langchain_mistralai import ChatMistralAI
import os
from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)
CORS(app)
template="""
You are an AI summarization agent tasked with summarizing the provided content. Your goal is to create a concise and informative summary that highlights the key points and important notes. Please follow these instructions:

1. **Content Analysis**: Carefully read and analyze the provided content.
2. **Summary Creation**: Write a summary that captures the main ideas and essential details. Ensure the summary is clear and concise.
3. **Important Notes**: Identify and list any critical notes or insights that should be emphasized.
4. **Bullet Points**: Present the summary and notes using bullet points for clarity and easy reading.

### Example

**Content**: "The rapid advancement of artificial intelligence has sparked both excitement and concern across various industries. While AI promises increased efficiency and innovative solutions, it also raises questions about job displacement and ethical implications."

**Summary**:
- AI advancements are causing excitement and concern.
- Promises of increased efficiency and innovation.
- Raises questions about job displacement and ethics.

**Important Notes**:
- Consider the balance between AI benefits and potential job impacts.
- Ethical considerations are crucial in AI development.

### Input Variables
- {{content}}: The text or document you want summarized.

Please ensure that the summary is accurate and reflects the original content's intent. If the content is too complex or lengthy, consider breaking it down into smaller sections for more manageable summarization.
"""
mistral_key=os.getenv("mistral_key")
llm = ChatMistralAI(model="mistral-large-latest", temperature=0.6, mistral_api_key=mistral_key, max_tokens=5000)
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are an AI summarization agent tasked with summarizing the provided content."),
    ("human", template),
])

@app.route('/summarize', methods=['POST'])
def summarize():
    content = request.json['content']
    input_data={
        "content": content
    }
    response = (
        prompt
        | llm.bind(stop=["\nsummarization"])
        | StrOutputParser()
    )
    summary=response.invoke(input_data)
    return jsonify({"summary": summary})

if __name__ == "__main__":
    app.run(port=5000)
