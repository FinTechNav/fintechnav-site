const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const glob = require('glob');

const generateContent = () => {
  // Ensure output directory exists
  const outputDir = path.join(__dirname, '../public/content');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate timeline JSON
  const timelineFiles = glob.sync(path.join(__dirname, '../content/timeline/*.md'));
  const timelineData = timelineFiles.map(file => {
    const content = fs.readFileSync(file, 'utf8');
    const parsed = matter(content);
    return parsed.data;
  });
  
  fs.writeFileSync(
    path.join(outputDir, 'timeline.json'), 
    JSON.stringify(timelineData, null, 2)
  );
  
  // Generate about JSON
  const aboutFile = path.join(__dirname, '../content/about/content.md');
  if (fs.existsSync(aboutFile)) {
    const aboutContent = fs.readFileSync(aboutFile, 'utf8');
    const aboutData = matter(aboutContent).data;
    
    fs.writeFileSync(
      path.join(outputDir, 'about.json'), 
      JSON.stringify(aboutData, null, 2)
    );
  }
  
  console.log('Content generation complete!');
};

generateContent();