const Timeline = () => {
  const styles = {
    section: {
      marginBottom: '80px'
    },
    h2: {
      fontSize: '2.5rem',
      fontWeight: '300',
      marginBottom: '30px',
      color: '#f5f5f5'
    },
    p: {
      lineHeight: '1.6',
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
      position: 'relative'
    },
    h3: {
      color: '#ffffff',
      marginTop: '0',
      marginBottom: '8px'
    },
    date: {
      color: '#c9a15f',
      fontStyle: 'italic',
      marginBottom: '8px'
    },
    contentText: {
      color: '#e0e0e0'
    },
    list: {
      listStyle: 'disc',
      paddingLeft: '30px',
      color: '#e0e0e0',
      marginTop: '8px'
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
    // Mobile styles
    mobileTimeline: {
      position: 'relative',
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '40px 0 40px 40px'
    },
    mobileTimelineItem: {
      position: 'relative',
      marginBottom: '40px',
      display: 'flex',
      flexDirection: 'column',
      width: '100%'
    },
    mobileCenterLine: {
      content: '',
      position: 'absolute',
      width: '2px',
      backgroundColor: '#444',
      top: '0',
      bottom: '0',
      left: '24px',
      zIndex: 1
    },
    mobileCircle: {
      position: 'absolute',
      left: '-32px',
      width: '16px',
      height: '16px',
      backgroundColor: '#c9a15f',
      borderRadius: '50%',
      border: '3px solid #1a1a1a',
      zIndex: 10
    },
    mobileContentBox: {
      backgroundColor: '#3a3a3a',
      padding: '24px',
      borderRadius: '6px',
      textAlign: 'left',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
      position: 'relative',
      width: '100%',
      boxSizing: 'border-box'
    }
  };

  const isMobile = window.innerWidth <= 768;

  return (
    <section className="section fade-in" style={styles.section}>
      <h2 style={styles.h2}>My Professional Journey</h2>
      <p style={styles.p}>
        Over the past 25+ years, I've been fortunate to work with some incredible companies and even more incredible people. What follows is my journey through both the technology and payment industries - a path shaped by professional relationships and some interesting transitions:
      </p>
      
      <div style={isMobile ? styles.mobileTimeline : styles.timeline}>
        {!isMobile && <div style={styles.centerLine}></div>}
        {isMobile && <div style={styles.mobileCenterLine}></div>}
        
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
                  <div style={styles.contentBox}>
                    <h3 style={styles.h3}>
                      <a href={item.company.url} target="_blank" style={styles.link}>
                        {item.company.name}
                      </a>
                    </h3>
                    <p style={styles.date}>{item.company.date}</p>
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
                  <div style={styles.contentBox}>
                    <h3 style={styles.h3}>
                      <a href={item.company.url} target="_blank" style={styles.link}>
                        {item.company.name}
                      </a>
                    </h3>
                    <p style={styles.date}>{item.company.date}</p>
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
            
            {/* Mobile Layout */}
            {isMobile && (
              <React.Fragment>
                <div style={styles.mobileCircle}></div>
                <div style={styles.mobileContentBox}>
                  <h3 style={styles.h3}>
                    <a href={item.company.url} target="_blank" style={styles.link}>
                      {item.company.name}
                    </a>
                  </h3>
                  <p style={styles.date}>{item.company.date}</p>
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
              </React.Fragment>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

ReactDOM.render(<Timeline />, document.getElementById('career'));