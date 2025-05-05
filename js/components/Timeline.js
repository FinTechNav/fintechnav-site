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
      width: 'calc(50% - 20px)',
      textAlign: 'right',
      paddingRight: '32px'
    },
    rightContent: {
      width: 'calc(50% - 20px)',
      paddingLeft: '32px'
    },
    contentBox: {
      backgroundColor: '#3a3a3a',
      padding: '24px',
      borderRadius: '6px',
      display: 'inline-block',
      textAlign: 'left'
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
      border: '3px solid #1a1a1a'
    }
  };

  return (
    <section className="section fade-in" style={styles.section}>
      <h2 style={styles.h2}>My Professional Journey</h2>
      <p style={styles.p}>
        Over the past 25+ years, I've been fortunate to work with some incredible companies and even more incredible people. Here's a glimpse at that journey:
      </p>
      
      <div style={styles.timeline}>
        {/* Center line */}
        <div style={styles.centerLine}></div>
        
        {/* Timeline items */}
        
        {/* Fiska - Left */}
        <div style={styles.timelineItem}>
          <div style={styles.leftContent}>
            <div style={styles.contentBox}>
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
            </div>
          </div>
          <div style={styles.circle}></div>
          <div style={styles.rightContent}></div>
        </div>
        
        {/* Vesta - Right */}
        <div style={styles.timelineItem}>
          <div style={styles.leftContent}></div>
          <div style={styles.circle}></div>
          <div style={styles.rightContent}>
            <div style={styles.contentBox}>
              <h3 style={styles.h3}>Vesta Corporation</h3>
              <p style={styles.date}>August 2016 - April 2019</p>
              <p style={styles.contentText}>Head of Product</p>
              <p style={styles.contentText}>During my time at Vesta, I:</p>
              <ul style={styles.list}>
                <li>Helped restructure our offerings by unbundling the technology stack</li>
                <li>Led our transition from Waterfall to Agile methodologies (anyone who's been through this knows it's quite the adventure)</li>
                <li>Streamlined release processes, eliminating those pesky maintenance windows</li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Shift4 - Left */}
        <div style={styles.timelineItem}>
          <div style={styles.leftContent}>
            <div style={styles.contentBox}>
              <h3 style={styles.h3}>Shift4 (Formally Credorax / Finaro)</h3>
              <p style={styles.date}>January 2014 - August 2016</p>
              <p style={styles.contentText}>Solutions Architect</p>
              <p style={styles.contentText}>This role had me juggling multiple time zones:</p>
              <ul style={styles.list}>
                <li>Working with engineering teams in Israel, IT in the US, and banking operations in Malta</li>
                <li>Creating technical specs for North America and EMEA markets</li>
                <li>Managing developer portal resources across multiple regulatory environments (not always the most exciting work, but absolutely essential)</li>
              </ul>
            </div>
          </div>
          <div style={styles.circle}></div>
          <div style={styles.rightContent}></div>
        </div>
        
        {/* Global Payments - Right */}
        <div style={styles.timelineItem}>
          <div style={styles.leftContent}></div>
          <div style={styles.circle}></div>
          <div style={styles.rightContent}>
            <div style={styles.contentBox}>
              <h3 style={styles.h3}>Global Payments Inc.</h3>
              <p style={styles.date}>June 2007 - June 2013</p>
              <p style={styles.contentText}>Director of Product</p>
              <p style={styles.contentText}>I joined Global Payments where my mentor from Union Camp and GO Software was now working. Our mission was to build a payment gateway using the same technology we'd used at Abanco:</p>
              <ul style={styles.list}>
                <li>Transforming payment infrastructure through our Global Transport initiative</li>
                <li>Scaling our platform to process 62 million transactions annually ($8.2 billion in volume)</li>
                <li>Receiving the "Best Channel Product" award in 2010 and personal Circle of Excellence award twice (humble brag, I know)</li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Abanco - Left */}
        <div style={styles.timelineItem}>
          <div style={styles.leftContent}>
            <div style={styles.contentBox}>
              <h3 style={styles.h3}>Abanco International, LLC</h3>
              <p style={styles.date}>May 2005 - June 2007</p>
              <p style={styles.contentText}>Product Manager</p>
              <p style={styles.contentText}>After GO Software was purchased by VeriFone and I felt the culture change wasn't for me, I followed a former sales colleague to Abanco:</p>
              <ul style={styles.list}>
                <li>Increased platform availability from two 9's to five 9's through process improvement and monitoring tools</li>
                <li>Worked closely with Sales, Marketing, Customer Support, Training, and IT teams</li>
                <li>Drove process changes that improved Payment Gateway stability and reliability</li>
                <li>Managed a direct report responsible for developer support and technical escalations</li>
              </ul>
              <p style={styles.contentText}>This was when I also made my big move from Savannah to Atlanta in 2005.</p>
            </div>
          </div>
          <div style={styles.circle}></div>
          <div style={styles.rightContent}></div>
        </div>
        
        {/* GO Software - Right */}
        <div style={styles.timelineItem}>
          <div style={styles.leftContent}></div>
          <div style={styles.circle}></div>
          <div style={styles.rightContent}>
            <div style={styles.contentBox}>
              <h3 style={styles.h3}>GO Software, Inc.</h3>
              <p style={styles.date}>September 1999 - May 2005</p>
              <p style={styles.contentText}>Multiple Roles</p>
              <p style={styles.contentText}>I followed my mentor from Union Camp to this small software company in Savannah. I advanced through several roles, learning the payment processing industry from the ground up:</p>
              <ul style={styles.list}>
                <li>Started as Development Support Engineer, helping developers integrate payment solutions across multiple programming languages</li>
                <li>Progressed to Sales Engineer/Account Manager, handling high-profile accounts like Eastman Kodak and Sage Software</li>
                <li>Promoted to Product Engineer, rewriting product manuals and implementing critical PCCharge improvements</li>
                <li>Ultimately became Product Manager, bringing integrated payment terminals to market and developing essential procedures</li>
              </ul>
              <p style={styles.contentText}>This journey gave me end-to-end experience in the payment industry that still serves me today.</p>
            </div>
          </div>
        </div>
        
        {/* Union Camp - Left */}
        <div style={styles.timelineItem}>
          <div style={styles.leftContent}>
            <div style={styles.contentBox}>
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
              <p style={styles.contentText}>When Union Camp was purchased by International Paper and many management members left (including my mentor), the culture completely changed. A few months later, I joined my mentor at his new company, GO Software.</p>
            </div>
          </div>
          <div style={styles.circle}></div>
          <div style={styles.rightContent}></div>
        </div>
      </div>
    </section>
  );
};

// Mount the component
ReactDOM.render(<Timeline />, document.getElementById('career'));