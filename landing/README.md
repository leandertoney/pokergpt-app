# PokerPro AI Landing Page

A high-converting, mobile-first landing page for PokerPro AI.

## Tech Stack

- **Vite** - Fast build tool
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment (Netlify)

This project includes a `netlify.toml` configuration file. Simply connect your repository to Netlify and it will auto-deploy.

### Manual Deploy

1. Run `npm run build`
2. Deploy the `dist` folder to Netlify

## Customization

### Screenshots

Replace the placeholder screenshots in `public/assets/images/`:

1. `screenshot-1.png` - Chat interface
2. `screenshot-2.png` - Voice mode
3. `screenshot-3.png` - Hand history
4. `screenshot-4.png` - Analysis results
5. `screenshot-5.png` - Session tracking

Recommended size: iPhone 15 Pro Max (1290 x 2796)

### Configuration

Edit `src/constants/config.ts` to update:

- App Store URL
- Legal links (Terms, Privacy)
- Social links

### Colors

Brand colors are defined in:
- `tailwind.config.ts` - Tailwind theme
- `src/constants/colors.ts` - JS reference

## Structure

```
landing/
├── public/
│   ├── assets/images/     # Screenshots, logo
│   └── favicon.png
├── src/
│   ├── components/
│   │   ├── layout/        # Header, Footer
│   │   ├── sections/      # Page sections
│   │   └── ui/            # Reusable components
│   ├── constants/         # Config, colors
│   ├── hooks/             # Custom hooks
│   └── lib/               # Utilities
└── index.html
```
