# Brad Jensen - Professional Portfolio

![Website Screenshot](https://fintechnav.com/site-preview.png)

## Overview

This repository contains the source code for my professional portfolio website at [fintechnav.com](https://fintechnav.com). The site showcases my experience in FinTech and payment processing over the past 25+ years, along with my personal interests in music, wine, and travel.

## Features

- Responsive design with dark theme
- Interactive timeline of career history
- Modular content structure
- React-based timeline component
- Server-side email functionality via Netlify Functions
- Progressive Web App (PWA) capabilities
- Pre-commit code quality checks with ESLint and Prettier

## Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript, React
- **Backend**: Netlify Functions, SendGrid API
- **Deployment**: Netlify
- **Code Quality**: ESLint (v8.56+), Prettier, Husky, lint-staged
- **Other**: Babel (for JSX), Google Fonts

## Project Structure

```
project/
├── index.html              # Main HTML file
├── brad-in-vienna.jpg      # Hero image
├── styles/                 # CSS stylesheets
│   ├── main.css            # Main styling
│   ├── interests.css       # Interests section styling
│   ├── contact.css         # Contact form styling
│   └── critical.min.css    # Critical rendering path CSS
├── sections/               # HTML content sections
│   ├── about.html          # About section
│   ├── interests.html      # Interests section
│   └── contact.html        # Contact section
├── js/                     # JavaScript files
│   ├── animations.js       # Animation functionality
│   ├── content-loader.js   # Dynamic content loading
│   ├── navigation.js       # Navigation functionality
│   ├── contact-form.js     # Contact form handling
│   ├── image-loader.js     # Image optimization
│   └── components/         # React components
│       └── Timeline/       # Timeline component
│           ├── Timeline.js # Main component
│           └── data/       # Timeline data
│               ├── index.js                # Data aggregator
│               ├── metadata.js             # Position metadata
│               └── companies/              # Individual company data
│                   ├── fiska.js
│                   ├── vesta.js
│                   ├── shift4.js
│                   ├── globalPayments.js
│                   ├── abanco.js
│                   ├── goSoftware.js
│                   └── unionCamp.js
└── netlify/                # Netlify configuration
    └── functions/          # Serverless functions
        └── send-email.js   # Email handling function
```

## Local Development

1. Clone this repository
2. Open index.html in your browser for basic viewing
3. For email functionality:
   - Copy `.env.example` to `.env`
   - Add your SendGrid API key
   - Run `npm install` to install dependencies
   - Use the Netlify CLI for local function testing: `netlify dev`

## Code Quality Tools

This project uses several tools to maintain code quality:

- **ESLint**: Configured with a modern flat config system for JavaScript linting
- **Prettier**: Ensures consistent code formatting
- **Husky**: Manages Git hooks for pre-commit validation
- **lint-staged**: Runs linters only on staged files for efficient pre-commit checks

These tools automatically format and lint code before each commit, ensuring consistent style and quality.

## Deployment

This site is deployed on Netlify with continuous deployment from the main branch.

Environment variables required for deployment:

- SENDGRID_API_KEY

## Special Architecture Notes

This project uses a specific modular architecture for the timeline component:

- Individual company data is stored in separate files for easier maintenance
- Content is separated from presentation logic
- Global variable approach is used instead of ES6 modules for direct browser compatibility
- Specific script loading order must be maintained in index.html

## Performance Optimizations

- Image optimization
- Critical CSS for faster initial rendering
- Lazy loading for images
- Browser caching

## Design Decisions

- Dark theme for a more sophisticated look
- Gold accent color (#c9a15f)
- Responsive timeline with overlapping cards on desktop
- Simplified mobile experience
- Poiret One and Cormorant Garamond font pairing

## License

All rights reserved. This code is provided for demonstration purposes only.

## Contact

Feel free to reach out at [brad@fintechnav.com](mailto:brad@fintechnav.com) or connect on [LinkedIn](https://www.linkedin.com/in/brad-jensen-0624563).
