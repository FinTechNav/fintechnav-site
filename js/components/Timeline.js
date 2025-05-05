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
    }
  };

  const timelineItems = [
    {
      side: 'left',
      zIndex: 7,
      content: (
        <div>
          <h3 style={styles.h3}><a href="https://fiska.com/" target="_blank" style={styles.link}>Fiska</a></h3>
          <p style={styles.date}>April 2019 - Present</p>
          <p style={styles.contentText}>VP Product</p>
          <p style={styles.contentText}>
            This is where I currently hang my professional hat. In this 5-person company, I've been able to:
          </p>
          <ul style={styles.list}>
            <li>Architect white-labeled payment middleware that allows ISVs to quickly add card present capabilities to their cloud-based POS systems, now deployed across 1,310+ payment lanes for 980+ merchants</li>
            <li>Build an <a href="https://fiska.com/developers/" target="_blank" style={styles.link}>Omni-Channel payment gateway</a> supporting both in-store and online transactions, launched in Q2 of 2025</li>
            <li>Grow our monthly payment processing volume by 213% (while keeping those response times lightning fast)</li>
          </ul>
          <p style={styles.contentText}>
            It's a small startup environment where I get to be both a strategic product leader and hands-on technical implementer – sometimes holding strategy sessions in the morning and answering integration questions from ISVs in the afternoon!
          </p>
        </div>
      )
    },
    {
      side: 'right',
      zIndex: 6,
      content: (
        <div>
          <h3 style={styles.h3}><a href="https://www.vesta.io/" target="_blank" style={styles.link}>Vesta Corporation</a></h3>
          <p style={styles.date}>August 2016 - April 2019</p>
          <p style={styles.contentText}>Head of Product</p>
          <p style={styles.contentText}>This is where I learned how to combat online credit card fraud. During my time at Vesta, I:</p>
          <ul style={styles.list}>
            <li>Helped restructure our offerings by unbundling the technology stack</li>
            <li>Led our transition from Waterfall to Agile methodologies (anyone who's been through this knows it's quite the adventure)</li>
            <li>Streamlined release processes, eliminating those pesky maintenance windows</li>
          </ul>
          <p style={styles.contentText}>I left Shift4 for Vesta because a former colleague from Abanco was running technology at Vesta and they needed transformational change. He knew I was the right person for the job.</p>
        </div>
      )
    },
    {
      side: 'left',
      zIndex: 5,
      content: (
        <div>
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
      )
    },
    {
      side: 'right',
      zIndex: 4,
      content: (
        <div>
          <h3 style={styles.h3}><a href="https://www.globalpayments.com/" target="_blank" style={styles.link}>Global Payments Inc.</a></h3>
          <p style={styles.date}>June 2007 - June 2013</p>
          <p style={styles.contentText}>Director of Product</p>
          <p style={styles.contentText}>After Abanco was acquired by a New York-based company, I declined their offer and instead joined Global Payments — where my mentor from Union Camp and GO Software was now working. Our mission was to build a payment gateway using the same technology we'd used at Abanco. (That company would later go bankrupt.)</p>
          <ul style={styles.list}>
            <li>Transforming payment infrastructure through our Global Transport initiative</li>
            <li>Scaling our platform to process 62 million transactions annually ($8.2 billion in volume)</li>
            <li>Receiving the "Best Channel Product" award in 2010 and personal Circle of Excellence award twice</li>
          </ul>
        </div>
      )
    },
    {
      side: 'left',
      zIndex: 3,
      content: (
        <div>
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
      )
    },
    {
      side: 'right',
      zIndex: 2,
      content: (
        <div>
          <h3 style={styles.h3}><a href="https://ir.svb.com/news-and-research/news/news-details/2005/VeriFone-Completes-Acquisition-of-GO-Software/default.aspx" target="_blank" style={styles.link}>GO Software, Inc.</a></h3>
          <p style={styles.date}>September 1999 - May 2005</p>
          <p style={styles.contentText}>Multiple Roles</p>
          <p style={styles.contentText}>When Union Camp was purchased by International Paper and many of the management were let go or left quickly, my mentor moved to this small software company. A few months later, as the culture at Union Camp transformed, I decided it was time for my next professional chapter and joined my mentor at GO Software:</p>
          <ul style={styles.list}>
            <li>Started as Development Support Engineer, helping developers integrate payment solutions</li>
            <li>Progressed to Sales Engineer/Account Manager, handling high-profile accounts like Eastman Kodak</li>
            <li>Promoted to Product Engineer, rewriting product manuals and implementing critical PCCharge improvements</li>
            <li>Ultimately became Product Manager, bringing integrated payment terminals to market</li>
          </ul>
          <p style={styles.contentText}>This journey through multiple roles gave me end-to-end experience in the payment industry.</p>
        </div>
      )
    },
    {
      side: 'left',
      zIndex: 1,
      content: (
        <div>
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
      )
    }
  ];

  return (
    <section className="section fade-in" style={styles.section}>
      <h2 style={styles.h2}>My Professional Journey</h2>
      <p style={styles.p}>
        Over the past 25+ years, I've been fortunate to work with some incredible companies and even more incredible people. What follows is my journey through both the technology and payment industries - a path shaped by professional relationships and some interesting transitions:
      </p>
      
      <div style={styles.timeline}>
        <div style={styles.centerLine}></div>
        
        {timelineItems.map((item, index) => (
          <div 
            key={index}
            style={{
              ...(index === 0 ? styles.firstTimelineItem : styles.timelineItem),
              zIndex: item.zIndex,
            }}
          >
            {item.side === 'left' ? (
              <React.Fragment>
                <div style={styles.leftContent}>
                  <div style={styles.contentBox}>
                    {item.content}
                  </div>
                </div>
                <div style={styles.circle}></div>
                <div style={styles.rightContent}></div>
              </React.Fragment>
            ) : (
              <React.Fragment>
                <div style={styles.leftContent}></div>
                <div style={styles.circle}></div>
                <div style={styles.rightContent}>
                  <div style={styles.contentBox}>
                    {item.content}
                  </div>
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