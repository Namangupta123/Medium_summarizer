# Medium Blog Summarizer Chrome Extension

A Chrome extension that summarizes Medium blog posts using LangChain and OPENAI, with Google Authentication and usage limits.

## Features

- 🔐 Google Authentication
- 📝 One-click Medium article summarization
- 🤖 Powered by OPENAI and LangChain
- 📊 Usage tracking (5 summaries per user)
- 🎨 Clean and modern UI
- Backend: Python Flask Server
- AI: LangChain, OpenAI

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Authentication: Google OAuth 2.0

## Setup

1. Clone the repository:
```bash
git clone https://github.com/Namangupta123/Medium_summarizer
cd medium-summarizer
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables:
   - Copy `.env.example` to `.env` in the server directory
   - Add your Google Client ID

4. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable Developer mode
   - Click "Load unpacked"
   - Select the extension directory

## Server Component

The server-side code for this extension is maintained in a separate repository:
- Server Repository: https://github.com/Namangupta123/summarizer_medium_naman

The server provides:
- API endpoints for article summarization
- User authentication validation
- Usage tracking and limiting
- OpenAI integration via LangChain

### Server Setup

1. Clone the server repository:
```bash
git clone https://github.com/Namangupta123/summarizer_medium_naman
cd summarizer_medium_naman
```

2. Install server dependencies:
```bash
pip install -r requirements.txt
```

3. Configure server environment variables:
   - Copy `.env.example` to `.env`
   - Add your OpenAI API key

4. Run the server:
```bash
python3 server.py
```

## Usage

1. Sign in with your Google account
2. Navigate to any Medium article
3. Click the extension icon
4. Click "Get Summary" to generate a summary
5. View your remaining usage count

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.