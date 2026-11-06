// Flat config for the unbundled biography scripts and JSX.
export default [
  {
    ignores: [
      'stock/**',
      'netlify/functions/schwab-*.js',
      'netlify/functions/market-scan.js',
      'netlify/functions/gist-sync.js',
      '.agents/**',
      'artifacts/**',
      'scripts/**'
    ]
  },
  {
    files: ['js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',

        // React globals
        React: 'readonly',
        ReactDOM: 'readonly',

        // Timeline data files
        fiskaData: 'readonly',
        vestaData: 'readonly',
        shift4Data: 'readonly',
        globalPaymentsData: 'readonly',
        abancoData: 'readonly',
        goSoftwareData: 'readonly',
        unionCampData: 'readonly',
        metadata: 'readonly',
        timelineItems: 'readonly',

        // Functions
        setupContactForm: 'readonly',
        initializeNavigation: 'readonly'
      }
    },
    rules: {
      quotes: ['error', 'single', { avoidEscape: true }],
      semi: ['error', 'always'],
      'no-unused-vars': 'off',
      'no-console': 'off'
    }
  },
  // Special config for React JSX files
  {
    files: ['**/js/components/Timeline.js'],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    }
  }
];
