# 🧱 LEGO® Collector

A modern web application for managing your LEGO collection. Search through Rebrickable's extensive database and keep track of all your sets locally in your browser.

## ✨ Features

- **Search Rebrickable Database** - Find LEGO sets by searching for names or set numbers
- **Save Your Collection** - All data is stored locally in your browser using localStorage
- **Detailed Information** - View piece count, year, and images for each set
- **Smart Indicators** - Search results clearly show which sets you already own
- **Statistics** - See total number of sets and pieces in your collection
- **Export/Import** - Backup or share your collection as a JSON file

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- A free API key from [Rebrickable](https://rebrickable.com/api/)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Eikei7/lego-collector.git
cd lego-collector
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the project root and add your Rebrickable API key:
```
VITE_REBRICKABLE_API_KEY=your_api_key_here
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:5173](http://localhost:5173) in your browser

## 🏗️ Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist` folder.

## 🌐 Deploy to Netlify

The project is ready for deployment on Netlify:

1. Push your code to GitHub
2. Connect your repository to Netlify
3. Add `VITE_REBRICKABLE_API_KEY` as an environment variable in Netlify
4. Netlify will automatically use the settings from `netlify.toml`

Every push to the main branch will automatically deploy the new version on Netlify.

## 🛠️ Tech Stack

- **React** - UI library
- **Vite** - Build tool and dev server
- **Rebrickable API** - LEGO data
- **localStorage** - Local data storage
- **CSS** - Styling

## 📝 Usage

1. **Search for Sets** - Enter a set number (e.g., 10265) or name in the search field
2. **Add to Collection** - Click "+ Add" to save a set
3. **Manage Collection** - View all your sets under "My Collection"
4. **Remove Sets** - Click "Remove" to delete a set from your collection
5. **Export Data** - Save your collection as JSON for backup
6. **Import Data** - Restore your collection from a JSON file

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Data provided by [Rebrickable API](https://rebrickable.com/api/)
- LEGO® is a registered trademark of the LEGO Group
