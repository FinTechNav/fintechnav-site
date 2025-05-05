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
    timeline: {
      position: 'relative',
      maxWidth: '1200px',
      margin: '0 auto'
    },
    '@media (min-width: 768px)': {
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
        marginBottom: '60px',
        display: 'flex',
        alignItems: 'center',
        width: '100%'
      },
      leftContent: {
        width: '55%',
        textAlign: 'right',
        paddingRight: '32px',
        boxSizing: 'border-box',
        position: 'relative',
        zIndex: 1
      },
      rightContent: {
        width: '55%',
        paddingLeft: '32px',
        boxSizing: 'border-box',
        position: 'relative',
        zIndex: 1,
        marginLeft: '-10%'
      },
      contentBox: {
        backgroundColor: '#3a3a3a',
        padding: '24px',
        borderRadius: '6px',
        display: 'inline-block',
        textAlign: 'left',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease'
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
        zIndex: 2
      }
    },
    '@media (max-width: 767px)': {
      mobileTimeline: {
        paddingLeft: '25px',
        borderLeft: '2px solid #444',
        position: 'relative'
      },
      mobileTimelineItem: {
        position: 'relative',
        marginBottom: '40px'
      },
      mobileCircle: {
        position: 'absolute',
        left: '-27px',
        top: '16px',
        width: '16px',
        height: '16px',
        backgroundColor: '#c9a15f',
        borderRadius: '50%',
        border: '3px solid #1a1a1a'
      },
      mobileContentBox: {
        backgroundColor: '#3a3a3a',
        padding: '20px',
        borderRadius: '6px',
        marginLeft: '20px'
      }
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
    }
  };

  const timelineData = [
    {
      company: "Fiska",
      position: "VP Product", 
      dates: "April 2019 - Present",
      side: 'left',
      offset: '0px',
      content: (
        <>
          <h3 style={styles.h3}>Fiska</h3>
          <p style={styles.date}>April 2019 - Present</p>
          <p style={styles.contentText}>VP Product</p>
          <p style={styles.contentText}>
            This is where I currently hang my professional hat. In this 5-person company, I've been able to:
          </p>
          <ul style={styles.list}>
            <li>Architect a white-labeled merchant payment suite that's now deployed across 1,310+ payment lanes for 980+ merchants</li>
            <li>Grow our monthly payment processing volume by 213% (while keeping those response times lightning fast)</li>
            <li>Build payment infrastructure processing over $120M in annual transaction volume across both the US and Canada</li>
          </ul>
          <p style={styles.contentText}>
            It's a small startup environment where I get to be both a strategic product leader and hands-on technical implementer – sometimes writing code examples in the morning and troubleshooting production issues in the afternoon!
          </p>
        </>
      )
    },
    {
      company: "Vesta Corporation",
      position: "Head of Product",
      dates: "August 2016 - April 2019",
      side: 'right',
      offset: '20px',
      content: (
        <>
          <h3 style={styles.h3}>Vesta Corporation</h3>
          <p style={styles.date}>August 2016 - April 2019</p>
          <p style={styles.contentText}>Head of Product</p>
          <p style={styles.contentText}>During my time at Vesta, I:</p>
          <ul style={styles.list}>
            <li>Helped restructure our offerings by unbundling the technology stack</li>
            <li>Led our transition from Waterfall to Agile methodologies (anyone who's been through this knows it's quite the adventure)</li>
            <li>Streamlined release processes, eliminating those pesky maintenance windows</li>
          </ul>
        </>
      )
    },
    {
      company: "Shift4",
      position: "Solutions Architect",
      dates: "January 2014 - August 2016",
      side: 'left',
      offset: '40px',
      content: (
        <>
          <h3 style={styles.h3}>Shift4 (Formally Credorax / Finaro)</h3>
          <p style={styles.date}>January 2014 - August 2016</p>
          <p style={styles.contentText}>Solutions Architect</p>
          <p style={styles.contentText}>This role had me juggling multiple time zones:</p>
          <ul style={styles.list}>
            <li>Working with engineering teams in Israel, IT in the US, and banking operations in Malta</li>
            <li>Creating technical specs for North America and EMEA markets</li>
            <li>Managing developer portal resources across multiple regulatory environments (not always the most exciting work, but absolutely essential)</li>
          </ul>
        </>
      )
    },
    {
      company: "Global Payments Inc.",
      position: "Director of Product",
      dates: "June 2007 - June 2013",
      side: 'right',
      offset: '60px',
      content: (
        <>
          <h3 style={styles.h3}>Global Payments Inc.</h3>
          <p style={styles.date}>June 2007 - June 2013</p>
          <p style={styles.contentText}>Director of Product</p>
          <p style={styles.contentText}>Some of my proudest professional accomplishments happened here:</p>
          <ul style={styles.list}>
            <li>Transforming payment infrastructure through our Global Transport initiative</li>
            <li>Scaling our platform to process 62 million transactions annually ($8.2 billion in volume)</li>
            <li>Receiving the "Best Channel Product" award in 2010 and personal Circle of Excellence award twice (humble brag, I know)</li>
          </ul>
        </>
      )
    },
    {
      company: "Abanco International, LLC",
      position: "Product Manager",
      dates: "May 2005 - June 2007",
      side: 'left',
      offset: '80px',
      content: (
        <>
          <h3 style={styles.h3}>Abanco International, LLC</h3>
          <p style={styles.date}>May 2005 - June 2007</p>
          <p style={styles.contentText}>Product Manager</p>
          <p style={styles.contentText}>During my time at Abanco, I:</p>
          <ul style={styles.list}>
            <li>Increased platform availability from two 9's to five 9's through process improvement and monitoring tools</li>
            <li>Worked closely with Sales, Marketing, Customer Support, Training, and IT teams</li>
            <li>Drove process changes that improved Payment Gateway stability and reliability</li>
            <li>Managed a direct report responsible for developer support and technical escalations</li>
          </ul>
        </>
      )
    },
    {
      company: "GO Software, Inc.",
      position: "Multiple Roles",
      dates: "September 1999 - May 2005",
      side: 'right',
      offset: '100px',
      content: (
        <>
          <h3 style={styles.h3}>GO Software, Inc.</h3>
          <p style={styles.date}>September 1999 - May 2005</p>
          <p style={styles.contentText}>Multiple Roles</p>
          <p style={styles.contentText}>I advanced through several roles, learning the payment processing industry from the ground up:</p>
          <ul style={styles.list}>
            <li>Started as Development Support Engineer, helping developers integrate payment solutions across multiple programming languages</li>
            <li>Progressed to Sales Engineer/Account Manager, handling high-profile accounts like Eastman Kodak and Sage Software</li>
            <li>Promoted to Product Engineer, rewriting product manuals and implementing critical PCCharge improvements</li>
            <li>Ultimately became Product Manager, bringing integrated payment terminals to market and developing essential procedures</li>
          </ul>
          <p style={styles.contentText}>This journey gave me end-to-end experience in the payment industry that still serves me today.</p>
        </>
      )
    },
    {
      company: "Union Camp Corporation",
      position: "IT Support Engineer",
      dates: "June 1994 - September 1999",
      side: 'left',
      offset: '120px',
      content: (
        <>
          <h3 style={styles.h3}>Union Camp Corporation</h3>
          <p style={styles.date}>June 1994 - September 1999</p>
          <p style={styles.contentText}>IT Support Engineer</p>
          <p style={styles.contentText}>This is where it all began! What started as a 3-month internship turned into my first professional role:</p>
          <ul style={styles.list}>
            <li>Began as an unpaid intern, was offered full-time position with benefits</li>
            <li>Company paid for my college tuition and books while I completed my degree</li>
            <li>Managed Lotus Notes administration (yes, I've been at this a while!)</li>
            <li>Performed maintenance on desktop computers and network infrastructure</li>
            <li>Provided end-user computer training and desktop troubleshooting</li>
          </ul>
          <p style={styles.contentText}>Fun fact: My mentor at Union Camp later convinced me to join him at GO Software, starting my payment processing journey!</p>
        </>
      )
    }
  ];

  const [windowWidth, setWindowWidth] = React.useState(typeof window !== 'undefined' ? window.innerWidth : 768);

  React.useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;

  return (
    <section className="section fade-in" style={styles.section}>
      <h2 style={styles.h2}>My Professional Journey</h2>
      <p style={styles.p}>
        Over the past 25+ years, I've been fortunate to work with some incredible companies and even more incredible people. Here's a glimpse at that journey:
      </p>
      
      <div style={isMobile ? styles['@media (max-width: 767px)']?.mobileTimeline : styles.timeline}>
        {!isMobile && <div style={styles['@media (min-width: 768px)']?.centerLine}></div>}
        
        {timelineData.map((item, index) => {
          const itemStyles = isMobile ? styles['@media (max-width: 767px)'] : styles['@media (min-width: 768px)'];
          
          return (
            <div 
              key={item.company}
              style={{
                ...(isMobile ? itemStyles.mobileTimelineItem : itemStyles.timelineItem),
                ...(item.side === 'left' && !isMobile ? { 
                  marginTop: index % 2 === 0 ? item.offset : '0px' 
                } : {})
              }}
            >
              {!isMobile && item.side === 'left' && (
                <div style={itemStyles.leftContent}>
                  <div style={itemStyles.contentBox}>
                    {item.content}
                  </div>
                </div>
              )}
              
              <div style={isMobile ? itemStyles.mobileCircle : itemStyles.circle}></div>
              
              {(!isMobile && item.side === 'right') || isMobile ? (
                <div style={isMobile ? {} : itemStyles.rightContent}>
                  <div style={isMobile ? itemStyles.mobileContentBox : itemStyles.contentBox}>
                    {item.content}
                  </div>
                </div>
              ) : (
                <div style={itemStyles.rightContent}></div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

// Mount the component
ReactDOM.render(<Timeline />, document.getElementById('career'));