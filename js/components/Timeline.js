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
        margin: '0 auto'
      },
      centerLine: {
        content: '',
        position: 'absolute',
        width: '2px',
        backgroundColor: '#444',
        top: '0',
        bottom: '0',
        left: '50%',
        marginLeft: '-1px',
        zIndex: '1'
      },
      timelineItem: {
        position: 'relative',
        marginBottom: '40px',
        display: 'flex',
        alignItems: 'center',
        width: '100%'
      },
      leftContent: {
        width: 'calc(55% - 8px)', // Increased from 50% to 55%
        textAlign: 'right',
        paddingRight: '32px'
      },
      rightContent: {
        width: 'calc(55% - 8px)', // Increased from 50% to 55%
        paddingLeft: '32px'
      },
      contentBox: {
        backgroundColor: '#3a3a3a',
        padding: '24px',
        borderRadius: '6px',
        display: 'inline-block',
        textAlign: 'left',
        position: 'relative',
        zIndex: '2', // Ensures boxes appear above the center line
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)' // Add slight shadow for depth
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
        zIndex: '3' // Circles appear above everything
      }
    };
  
    // Add mobile-specific styles
    React.useEffect(() => {
      const styleSheet = document.createElement('style');
      styleSheet.textContent = `
        @media screen and (max-width: 768px) {
          /* Override desktop styles for mobile */
          .timeline {
            margin-left: 15px;
          }
          
          .timeline::before {
            content: '';
            position: absolute;
            left: 7px;
            top: 0;
            bottom: 0;
            width: 2px;
            background-color: #444;
          }
          
          .timeline-item {
            flex-direction: column !important;
            align-items: flex-start !important;
            padding-left: 30px;
          }
          
          .left-content, .right-content {
            width: 100% !important;
            padding: 0 !important;
            text-align: left !important;
          }
          
          .content-box {
            width: 100% !important;
            box-sizing: border-box;
            margin-bottom: 30px;
          }
          
          .timeline-circle {
            left: 7px !important;
            transform: none !important;
          }
        }
      `;
      document.head.appendChild(styleSheet);
    }, []);
  
    // Stagger for visual effect
    const itemStyle = (index) => ({
      ...styles.timelineItem,
      marginTop: index % 2 === 0 ? '0' : '20px' // Alternate the vertical positioning
    });
  
    return (
      <section className="section fade-in" style={styles.section}>
        <h2 style={styles.h2}>My Professional Journey</h2>
        <p style={styles.p}>
          Over the past 25+ years, I've been fortunate to work with some incredible companies and even more incredible people. What follows is my journey through the payment industry - a path shaped by professional relationships and some interesting twists:
        </p>
        
        <div className="timeline" style={styles.timeline}>
          {/* Center line */}
          <div style={styles.centerLine}></div>
          
          {/* Timeline items */}
          
          {/* Fiska - Left */}
          <div className="timeline-item" style={itemStyle(0)}>
            <div className="left-content" style={styles.leftContent}>
              <div className="content-box" style={styles.contentBox}>
                <h3 style={styles.h3}><a href="https://fiska.com/" target="_blank" style={styles.link}>Fiska</a></h3>
                <p style={styles.date}>April 2019 - Present</p>
                <p style={styles.contentText}>VP Product</p>
                <p style={styles.contentText}>
                  This is where I currently hang my professional hat. In this 5-person company, I've been able to:
                </p>
                <ul style={styles.list}>
                  <li>Architect a white-labeled merchant payment suite that's now deployed across 1,310+ payment lanes for 980+ merchants</li>
                  <li>Build an <a href="https://fiska.com/developers/" target="_blank" style={styles.link}>Omni-Channel payment gateway</a> supporting both in-store and online transactions</li>
                  <li>Grow our monthly payment processing volume by 213% (while keeping those response times lightning fast)</li>
                  <li>Build payment infrastructure processing over $120M in annual transaction volume across both the US and Canada</li>
                </ul>
                <p style={styles.contentText}>
                  It's a small startup environment where I get to be both a strategic product leader and hands-on technical implementer – sometimes writing code examples in the morning and troubleshooting production issues in the afternoon!
                </p>
              </div>
            </div>
            <div className="timeline-circle" style={styles.circle}></div>
            <div className="right-content" style={styles.rightContent}></div>
          </div>
          
          {/* Vesta - Right */}
          <div className="timeline-item" style={itemStyle(1)}>
            <div className="left-content" style={styles.leftContent}></div>
            <div className="timeline-circle" style={styles.circle}></div>
            <div className="right-content" style={styles.rightContent}>
              <div className="content-box" style={styles.contentBox}>
                <h3 style={styles.h3}><a href="https://www.vesta.io/" target="_blank" style={styles.link}>Vesta Corporation</a></h3>
                <p style={styles.date}>August 2016 - April 2019</p>
                <p style={styles.contentText}>Head of Product</p>
                <p style={styles.contentText}>This is where I learned all about how to combat fraud. During my time at Vesta, I:</p>
                <ul style={styles.list}>
                  <li>Helped restructure our offerings by unbundling the technology stack</li>
                  <li>Led our transition from Waterfall to Agile methodologies (anyone who's been through this knows it's quite the adventure)</li>
                  <li>Streamlined release processes, eliminating those pesky maintenance windows</li>
                </ul>
              </div>
            </div>
          </div>
          
          {/* Shift4 - Left */}
          <div className="timeline-item" style={itemStyle(2)}>
            <div className="left-content" style={styles.leftContent}>
              <div className="content-box" style={styles.contentBox}>
                <h3 style={styles.h3}><a href="https://www.credorax.com/legal/otc" target="_blank" style={styles.link}>Shift4 (Formally Credorax / Finaro)</a></h3>
                <p style={styles.date}>January 2014 - August 2016</p>
                <p style={styles.contentText}>Solutions Architect</p>
                <p style={styles.contentText}>I chose Shift4 to expand my payments knowledge outside of North America. They processed cross-border transactions for merchants in North America and for merchants located in EU countries and the EEA (The European Economic Area):</p>
                <ul style={styles.list}>
                  <li>Working with engineering teams in Israel, IT in the US, and banking operations in Malta</li>
                  <li>Creating technical specs for North America and EMEA markets</li>
                  <li>Managing developer portal resources across multiple regulatory environments</li>
                </ul>
                <p style={styles.contentText}>This role had me juggling multiple time zones and taught me valuable lessons about cross-cultural collaboration that I still use today.</p>
              </div>
            </div>
            <div className="timeline-circle" style={styles.circle}></div>
            <div className="right-content" style={styles.rightContent}></div>
          </div>
          
          {/* Global Payments - Right */}
          <div className="timeline-item" style={itemStyle(3)}>
            <div className="left-content" style={styles.leftContent}></div>
            <div className="timeline-circle" style={styles.circle}></div>
            <div className="right-content" style={styles.rightContent}>
              <div className="content-box" style={styles.contentBox}>
                <h3 style={styles.h3}><a href="https://www.globalpayments.com/" target="_blank" style={styles.link}>Global Payments Inc.</a></h3>
                <p style={styles.date}>June 2007 - June 2013</p>
                <p style={styles.contentText}>Director of Product</p>
                <p style={styles.contentText}>After Abanco was acquired by a New York-based company that later went bankrupt, I declined their offer and instead joined Global Payments — where my mentor from Union Camp and GO Software was now working. Our mission was to build a payment gateway using the same technology we'd used at Abanco:</p>
                <ul style={styles.list}>
                  <li>Transforming payment infrastructure through our Global Transport initiative</li>
                  <li>Scaling our platform to process 62 million transactions annually ($8.2 billion in volume)</li>
                  <li>Receiving the "Best Channel Product" award in 2010 and personal Circle of Excellence award twice</li>
                </ul>
              </div>
            </div>
          </div>
          
          {/* Abanco - Left */}
          <div className="timeline-item" style={itemStyle(4)}>
            <div className="left-content" style={styles.leftContent}>
              <div className="content-box" style={styles.contentBox}>
                <h3 style={styles.h3}><a href="https://greensheet.com/breakingnews&article_id=6" target="_blank" style={styles.link}>Abanco International, LLC</a></h3>
                <p style={styles.date}>May 2005 - June 2007</p>
                <p style={styles.contentText}>Product Manager</p>
                <p style={styles.contentText}>After GO Software was purchased by VeriFone and I felt the culture change wasn't for me, I followed a sales colleague I had worked closely with at GO Software to Abanco:</p>
                <ul style={styles.list}>
                  <li>Increased platform availability from two 9's to five 9's through process improvement and monitoring tools</li>
                  <li>Worked closely with Sales, Marketing, Customer Support, Training, and IT teams</li>
                  <li>Drove process changes that improved Payment Gateway stability and reliability</li>
                  <li>Managed a direct report responsible for developer support and technical escalations</li>
                </ul>
                <p style={styles.contentText}>This was also when I made my big move from Savannah to Atlanta - much easier to fly direct from Atlanta to Chicago than from Savannah!</p>
              </div>
            </div>
            <div className="timeline-circle" style={styles.circle}></div>
            <div className="right-content" style={styles.rightContent}></div>
          </div>
          
          {/* GO Software - Right */}
          <div className="timeline-item" style={itemStyle(5)}>
            <div className="left-content" style={styles.leftContent}></div>
            <div className="timeline-circle" style={styles.circle}></div>
            <div className="right-content" style={styles.rightContent}>
              <div className="content-box" style={styles.contentBox}>
                <h3 style={styles.h3}><a href="https://ir.svb.com/news-and-research/news/news-details/2005/VeriFone-Completes-Acquisition-of-GO-Software/default.aspx" target="_blank" style={styles.link}>GO Software, Inc.</a></h3>
                <p style={styles.date}>September 1999 - May 2005</p>
                <p style={styles.contentText}>Multiple Roles</p>
                <p style={styles.contentText}>When Union Camp was purchased by International Paper and many of the management were let go or left quickly, my mentor moved to this small software company. A few months later, after the culture at Union Camp completely changed and I became very unhappy, I joined my mentor at GO Software:</p>
                <ul style={styles.list}>
                  <li>Started as Development Support Engineer, helping developers integrate payment solutions</li>
                  <li>Progressed to Sales Engineer/Account Manager, handling high-profile accounts like Eastman Kodak</li>
                  <li>Promoted to Product Engineer, rewriting product manuals and implementing critical PCCharge improvements</li>
                  <li>Ultimately became Product Manager, bringing integrated payment terminals to market</li>
                </ul>
                <p style={styles.contentText}>This journey through multiple roles gave me end-to-end experience in the payment industry.</p>
              </div>
            </div>
          </div>
          
          {/* Union Camp - Left */}
          <div className="timeline-item" style={itemStyle(6)}>
            <div className="left-content" style={styles.leftContent}>
              <div className="content-box" style={styles.contentBox}>
                <h3 style={styles.h3}><a href="https://en.wikipedia.org/wiki/Union_Camp_Corporation" target="_blank" style={styles.link}>Union Camp Corporation</a></h3>
                <p style={styles.date}>June 1994 - September 1999</p>
                <p style={styles.contentText}>IT Support Engineer</p>
                <p style={styles.contentText}>This is where it all began! What started as a 3-month internship turned into my first professional role:</p>
                <ul style={styles.list}>
                  <li>Began as an intern, was offered full-time position with benefits</li>
                  <li>Company paid for my college tuition and books while I completed my degree</li>
                  <li>Managed Lotus Notes administration</li>
                  <li>Performed maintenance on desktop computers and network infrastructure</li>
                  <li>Provided end-user computer training and desktop troubleshooting</li>
                </ul>
                <p style={styles.contentText}>This is where I met my mentor - the person who would play such a crucial role in my career journey, convincing me to change my degree path and connecting me with opportunities at nearly every major transition in my career.</p>
              </div>
            </div>
            <div className="timeline-circle" style={styles.circle}></div>
            <div className="right-content" style={styles.rightContent}></div>
          </div>
        </div>
      </section>
    );
  };
  
  // Mount the component
  ReactDOM.render(<Timeline />, document.getElementById('career'));