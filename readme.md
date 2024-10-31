# Medium Blog Summarizer Chrome Extension

A Chrome extension that summarizes Medium blog posts using LangChain and Mistral AI.

## Features

- One-click summarization of Medium blog posts
- Clean and intuitive user interface
- Bullet-point format summaries for easy reading
- Powered by Mistral AI's large language model

## Architecture

The extension consists of several components:

### Frontend (Chrome Extension)
- `manifest.json`: Extension configuration and permissions
- `medium.html`: Popup interface with summarize button and results display
- `popup.js`: Handles button click and content extraction
- `background.js`: Manages communication with backend server

### Backend (Flask Server)
- `server.py`: Flask server that processes summarization requests using LangChain and Mistral AI

## How It Works

1. User clicks the extension icon on a Medium blog post
2. Extension extracts the article content
3. Content is sent to Flask backend server
4. Server uses LangChain and Mistral AI to generate a summary
5. Summary is displayed in the extension popup

## Setup

1. Clone this repository
2. Install Python dependencies:
   ```
   pip install flask flask-cors langchain-core langchain-mistralai
   ```
3. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable Developer mode
   - Click "Load unpacked"
   - Select the extension directory

4. Start the Flask server:
   ```
   python server/server.py
   ```

## Technical Details

- Uses Chrome's Scripting API to extract page content
- CORS-enabled Flask server for handling API requests
- LangChain for prompt engineering and AI model integration
- Mistral AI's large language model for high-quality summarization
- Clean, responsive UI with modern styling

## Note

Make sure to replace the Mistral API key in `server.py` with your own key before using the extension.
