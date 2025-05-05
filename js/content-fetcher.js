const ContentFetcher = {
  async fetchTimeline() {
    try {
      const response = await fetch('/content/timeline.json');
      if (!response.ok) throw new Error('Timeline content not found');
      const timelineData = await response.json();
      
      // Transform data to match existing structure
      return timelineData.sort((a, b) => b.metadata.zIndex - a.metadata.zIndex);
    } catch (error) {
      console.log('Falling back to static content:', error);
      // Fallback to existing timelineItems if fetch fails
      return window.timelineItems || [];
    }
  },
  
  async fetchAbout() {
    try {
      const response = await fetch('/content/about.json');
      if (!response.ok) throw new Error('About content not found');
      return await response.json();
    } catch (error) {
      console.log('About content not found:', error);
      return null;
    }
  }
};

// Make globally available
window.ContentFetcher = ContentFetcher;