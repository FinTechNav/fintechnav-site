const Timeline = () => {
  const styles = {
    section: {
      marginBottom: '80px'
    },
    sectionContent: {
      maxWidth: '800px',
      margin: '0 auto'
    },
    h2: {
      fontFamily: "'Poiret One', cursive",
      fontSize: '2.8rem',
      fontWeight: '400',
      marginBottom: '30px',
      color: '#f5f5f5',
      letterSpacing: '0.03em'
    },
    p: {
      fontFamily: "'Cormorant Garamond', serif",
      lineHeight: '1.7',
      fontSize: '1.1rem',
      color: '#e0e0e0',
      marginBottom: '40px'
    },
    link: {
      color: '#c9a15f',
      textDecoration: 'none'
    },
    timeline: {
      position: 'relative',
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '40px 0'
    },
    centerLine: {
      content: '',
      position: 'absolute',
      width: '2px',
      backgroundColor: '#444',
      top: '0',
      bottom: '0',
      left: '50%',
      marginLeft: '-1px'
    },
    timelineItem: {
      position: 'relative',
      marginTop: '-40px',
      display: 'flex',
      alignItems: 'center',
      width: '100%'
    },
    firstTimelineItem: {
      position: 'relative',
      marginTop: '0',
      display: 'flex',
      alignItems: 'center',
      width: '100%'
    },
    leftContent: {
      width: '55%',
      textAlign: 'right',
      paddingRight: '40px'
    },
    rightContent: {
      width: '55%',
      paddingLeft: '40px'
    },
    contentBox: {
      backgroundColor: '#3a3a3a',
      padding: '24px',
      borderRadius: '6px',
      display: 'inline-block',
      textAlign: 'left',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
      position: 'relative',
      transition: 'box-shadow 0.3s ease, transform 0.3s ease'
    },
    contentBoxHover: {
      boxShadow: '0 5px 15px rgba(201, 161, 95, 0.3)',
      transform: 'translateY(-5px)'
    },
    h3: {
      fontFamily: "'Poiret One', cursive",
      color: '#ffffff',
      fontWeight: '400',
      marginTop: '0',
      marginBottom: '8px',
      letterSpacing: '0.03em'
    },
    date: {
      color: '#c9a15f',
      fontStyle: 'italic',
      marginBottom: '8px'
    },
    contentText: {
      fontFamily: "'Cormorant Garamond', serif",
      color: '#e0e0e0',
      fontSize: '1.1rem'
    },
    list: {
      listStyle: 'disc',
      paddingLeft: '30px',
      color: '#e0e0e0',
      marginTop: '8px',
      fontFamily: "'Cormorant Garamond', serif",
      fontSize: '1.1rem'
    },
    circle: {
      position: 'absolute',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '16px',
      height: '16px',
      backgroundColor: '#c9a15f',
      borderRadius: '50%',
      border: '3px solid #1a1a1a',
      zIndex: 10
    },
    // Company link styling with subtle arrow
    companyLink: {
      position: 'relative',
      color: '#c9a15f',
      fontWeight: '500',
      display: 'inline-block',
      padding: '0 2px',
      margin: '0 2px',
      borderRadius: '2px',
      backgroundImage: 'linear-gradient(to right, transparent 50%, rgba(201, 161, 95, 0.2) 50%)',
      backgroundSize: '200% 100%',
      backgroundPosition: '0 0',
      transition: 'background-position 0.3s ease, color 0.3s ease, transform 0.2s ease'
    },
    companyLinkHover: {
      backgroundPosition: '-100% 0',
      textDecoration: 'none',
      transform: 'translateY(-1px)'
    },
    companyLinkArrow: {
      fontSize: '0.5em', // Smaller arrow
      position: 'relative',
      top: '-0.3em',
      marginLeft: '1px', // Closer to the text
      opacity: '0.5', // More subtle
      transition: 'opacity 0.3s ease, transform 0.3s ease'
    },
    companyLinkArrowVisible: {
      opacity: '1',
      transform: 'translateX(1px)'
    },
    // Mobile styles
    mobileTimeline: {
      position: 'relative',
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '30px 0'
    },
    mobileTimelineItem: {
      position: 'relative',
      marginBottom: '30px',
      display: 'flex',
      flexDirection: 'column',
      width: '100%'
    },
    mobileContentBox: {
      backgroundColor: '#3a3a3a',
      padding: '24px',
      borderRadius: '6px',
      textAlign: 'left',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
      position: 'relative',
      width: '100%',
      boxSizing: 'border-box',
      transition: 'box-shadow 0.3s ease, transform 0.3s ease'
    }
  };

  // Add React Hooks for hover state and responsive behavior
  const [hoveredItem, setHoveredItem] = React.useState(null);
  const [isMobile, setIsMobile] = React.useState(false);
  
  // Update mobile state based on window width
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 950); // Increased breakpoint from 768px to 950px
    };
    
    // Initial check
    checkMobile();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkMobile);
    
    // Cleanup event listener
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <section className="section fade-in" style={styles.section}>
      <div style={styles.sectionContent}>
        <h2 style={styles.h2}>My Professional Journey</h2>
        <p style={styles.p}>
          Over the past 25+ years, I've been fortunate to work with some incredible companies and even more incredible people. What follows is my journey through both the technology and payment industries - a path shaped by professional relationships and some interesting transitions:
        </p>
      </div>
      
      <div style={isMobile ? styles.mobileTimeline : styles.timeline}>
        {!isMobile && <div style={styles.centerLine}></div>}
        
        {timelineItems.map((item, index) => (
          <div 
            key={index}
            style={{
              ...(isMobile ? styles.mobileTimelineItem : (index === 0 ? styles.firstTimelineItem : styles.timelineItem)),
              zIndex: item.zIndex,
            }}
          >
            {/* Desktop Layout */}
            {!isMobile && item.side === 'left' && (
              <React.Fragment>
                <div style={styles.leftContent}>
                  <div 
                    style={{
                      ...styles.contentBox, 
                      ...(hoveredItem === `left-${index}` ? styles.contentBoxHover : {})
                    }}
                    onMouseEnter={() => setHoveredItem(`left-${index}`)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <h3 style={styles.h3}>
                      <a 
                        href={item.company.url} 
                        target="_blank" 
                        className="company-link"
                        style={{
                          ...styles.companyLink,
                          ...(hoveredItem === `companyLeft-${index}` ? styles.companyLinkHover : {})
                        }}
                        onMouseEnter={() => setHoveredItem(`companyLeft-${index}`)}
                        onMouseLeave={() => setHoveredItem(`left-${index}`)}
                      >
                        {item.company.name}
                        <span 
                          style={{
                            ...styles.companyLinkArrow,
                            ...(hoveredItem === `companyLeft-${index}` ? styles.companyLinkArrowVisible : {})
                          }}
                        >
                          ↗
                        </span>
                      </a>
                    </h3>
                    <p style={{...styles.date, ...styles.contentText}}>{item.company.date}</p>
                    <p style={styles.contentText}>{item.company.role}</p>
                    <p style={styles.contentText}>{item.description}</p>
                    {item.highlights && (
                      <ul style={styles.list}>
                        {item.highlights.map((highlight, i) => (
                          <li key={i} dangerouslySetInnerHTML={{ __html: highlight }}></li>
                        ))}
                      </ul>
                    )}
                    {item.conclusion && (
                      <p style={styles.contentText}>{item.conclusion}</p>
                    )}
                  </div>
                </div>
                <div style={styles.circle}></div>
                <div style={styles.rightContent}></div>
              </React.Fragment>
            )}
            {!isMobile && item.side === 'right' && (
              <React.Fragment>
                <div style={styles.leftContent}></div>
                <div style={styles.circle}></div>
                <div style={styles.rightContent}>
                  <div 
                    style={{
                      ...styles.contentBox, 
                      ...(hoveredItem === `right-${index}` ? styles.contentBoxHover : {})
                    }}
                    onMouseEnter={() => setHoveredItem(`right-${index}`)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <h3 style={styles.h3}>
                      <a 
                        href={item.company.url} 
                        target="_blank" 
                        className="company-link"
                        style={{
                          ...styles.companyLink,
                          ...(hoveredItem === `companyRight-${index}` ? styles.companyLinkHover : {})
                        }}
                        onMouseEnter={() => setHoveredItem(`companyRight-${index}`)}
                        onMouseLeave={() => setHoveredItem(`right-${index}`)}
                      >
                        {item.company.name}
                        <span 
                          style={{
                            ...styles.companyLinkArrow,
                            ...(hoveredItem === `companyRight-${index}` ? styles.companyLinkArrowVisible : {})
                          }}
                        >
                          ↗
                        </span>
                      </a>
                    </h3>
                    <p style={{...styles.date, ...styles.contentText}}>{item.company.date}</p>
                    <p style={styles.contentText}>{item.company.role}</p>
                    <p style={styles.contentText}>{item.description}</p>
                    {item.highlights && (
                      <ul style={styles.list}>
                        {item.highlights.map((highlight, i) => (
                          <li key={i} dangerouslySetInnerHTML={{ __html: highlight }}></li>
                        ))}
                      </ul>
                    )}
                    {item.conclusion && (
                      <p style={styles.contentText}>{item.conclusion}</p>
                    )}
                  </div>
                </div>
              </React.Fragment>
            )}
            
            {/* Mobile Layout - Simplified with no circles or center line */}
            {isMobile && (
              <div 
                style={{
                  ...styles.mobileContentBox,
                  ...(hoveredItem === `mobile-${index}` ? styles.contentBoxHover : {})
                }}
                onMouseEnter={() => setHoveredItem(`mobile-${index}`)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <h3 style={styles.h3}>
                  <a 
                    href={item.company.url} 
                    target="_blank" 
                    className="company-link"
                    style={{
                      ...styles.companyLink,
                      ...(hoveredItem === `companyMobile-${index}` ? styles.companyLinkHover : {})
                    }}
                    onMouseEnter={() => setHoveredItem(`companyMobile-${index}`)}
                    onMouseLeave={() => setHoveredItem(`mobile-${index}`)}
                  >
                    {item.company.name}
                    <span 
                      style={{
                        ...styles.companyLinkArrow,
                        ...(hoveredItem === `companyMobile-${index}` ? styles.companyLinkArrowVisible : {})
                      }}
                    >
                      ↗
                    </span>
                  </a>
                </h3>
                <p style={{...styles.date, ...styles.contentText}}>{item.company.date}</p>
                <p style={styles.contentText}>{item.company.role}</p>
                <p style={styles.contentText}>{item.description}</p>
                {item.highlights && (
                  <ul style={styles.list}>
                    {item.highlights.map((highlight, i) => (
                      <li key={i} dangerouslySetInnerHTML={{ __html: highlight }}></li>
                    ))}
                  </ul>
                )}
                {item.conclusion && (
                  <p style={styles.contentText}>{item.conclusion}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

// Add this right before the final ReactDOM.render call
function SafeTimeline() {
  const [hasError, setHasError] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');

  // Create effect to catch errors during rendering
  React.useEffect(() => {
    const handleError = (event) => {
      event.preventDefault();
      setHasError(true);
      setErrorMessage(event.error?.message || 'Unknown error in Timeline component');
    };
    
    // Add global error handler
    window.addEventListener('error', handleError);
    
    // Clean up
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);

  if (hasError) {
    return (
      <div className="error-boundary" style={{
        padding: '20px',
        backgroundColor: '#4a2d2d',
        border: '1px solid #7a4a4a',
        borderRadius: '6px',
        color: '#ff8080',
        margin: '20px 0',
        textAlign: 'center'
      }}>
        <h3>Something went wrong with the timeline</h3>
        <p>{errorMessage}</p>
        <button 
          onClick={() => window.location.reload()}
          style={{
            backgroundColor: '#c9a15f',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Try reloading the page
        </button>
      </div>
    );
  }

  // If no error, render Timeline normally
  return <Timeline />;
}

// Replace the original render with the safe version
ReactDOM.render(<SafeTimeline />, document.getElementById('career'));