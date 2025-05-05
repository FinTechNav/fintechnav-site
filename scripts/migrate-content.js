const fs = require('fs');
const path = require('path');

// Create timeline directory if it doesn't exist
const timelineDir = path.join(__dirname, '../content/timeline');
if (!fs.existsSync(timelineDir)) {
  fs.mkdirSync(timelineDir, { recursive: true });
}

// Migrate company data
const companies = {
  fiska: {
    slug: 'fiska',
    metadata: { side: 'left', zIndex: 7 }
  },
  vesta: {
    slug: 'vesta',
    metadata: { side: 'right', zIndex: 6 }
  },
  shift4: {
    slug: 'shift4',
    metadata: { side: 'left', zIndex: 5 }
  },
  globalPayments: {
    slug: 'global-payments',
    metadata: { side: 'right', zIndex: 4 }
  },
  abanco: {
    slug: 'abanco',
    metadata: { side: 'left', zIndex: 3 }
  },
  goSoftware: {
    slug: 'go-software',
    metadata: { side: 'right', zIndex: 2 }
  },
  unionCamp: {
    slug: 'union-camp',
    metadata: { side: 'left', zIndex: 1 }
  }
};

// Read existing company data from JS files and convert to markdown
Object.entries(companies).forEach(([key, info]) => {
  const jsFile = path.join(__dirname, `../js/components/Timeline/data/companies/${key}.js`);
  if (fs.existsSync(jsFile)) {
    const content = fs.readFileSync(jsFile, 'utf8');
    // Extract data from const declaration
    const match = content.match(/const\s+\w+\s*=\s*({[\s\S]*});/);
    if (match) {
      try {
        const data = eval(`(${match[1]})`);
        
        // Convert to markdown frontmatter format
        const markdown = `---
company: "${data.company.name}"
url: "${data.company.url}"
date: "${data.company.date}"
role: "${data.company.role}"
description: "${data.description.replace(/"/g, '\\"')}"
highlights:
${data.highlights.map(h => `  - "${h.replace(/"/g, '\\"')}"`).join('\n')}
${data.conclusion ? `conclusion: "${data.conclusion.replace(/"/g, '\\"')}"` : ''}
metadata:
  side: "${info.metadata.side}"
  zIndex: ${info.metadata.zIndex}
slug: "${info.slug}"
---
`;
        
        fs.writeFileSync(
          path.join(timelineDir, `${info.slug}.md`),
          markdown
        );
        console.log(`Migrated ${key} to markdown`);
      } catch (error) {
        console.error(`Error migrating ${key}:`, error);
      }
    }
  }
});

console.log('Migration complete!');