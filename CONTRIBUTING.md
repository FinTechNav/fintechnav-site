# Contributing to fintechnav.com

Thank you for considering contributing to my personal website project! While this is primarily a personal portfolio site, I welcome suggestions, improvements, and bug fixes.

## How to Contribute

### Reporting Issues

If you find a bug or have a suggestion for improvement:

1. Check if the issue already exists in the [Issues](https://github.com/FinTechNav/fintechnav-site/issues) section
2. If not, create a new issue with a clear title and description
3. Include steps to reproduce the issue if applicable
4. Add screenshots if they help explain the problem

### Pull Requests

If you'd like to contribute code:

1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature-name`)
3. Make your changes
4. Test your changes thoroughly
5. Commit your changes (`git commit -am 'Add some feature'`)
6. Push to the branch (`git push origin feature/your-feature-name`)
7. Create a new Pull Request

### Code Style Guidelines

Please follow these guidelines when contributing code:

- Maintain the current file structure and organization
- Preserve the modular timeline architecture
- Follow the existing naming conventions
- Do not use ES6 module import/export statements (browser compatibility)
- Maintain the loading order in index.html
- Keep code simple and well-commented

### Important Architecture Notes

The timeline component uses a specific architecture:

- Individual company data is stored in separate files for easier maintenance
- Files are loaded in a specific order: company data files first, then metadata, then aggregator, then the Timeline component
- Do not use ES6 module imports/exports as the site is designed for direct browser execution without bundling

## Development Setup

1. Clone the repository
2. Open index.html in your browser for basic viewing
3. For email functionality:
   - Copy `.env.example` to `.env`
   - Add your SendGrid API key
   - Install dependencies with `npm install`
   - Use Netlify CLI for local function testing: `netlify dev`

## Questions?

If you have any questions about contributing, feel free to reach out to me at [brad@fintechnav.com](mailto:brad@fintechnav.com).

Thank you for your interest in improving this project!