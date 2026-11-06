// RedDay AI v4 — Cloudflare Kumo Dark-Mode & Electric Blue Edition
// Plain-English ("Checkers, Not Chess") Stock Dip Finder & Charles Schwab Portfolio Companion

const STORAGE_KEY = 'redday_ai_pwa_state_v2';
const AUTH_SESSION_KEY = 'redday_ai_auth_session_v1';
const CUSTOM_PASS_HASH_KEY = 'redday_ai_custom_pass_sha256';

const VALID_USER_HASHES = new Set([
  '322f965a2919f46725dece842eb487fc569656d59bf3e1d35cc33cf8a9dcdfec', // brad
  '2bf1a74b846d18cf93f19c2c51421547a0aa3c4232b67b691207e682dd899e1f'  // bradnjensen@gmail.com
]);
const DEFAULT_PASS_HASHES = new Set([
  'ecf5d3626124c783bddcaba5822be41610bdd696691e62d4a132818d80837a64', // RedDay2026!
  '158a323a7ba44870f23d96f1516dd70aa48e9a72db4ebb026b0a89e212a208ab'  // 2026
]);

// Rich, Plain-English Encyclopedia of all 15 Watchlist Companies
const COMPANY_PROFILES = {
  IREN: {
    name: 'IREN Limited (formerly Iris Energy)',
    categoryLabel: 'AI Data Center Landlord',
    marketCap: '$4.2 Billion (Mid-Size Company)',
    annualRevenue: '~$680 Million / yr (Growing ~115%/yr)',
    targetPrice12m: 32.00,
    plainWhatTheyDo: 'They own massive, liquid-cooled computer warehouses in Texas and British Columbia with their own power substations, and rent them out to tech giants like Microsoft to run AI.',
    whyWeLikeIt: 'Microsoft signed a multi-year deal for IREN\'s 200 MW Texas campus, and IREN is expanding to 1,400+ MW of power capacity. When AI stocks have a red day, IREN drops fast and rebounds hard.',
    projectionNote: 'Wall Street analysts project the stock to reach ~$32 over the next 12 months as their new Texas AI buildings finish construction.',
    sampleHistory30d: [21.5, 22.1, 23.4, 24.8, 25.8, 25.1, 24.4, 23.9, 24.6, 25.2, 24.4, 19.67]
  },
  APLD: {
    name: 'Applied Digital Corporation',
    categoryLabel: 'AI Data Center Landlord',
    marketCap: '$3.5 Billion (Mid-Size Company)',
    annualRevenue: '~$340 Million / yr (Booked $36B+ in future rent)',
    targetPrice12m: 24.00,
    plainWhatTheyDo: 'They build giant, purpose-built AI supercomputer campuses in North Dakota and rent the entire buildings out on 15-year leases to hyperscale cloud companies.',
    whyWeLikeIt: 'They have already locked in $36 Billion to $86 Billion in long-term lease contracts across 1,410 megawatts of power, backed by funding from Macquarie Asset Management and NVIDIA.',
    projectionNote: 'Analysts project ~$24/share over the next year (+70% upside) as their Ellendale, ND campus rent checks start rolling in.',
    sampleHistory30d: [14.8, 15.4, 16.1, 16.9, 17.4, 17.0, 16.3, 15.9, 16.8, 16.55, 14.12]
  },
  WULF: {
    name: 'TeraWulf Inc.',
    categoryLabel: 'AI Data Center Landlord',
    marketCap: '$3.8 Billion (Mid-Size Company)',
    annualRevenue: '~$290 Million / yr (Signed $19B+ in AI leases)',
    targetPrice12m: 16.50,
    plainWhatTheyDo: 'They own zero-carbon power campuses (hydroelectric and nuclear-connected) in New York and Maryland and convert them into AI data centers.',
    whyWeLikeIt: 'They signed a massive 20-year, $19 Billion lease (up to $33 Billion) to host AI models for Anthropic (maker of Claude) and Google-backed Fluidstack.',
    projectionNote: 'Analysts see ~$16.50/share (+63% upside) over the next 12 months because 20-year rent checks from Anthropic make their future cash flow very predictable.',
    sampleHistory30d: [10.4, 10.9, 11.5, 12.1, 12.3, 11.8, 11.4, 11.9, 11.6, 11.52, 10.08]
  },
  CORZ: {
    name: 'Core Scientific, Inc.',
    categoryLabel: 'AI Data Center Landlord',
    marketCap: '$4.1 Billion (Mid-Size Company)',
    annualRevenue: '~$610 Million / yr ($10B+ in signed contracts)',
    targetPrice12m: 22.00,
    plainWhatTheyDo: 'One of the largest owners of high-power data centers in America, operating across 7 states with over 1,300 megawatts of power.',
    whyWeLikeIt: 'They already have over $10 Billion in signed 12-year rent contracts with CoreWeave (590 MW) and AMD (530 MW), with nearly 500 MW already online and paying rent today.',
    projectionNote: 'You don\'t own CORZ yet—it is #1 on our wish list for your next red-day deposit! Analysts target ~$22/share (+54% upside).',
    sampleHistory30d: [15.1, 15.6, 16.0, 16.4, 16.1, 15.8, 15.5, 15.9, 15.4, 15.25, 14.30]
  },
  CIFR: {
    name: 'Cipher Mining Inc.',
    categoryLabel: 'AI Data Center Landlord',
    marketCap: '$2.1 Billion (Small-to-Mid Company)',
    annualRevenue: '~$260 Million / yr ($16.6B lease pipeline)',
    targetPrice12m: 10.50,
    plainWhatTheyDo: 'They acquire huge plots of land next to cheap West Texas wind and solar power plants and build wholesale AI data centers.',
    whyWeLikeIt: 'At under $6 per share, CIFR is an affordable way to own a landlord with 700 MW of power and $16.6 Billion in contracted long-term AI leases.',
    projectionNote: 'Analysts project ~$10.50/share (+85% upside) over the next 12 months as their Barber Lake site comes online.',
    sampleHistory30d: [6.5, 6.8, 7.1, 7.45, 7.2, 6.9, 6.7, 6.6, 6.5, 6.45, 5.66]
  },
  CLSK: {
    name: 'CleanSpark, Inc.',
    categoryLabel: 'AI Data Center Landlord',
    marketCap: '$1.9 Billion (Small-to-Mid Company)',
    annualRevenue: '~$490 Million / yr ($6.6B–$11.6B Georgia lease)',
    targetPrice12m: 11.00,
    plainWhatTheyDo: 'They own a fleet of power-rich data centers in Georgia, Tennessee, and Wyoming that are pivoting into 20-year AI computer hosting.',
    whyWeLikeIt: 'They just signed a 20-year, $6.6 Billion to $11.6 Billion lease for their 175 MW campus in Sandersville, Georgia. We scooped up 1 share at $5.66 after a 24% single-day dip!',
    projectionNote: 'Analysts target ~$11.00/share (+93% upside) once investors value them as an AI landlord rather than just a crypto miner.',
    sampleHistory30d: [7.4, 7.8, 8.1, 7.9, 7.6, 7.4, 7.7, 7.55, 7.50, 5.68]
  },
  NVDA: {
    name: 'NVIDIA Corporation',
    categoryLabel: 'Big Tech Giant ($5 Schwab Slice)',
    marketCap: '$4.5 Trillion (World\'s Largest Tech Giant)',
    annualRevenue: '~$195 Billion / yr (Growing ~55%/yr)',
    targetPrice12m: 235.00,
    plainWhatTheyDo: 'They design the AI chips (Blackwell and Rubin GPUs) that power ChatGPT, Claude, Google Gemini, self-driving cars, and almost every AI data center on Earth.',
    whyWeLikeIt: 'Every AI data center landlord in your portfolio fills its buildings with NVIDIA chips. Even though 1 full share costs ~$186, Charles Schwab lets us buy exact $5.00 slices!',
    projectionNote: 'Analysts project ~$235/share (+26% upside) over the next year as their next-generation chips ship to Microsoft, Meta, and Amazon.',
    sampleHistory30d: [192, 196, 201, 206, 203, 199, 197, 200, 195.8, 186.50]
  },
  AVGO: {
    name: 'Broadcom Inc.',
    categoryLabel: 'Big Tech Giant ($5 Schwab Slice)',
    marketCap: '$1.4 Trillion (Mega-Cap Tech Giant)',
    annualRevenue: '~$64 Billion / yr (Pays a steady dividend too)',
    targetPrice12m: 365.00,
    plainWhatTheyDo: 'They make custom AI chips (designed specifically for Google, Meta, and Apple) plus the high-speed networking switches that connect thousands of AI servers together.',
    whyWeLikeIt: 'Whenever Google or Meta builds an AI cluster without NVIDIA, they usually pay Broadcom to build their custom chips. You can buy it in $5.00 Schwab Slices on any red day.',
    projectionNote: 'Analysts target ~$365/share (+21% upside) with steady long-term compounding.',
    sampleHistory30d: [310, 315, 322, 326, 320, 318, 316, 314.5, 301.20]
  },
  VRT: {
    name: 'Vertiv Holdings Co',
    categoryLabel: 'Big Tech Giant ($5 Schwab Slice)',
    marketCap: '$66 Billion (Large S&P 500 Company)',
    annualRevenue: '~$9.8 Billion / yr (Record order backlog)',
    targetPrice12m: 225.00,
    plainWhatTheyDo: 'They build the heavy-duty liquid cooling pipes, chillers, and backup power units that keep AI supercomputers from melting.',
    whyWeLikeIt: 'Modern AI racks run so hot that air conditioning no longer works—they require Vertiv\'s liquid cooling. Buying $5.00 slices on red days lets you own the #1 cooling supplier.',
    projectionNote: 'Analysts target ~$225/share (+27% upside) as liquid cooling becomes mandatory in every new data center.',
    sampleHistory30d: [185, 190, 196, 199.5, 194, 191, 189, 188.4, 176.80]
  },
  ANET: {
    name: 'Arista Networks, Inc.',
    categoryLabel: 'Big Tech Giant ($5 Schwab Slice)',
    marketCap: '$202 Billion (Large S&P 500 Company)',
    annualRevenue: '~$8.9 Billion / yr (Zero debt, huge cash pile)',
    targetPrice12m: 205.00,
    plainWhatTheyDo: 'They build ultra-fast Ethernet networking boxes that act like the "highway system" passing data between 100,000 AI chips inside Microsoft and Meta data centers.',
    whyWeLikeIt: 'If the networking is slow, expensive AI chips sit idle waiting for data. Arista is the gold standard for AI data center plumbing, and eligible for $5.00 Schwab Slices.',
    projectionNote: 'Analysts project ~$205/share (+27% upside) over the next 12 months.',
    sampleHistory30d: [166, 170, 174, 176, 173, 171, 169.2, 161.10]
  },
  VST: {
    name: 'Vistra Corp.',
    categoryLabel: 'Big Tech Giant ($5 Schwab Slice)',
    marketCap: '$48 Billion (Large S&P 500 Power Utility)',
    annualRevenue: '~$18.5 Billion / yr (Major US Power Producer)',
    targetPrice12m: 185.00,
    plainWhatTheyDo: 'They own nuclear and natural gas power plants across the US that sell 24/7 electricity directly to power-hungry data centers.',
    whyWeLikeIt: 'AI data centers need as much electricity as entire cities. Vistra owns the actual power plants and can be bought in $5.00 Schwab Slices whenever utility stocks dip.',
    projectionNote: 'Analysts target ~$185/share (+30% upside) as tech giants sign direct nuclear power deals.',
    sampleHistory30d: [145, 149, 153, 155, 151, 148, 148.9, 142.30]
  },
  POET: {
    name: 'POET Technologies Inc.',
    categoryLabel: 'Under-$5 AI Hardware Pick',
    marketCap: '$420 Million (Small Growth Company)',
    annualRevenue: '~$15 Million / yr (Ramping first commercial factory orders)',
    targetPrice12m: 7.50,
    plainWhatTheyDo: 'They make tiny "optical engines" that use beams of light instead of copper wires to move data between AI chips at 800G and 1.6T speeds.',
    whyWeLikeIt: 'Copper wires overheat at high AI speeds; light beams use far less electricity. At ~$4.42/share, it\'s an easy whole-share addition on red days that partnered with Foxconn and Mitsubishi.',
    projectionNote: 'Analysts target ~$7.50/share (+70% upside) as mass production shipments ramp up.',
    sampleHistory30d: [4.8, 5.1, 5.4, 5.6, 5.3, 5.1, 5.08, 4.42]
  },
  EOSE: {
    name: 'Eos Energy Enterprises, Inc.',
    categoryLabel: 'Under-$5 Cash Sweeper',
    marketCap: '$510 Million (Small Growth Company)',
    annualRevenue: '~$95 Million / yr ($765M battery backlog)',
    targetPrice12m: 3.50,
    plainWhatTheyDo: 'They manufacture American-made, non-flammable zinc batteries in Pennsylvania that store backup power for electric grids and AI data centers.',
    whyWeLikeIt: 'At ~$1.84/share, it is our favorite way to spend leftover $2–$4 change! And because it trades above $1.00, Charles Schwab lets you buy it immediately even with newly transferred bank cash.',
    projectionNote: 'Analysts target ~$3.50/share (+90% upside) backed by a Department of Energy loan and 3.2 GWh of orders.',
    sampleHistory30d: [2.05, 2.18, 2.35, 2.22, 2.10, 2.04, 1.84]
  },
  HIVE: {
    name: 'HIVE Digital Technologies Ltd.',
    categoryLabel: 'Under-$5 Cash Sweeper',
    marketCap: '$310 Million (Small Growth Company)',
    annualRevenue: '~$135 Million / yr ($350M AI Cloud target)',
    targetPrice12m: 3.25,
    plainWhatTheyDo: 'They run green hydroelectric data centers in Canada and Sweden and rent out NVIDIA Blackwell GPU clusters through their "BUZZ HPC" cloud.',
    whyWeLikeIt: 'You already own 2 shares! At ~$1.66/share, it\'s above Schwab\'s $1.00 rule so we can always sweep leftover spare change into HIVE on red days.',
    projectionNote: 'Analysts project ~$3.25/share (+95% upside) as their NVIDIA GPU cloud expands.',
    sampleHistory30d: [1.85, 1.98, 2.12, 2.01, 1.90, 1.83, 1.66]
  },
  BTBT: {
    name: 'Bit Digital, Inc.',
    categoryLabel: 'Under-$1.00 Settled-Cash Bargain',
    marketCap: '$180 Million (Small Growth Company)',
    annualRevenue: '~$115 Million / yr (Zero debt, owns Montreal data centers)',
    targetPrice12m: 2.00,
    plainWhatTheyDo: 'They own Tier-3 AI data centers in Montreal (Enovum) and rent out AI supercomputers to corporate customers.',
    whyWeLikeIt: 'You own 2 shares! Note: Because BTBT trades under $1.00 (~$0.70), Charles Schwab only lets you buy more when your cash has been settled in your account for 2+ business days.',
    projectionNote: 'Analysts target ~$2.00/share (+180% upside) if they execute on their Montreal data center expansion.',
    sampleHistory30d: [0.88, 0.94, 0.98, 0.91, 0.86, 0.845, 0.704]
  }
};

const DEFAULT_STATE = {
  cash: 1.40,
  deployBudget: 50.00,
  unsettledCash: true,
  blockDayTrades: true,
  todayOrders: [],
  sessionTiming: 'SEAMLESS',
  rules: {
    landlordRedTriggerPct: -5.0,
    sliceRedTriggerPct: -3.0,
    oversoldRsiThreshold: 40,
    zScoreTrigger: -1.25,
    harvestGainPct: 35.0,
    maxSingleStockWeightPct: 25.0
  },
  holdings: {
    IREN: { shares: 1, avgCost: 17.6585, role: 'Rents liquid-cooled Texas AI buildings to Microsoft' },
    APLD: { shares: 1, avgCost: 14.0300, role: 'Builds North Dakota AI campuses ($36B+ in signed leases)' },
    WULF: { shares: 1, avgCost: 10.0000, role: '20-year, $19B lease hosting Claude AI for Anthropic' },
    CIFR: { shares: 1, avgCost: 6.3900,  role: 'West Texas AI data center landlord (700 MW of power)' },
    CLSK: { shares: 1, avgCost: 5.6590,  role: 'Signed 20-year, $6.6B+ AI data center lease in Georgia' },
    HIVE: { shares: 2, avgCost: 1.7380,  role: 'Hydroelectric data centers + NVIDIA GPU cloud rental' },
    BTBT: { shares: 2, avgCost: 0.8434,  role: 'Owns Montreal AI data centers (Enovum) + GPU cloud' }
  },
  watchlist: [
    { symbol: 'IREN', bucket: 'Bucket 1: Landlord', role: 'Microsoft 200MW + 480MW AI Cloud', sp500Slice: false },
    { symbol: 'APLD', bucket: 'Bucket 1: Landlord', role: '$36B-$86B Hyperscaler Leases (1,410MW)', sp500Slice: false },
    { symbol: 'WULF', bucket: 'Bucket 1: Landlord', role: '$19B-$33B Anthropic + Fluidstack (839MW)', sp500Slice: false },
    { symbol: 'CORZ', bucket: 'Bucket 1: Landlord', role: 'CoreWeave (590MW) + AMD (530MW) Colocation', sp500Slice: false },
    { symbol: 'CIFR', bucket: 'Bucket 1: Landlord', role: '$16.6B Contracted HPC Leases (700MW)', sp500Slice: false },
    { symbol: 'CLSK', bucket: 'Bucket 1: Landlord', role: '$6.6B-$11.6B 20-Yr Georgia HPC Lease (175MW)', sp500Slice: false },
    { symbol: 'NVDA', bucket: 'Bucket 2: S&P 500 Slice', role: 'Blackwell/Rubin AI Accelerator Leader', sp500Slice: true },
    { symbol: 'AVGO', bucket: 'Bucket 2: S&P 500 Slice', role: 'Custom AI ASICs (XPUs) & AI Networking', sp500Slice: true },
    { symbol: 'VRT',  bucket: 'Bucket 2: S&P 500 Slice', role: 'Liquid Cooling & Data Center Power Mgmt', sp500Slice: true },
    { symbol: 'ANET', bucket: 'Bucket 2: S&P 500 Slice', role: '800G/1.6T Cloud & AI Ethernet Switching', sp500Slice: true },
    { symbol: 'VST',  bucket: 'Bucket 2: S&P 500 Slice', role: 'Nuclear & Natural Gas Baseload AI Power', sp500Slice: true },
    { symbol: 'POET', bucket: 'Bucket 3: Sweeper/Pick', role: '800G/1.6T Optical Interposers for AI GPUs', sp500Slice: false },
    { symbol: 'EOSE', bucket: 'Bucket 3: Sweeper/Pick', role: '$765M (3.2 GWh) Zinc Grid/DC Battery Storage', sp500Slice: false },
    { symbol: 'HIVE', bucket: 'Bucket 3: Sweeper/Pick', role: 'NVIDIA GB300 NVL72 GPU Cloud ($350M TCV)', sp500Slice: false },
    { symbol: 'BTBT', bucket: 'Bucket 3: Sweeper/Pick', role: 'Enovum Tier-3 Montreal DC + Cerebras Cloud', sp500Slice: false }
  ],
  quotes: {
    IREN: { activePrice: 19.67, prevClose: 24.40, high20d: 25.80, rsi14: 36.4, zScore20d: -1.62, closes: COMPANY_PROFILES.IREN.sampleHistory30d },
    APLD: { activePrice: 14.12, prevClose: 16.55, high20d: 17.40, rsi14: 38.2, zScore20d: -1.48, closes: COMPANY_PROFILES.APLD.sampleHistory30d },
    WULF: { activePrice: 10.08, prevClose: 11.52, high20d: 12.30, rsi14: 39.5, zScore20d: -1.39, closes: COMPANY_PROFILES.WULF.sampleHistory30d },
    CORZ: { activePrice: 14.30, prevClose: 15.25, high20d: 16.40, rsi14: 41.0, zScore20d: -1.28, closes: COMPANY_PROFILES.CORZ.sampleHistory30d },
    CIFR: { activePrice: 5.66,  prevClose: 6.45,  high20d: 7.45,  rsi14: 35.8, zScore20d: -1.70, closes: COMPANY_PROFILES.CIFR.sampleHistory30d },
    CLSK: { activePrice: 5.68,  prevClose: 7.50,  high20d: 8.10,  rsi14: 33.9, zScore20d: -1.85, closes: COMPANY_PROFILES.CLSK.sampleHistory30d },
    NVDA: { activePrice: 186.50, prevClose: 195.80, high20d: 206.00, rsi14: 41.2, zScore20d: -1.22, closes: COMPANY_PROFILES.NVDA.sampleHistory30d },
    AVGO: { activePrice: 301.20, prevClose: 314.50, high20d: 326.00, rsi14: 42.5, zScore20d: -1.15, closes: COMPANY_PROFILES.AVGO.sampleHistory30d },
    VRT:  { activePrice: 176.80, prevClose: 188.40, high20d: 199.50, rsi14: 38.9, zScore20d: -1.41, closes: COMPANY_PROFILES.VRT.sampleHistory30d },
    ANET: { activePrice: 161.10, prevClose: 169.20, high20d: 176.00, rsi14: 40.4, zScore20d: -1.30, closes: COMPANY_PROFILES.ANET.sampleHistory30d },
    VST:  { activePrice: 142.30, prevClose: 148.90, high20d: 155.00, rsi14: 43.1, zScore20d: -1.10, closes: COMPANY_PROFILES.VST.sampleHistory30d },
    POET: { activePrice: 4.42,  prevClose: 5.08,  high20d: 5.60,  rsi14: 37.5, zScore20d: -1.52, closes: COMPANY_PROFILES.POET.sampleHistory30d },
    EOSE: { activePrice: 1.84,  prevClose: 2.04,  high20d: 2.35,  rsi14: 39.1, zScore20d: -1.36, closes: COMPANY_PROFILES.EOSE.sampleHistory30d },
    HIVE: { activePrice: 1.66,  prevClose: 1.83,  high20d: 2.12,  rsi14: 36.8, zScore20d: -1.55, closes: COMPANY_PROFILES.HIVE.sampleHistory30d },
    BTBT: { activePrice: 0.704, prevClose: 0.845, high20d: 0.98,  rsi14: 34.2, zScore20d: -1.78, closes: COMPANY_PROFILES.BTBT.sampleHistory30d }
  },
  journal: [
    { date: 'Nov 5, 2026 (4:15 PM)', action: 'BOUGHT', symbol: 'HIVE', qty: 1, price: 1.6600, total: 1.66, orderId: '759493708600', note: 'Used leftover $1.66 change to add 1 share of HIVE' },
    { date: 'Nov 5, 2026 (4:12 PM)', action: 'BOUGHT', symbol: 'WULF', qty: 1, price: 10.0000, total: 10.00, orderId: '589914708600', note: 'Bought on a -13% red-day dip (Anthropic AI landlord)' },
    { date: 'Nov 5, 2026 (4:11 PM)', action: 'BOUGHT', symbol: 'CLSK', qty: 1, price: 5.6590, total: 5.66, orderId: '780024708600', note: 'Bought on a -24% red-day dip (Georgia AI data center lease)' },
    { date: 'Nov 5, 2026 (4:06 PM)', action: 'BOUGHT', symbol: 'APLD', qty: 1, price: 14.0300, total: 14.03, orderId: '499553708600', note: 'Bought on a -15% red-day dip (North Dakota AI landlord)' },
    { date: 'Nov 5, 2026 (4:04 PM)', action: 'BOUGHT', symbol: 'IREN', qty: 1, price: 17.6585, total: 17.66, orderId: '605324708600', note: 'Bought on a -22% dip — immediately bounced to $19.67!' },
    { date: 'Nov 4, 2026 (3:18 PM)', action: 'BOUGHT', symbol: 'BTBT', qty: 2, price: 0.8434, total: 1.69, orderId: '562234308600', note: 'Spent leftover change on 2 shares of Montreal AI data centers' },
    { date: 'Nov 4, 2026 (3:14 PM)', action: 'BOUGHT', symbol: 'HIVE', qty: 1, price: 1.8200, total: 1.82, orderId: '675404308600', note: 'First share in HIVE green-power GPU cloud' },
    { date: 'Nov 4, 2026 (3:12 PM)', action: 'BOUGHT', symbol: 'CIFR', qty: 1, price: 6.3900, total: 6.39, orderId: '621204308600', note: 'First AI data center landlord share (West Texas)' },
    { date: 'Nov 4, 2026 (3:09 PM)', action: 'SOLD',   symbol: 'IMPP', qty: 2, price: 4.6100, total: 9.22, orderId: '328783308600', note: 'Locked in +$2.88 (+45.4%) profit to fund our AI stocks!' }
  ],
  schwabAuth: {
    accessToken: '',
    refreshToken: '',
    accessTokenExpiresAt: 0,
    refreshTokenExpiresAt: 0,
    accountHash: ''
  }
};

async function sha256Hex(str) {
  const bytes = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function checkExistingLoginSession() {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY) || sessionStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.expiresAt > Date.now()) return true;
  } catch {
    // ignore
  }
  return false;
}

function initLoginGate() {
  const gate = document.getElementById('login-gate');
  const form = document.getElementById('form-login-gate');
  const errEl = document.getElementById('login-error-msg');
  const lockBtn = document.getElementById('btn-lock-app');

  if (checkExistingLoginSession()) {
    gate?.classList.add('hidden');
  } else {
    gate?.classList.remove('hidden');
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userRaw = (document.getElementById('login-username')?.value || '').trim().toLowerCase();
    const passRaw = (document.getElementById('login-password')?.value || '').trim();
    const remember = document.getElementById('login-remember')?.checked;

    const [userHash, passHash] = await Promise.all([sha256Hex(userRaw), sha256Hex(passRaw)]);
    const customPassHash = localStorage.getItem(CUSTOM_PASS_HASH_KEY);
    const passValid = customPassHash ? passHash === customPassHash : DEFAULT_PASS_HASHES.has(passHash);

    if (VALID_USER_HASHES.has(userHash) && passValid) {
      errEl?.classList.add('hidden');
      const sessionPayload = JSON.stringify({
        user: userRaw,
        expiresAt: Date.now() + (remember ? 30 * 24 * 60 * 60 * 1000 : 12 * 60 * 60 * 1000)
      });
      if (remember) localStorage.setItem(AUTH_SESSION_KEY, sessionPayload);
      else sessionStorage.setItem(AUTH_SESSION_KEY, sessionPayload);
      gate?.classList.add('hidden');
      showToast('Signed in to RedDay AI');
    } else {
      errEl?.classList.remove('hidden');
    }
  });

  lockBtn?.addEventListener('click', () => {
    localStorage.removeItem(AUTH_SESSION_KEY);
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    const passInp = document.getElementById('login-password');
    if (passInp) passInp.value = '';
    gate?.classList.remove('hidden');
    showToast('Session locked.');
  });
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(DEFAULT_STATE),
      ...parsed,
      rules: { ...DEFAULT_STATE.rules, ...(parsed.rules || {}) },
      holdings: { ...DEFAULT_STATE.holdings, ...(parsed.holdings || {}) },
      quotes: { ...DEFAULT_STATE.quotes, ...(parsed.quotes || {}) }
    };
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

let state = loadState();
let activeScanFilter = 'all';
let searchQuery = '';
let expandedTableSymbol = 'IREN';
let latestComputedRows = [];
let latestBasket = [];

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.classList.add('hidden'), 3800);
}

// Switch active tab across Desktop Sidebar & Mobile Bottom Nav
function switchTab(targetTab) {
  document.querySelectorAll('.tab-panel').forEach((p) => p.classList.add('hidden'));
  document.getElementById(`tab-${targetTab}`)?.classList.remove('hidden');

  document.querySelectorAll('#desktop-nav .tab-btn').forEach((b) => {
    const isMatch = b.getAttribute('data-tab') === targetTab;
    b.className = isMatch
      ? 'tab-btn w-full h-[34px] px-3 rounded-lg flex items-center justify-between text-[13px] font-medium bg-[#171717] text-[#f5f5f5] transition'
      : 'tab-btn w-full h-[34px] px-3 rounded-lg flex items-center justify-between text-[13px] font-medium text-[#d9d9d9] hover:bg-[#171717]/60 transition';
  });
}

// Cloudflare Kumo Style SVG Sparkline + 1-Yr Target Projection
function buildPriceAndProjectionSvg(closes, currentPrice, targetPrice, isRedToday, height = 92) {
  const hist = Array.isArray(closes) && closes.length >= 4
    ? [...closes.slice(-25), currentPrice]
    : [currentPrice * 1.12, currentPrice * 1.16, currentPrice * 1.08, currentPrice * 1.05, currentPrice];

  const allValues = [...hist];
  if (targetPrice && targetPrice > 0) allValues.push(targetPrice);

  const minVal = Math.min(...allValues) * 0.96;
  const maxVal = Math.max(...allValues) * 1.04;
  const range = Math.max(0.01, maxVal - minVal);

  const width = 360;
  const histWidth = targetPrice ? 265 : 340;
  const padY = 12;
  const usableH = height - padY * 2;

  const toY = (v) => padY + usableH - ((v - minVal) / range) * usableH;
  const points = hist.map((v, idx) => {
    const x = 8 + (idx / Math.max(1, hist.length - 1)) * (histWidth - 8);
    const y = toY(v);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const lastX = 8 + (histWidth - 8);
  const lastY = toY(currentPrice);
  // Cloudflare Kumo uses electric blue (#5491f6) for primary time-series lines!
  const strokeColor = '#5491f6';
  const fillId = `kumo_grad_${Math.random().toString(36).slice(2, 8)}`;

  let projectionElements = '';
  if (targetPrice && targetPrice > 0) {
    const projX = width - 12;
    const projY = toY(targetPrice);
    projectionElements = `
      <line x1="${lastX.toFixed(1)}" y1="${lastY.toFixed(1)}" x2="${projX}" y2="${projY.toFixed(1)}"
        stroke="#a4f4cf" stroke-width="1.8" stroke-dasharray="4 3" />
      <circle cx="${projX}" cy="${projY.toFixed(1)}" r="3.5" fill="#a4f4cf" />
    `;
  }

  return `
    <svg viewBox="0 0 ${width} ${height}" class="w-full h-24 overflow-visible">
      <defs>
        <linearGradient id="${fillId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${strokeColor}" stop-opacity="0.26" />
          <stop offset="100%" stop-color="${strokeColor}" stop-opacity="0.0" />
        </linearGradient>
      </defs>
      <!-- Cloudflare subtle horizontal reference grid lines -->
      <line x1="8" y1="${(height * 0.25).toFixed(0)}" x2="${width - 8}" y2="${(height * 0.25).toFixed(0)}" stroke="#262626" stroke-width="1" stroke-dasharray="2 2" />
      <line x1="8" y1="${(height * 0.55).toFixed(0)}" x2="${width - 8}" y2="${(height * 0.55).toFixed(0)}" stroke="#262626" stroke-width="1" stroke-dasharray="2 2" />
      <line x1="8" y1="${height - 6}" x2="${width - 8}" y2="${height - 6}" stroke="#333333" stroke-width="1" />
      <polygon points="8,${height - 6} ${points.join(' ')} ${lastX.toFixed(1)},${height - 6}" fill="url(#${fillId})" />
      <polyline fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="${points.join(' ')}" />
      <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="3.5" fill="${isRedToday ? '#ff6467' : '#5491f6'}" />
      ${projectionElements}
    </svg>
  `;
}

function computeStatsFromCloses(closes, activePrice, prevClose) {
  if (!Array.isArray(closes) || closes.length < 15) return null;
  const arr = [...closes];
  if (activePrice) arr[arr.length - 1] = activePrice;

  const period = 14;
  let gains = 0;
  let losses = 0;
  for (let i = arr.length - period; i < arr.length; i++) {
    const diff = arr[i] - arr[i - 1];
    if (diff > 0) gains += diff;
    else losses += -diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  const rsi14 = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  const tail20 = arr.slice(-20);
  const high20d = Math.max(...tail20);
  const mean = tail20.reduce((a, b) => a + b, 0) / tail20.length;
  const variance = tail20.reduce((a, b) => a + (b - mean) ** 2, 0) / tail20.length;
  const std = Math.sqrt(variance) || 1;
  const zScore20d = (activePrice - mean) / std;

  return {
    activePrice,
    prevClose: prevClose || arr[arr.length - 2] || activePrice,
    high20d,
    rsi14: Number(rsi14.toFixed(1)),
    zScore20d: Number(zScore20d.toFixed(2)),
    closes: arr.slice(-30)
  };
}

function isSameCalendarDay(dateStr) {
  if (!dateStr) return false;
  const todayLocal = new Date().toLocaleDateString();
  const todayShort = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const raw = String(dateStr);
  if (raw.includes(todayLocal) || raw.includes(todayShort)) return true;
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString() === todayLocal;
  }
  return false;
}

function getSameDayTradeLocks() {
  const boughtToday = new Set();
  const soldToday = new Set();

  // Check local trade journal
  if (Array.isArray(state.journal)) {
    for (const j of state.journal) {
      if (!isSameCalendarDay(j.date)) continue;
      const sym = String(j.symbol || '').toUpperCase().trim();
      const act = String(j.action || '').toUpperCase();
      if (sym && (act.includes('BUY') || act.includes('BOUGHT'))) boughtToday.add(sym);
      if (sym && (act.includes('SELL') || act.includes('SOLD'))) soldToday.add(sym);
    }
  }

  // Also check live Schwab todayOrders if synced
  if (Array.isArray(state.todayOrders)) {
    for (const o of state.todayOrders) {
      const status = String(o.status || '').toUpperCase();
      if (['CANCELED', 'REJECTED', 'EXPIRED'].includes(status)) continue;
      const legs = o.orderLegCollection || [];
      for (const leg of legs) {
        const sym = String(leg.instrument?.symbol || '').toUpperCase();
        const inst = String(leg.instruction || '').toUpperCase();
        if (sym && inst.includes('BUY')) boughtToday.add(sym);
        if (sym && inst.includes('SELL')) soldToday.add(sym);
      }
    }
  }

  return { boughtToday, soldToday };
}

function evaluateWatchlist() {
  const { rules, unsettledCash, holdings, quotes, watchlist } = state;
  const blockDayTrades = state.blockDayTrades !== false;
  const { boughtToday, soldToday } = getSameDayTradeLocks();

  const rows = watchlist.map((item) => {
    const profile = COMPANY_PROFILES[item.symbol] || {
      name: `${item.symbol} Corp.`,
      categoryLabel: item.sp500Slice ? 'Big Tech ($5 Slice)' : 'AI & Power Stock',
      marketCap: 'Public Company',
      annualRevenue: 'See Filings',
      targetPrice12m: 0,
      plainWhatTheyDo: item.role,
      whyWeLikeIt: 'Added to your custom watchlist to monitor for red-day dips.',
      projectionNote: 'Monitored for single-day drops below its 20-day average.',
      sampleHistory30d: []
    };

    const q = quotes[item.symbol] || {
      activePrice: 10.0,
      prevClose: 10.5,
      high20d: 11.5,
      rsi14: 45.0,
      zScore20d: -0.8,
      closes: profile.sampleHistory30d
    };

    const price = Number(q.activePrice);
    const prev = Number(q.prevClose || price);
    const dayPct = prev > 0 ? ((price - prev) / prev) * 100 : 0;
    const high20d = Number(q.high20d || Math.max(price, prev));
    const pullback20dPct = high20d > 0 ? ((price - high20d) / high20d) * 100 : 0;
    const rsi14 = Number(q.rsi14 ?? 45);
    const zScore20d = Number(q.zScore20d ?? -0.5);
    const closes = Array.isArray(q.closes) && q.closes.length >= 4 ? q.closes : profile.sampleHistory30d;

    const isRedToday = dayPct < 0;
    const triggerDrop = item.sp500Slice ? rules.sliceRedTriggerPct : rules.landlordRedTriggerPct;
    const hitRedTrigger =
      isRedToday &&
      (dayPct <= triggerDrop || zScore20d <= rules.zScoreTrigger || rsi14 <= rules.oversoldRsiThreshold);

    const todayRedPts = isRedToday ? Math.min(40, Math.max(0, -dayPct * 3.0)) : 0;
    const rsiPts = Math.min(30, Math.max(0, (55 - rsi14) * 1.2));
    const zPts = Math.min(30, Math.max(0, -zScore20d * 12.0));
    const dipScore = Number((todayRedPts + rsiPts + zPts).toFixed(0));

    const hold = holdings[item.symbol];
    const ownedShares = hold ? hold.shares : 0;
    const avgCost = hold ? hold.avgCost : 0;
    const pnlPct = hold && hold.avgCost > 0 ? ((price - hold.avgCost) / hold.avgCost) * 100 : null;

    const ac4203Blocked = unsettledCash && price < 1.0 && !item.sp500Slice;
    const pdtSellBlocked = blockDayTrades && boughtToday.has(item.symbol);
    const pdtBuyBlocked = blockDayTrades && soldToday.has(item.symbol);

    const target12m = profile.targetPrice12m || Number((high20d * 1.25).toFixed(2));
    const upsidePct = price > 0 ? ((target12m - price) / price) * 100 : 0;

    let verdictText = 'Up Today — Wait for Dip';
    let verdictBadgeClass = 'bg-[#171717] text-[#a1a1a1] ring-1 ring-[#333333]';

    if (pnlPct !== null && pnlPct >= rules.harvestGainPct) {
      if (pdtSellBlocked) {
        verdictText = `Up +${pnlPct.toFixed(0)}% — Hold Overnight (Anti-PDT)`;
        verdictBadgeClass = 'bg-[#155dfc]/20 text-[#50a2ff] ring-1 ring-[#5491f6]/50 font-medium';
      } else {
        verdictText = `Up +${pnlPct.toFixed(0)}% — Sell 1 Share`;
        verdictBadgeClass = 'bg-[#10b981]/15 text-[#a4f4cf] ring-1 ring-[#10b981]/40 font-medium';
      }
    } else if (pdtBuyBlocked) {
      verdictText = 'Sold Today — Wait Tomorrow (Anti-PDT)';
      verdictBadgeClass = 'bg-[#171717] text-[#a1a1a1] ring-1 ring-[#333333]';
    } else if (ac4203Blocked) {
      verdictText = 'Under $1.00 — Needs Settled Cash';
      verdictBadgeClass = 'bg-[#171717] text-[#a1a1a1] ring-1 ring-[#333333]';
    } else if (hitRedTrigger) {
      verdictText = `Big Sale (${dayPct.toFixed(1)}%) — Great Buy`;
      verdictBadgeClass = 'bg-[#155dfc]/20 text-[#50a2ff] ring-1 ring-[#5491f6]/50 font-medium';
    } else if (isRedToday && dipScore >= 35) {
      verdictText = `On Sale (${dayPct.toFixed(1)}%) — Good Pick`;
      verdictBadgeClass = 'bg-[#155dfc]/15 text-[#50a2ff] ring-1 ring-[#5491f6]/30';
    } else if (isRedToday) {
      verdictText = `Mild Dip (${dayPct.toFixed(1)}%)`;
      verdictBadgeClass = 'bg-[#171717] text-[#d9d9d9] ring-1 ring-[#333333]';
    }

    return {
      ...item,
      profile,
      price,
      prev,
      dayPct,
      high20d,
      pullback20dPct,
      rsi14,
      zScore20d,
      closes,
      dipScore,
      isRedToday,
      hitRedTrigger,
      ownedShares,
      avgCost,
      pnlPct,
      ac4203Blocked,
      pdtSellBlocked,
      pdtBuyBlocked,
      target12m,
      upsidePct,
      verdictText,
      verdictBadgeClass
    };
  });

  rows.sort((a, b) => {
    if (a.isRedToday !== b.isRedToday) return a.isRedToday ? -1 : 1;
    return b.dipScore - a.dipScore;
  });

  latestComputedRows = rows;
  return rows;
}

function computeRedDayBasket(rows, budget) {
  let remaining = Number(budget.toFixed(2));
  const basket = [];
  const { rules } = state;

  const redEligible = rows.filter((r) => r.isRedToday && !r.ac4203Blocked && !r.pdtBuyBlocked);

  const redSlices = redEligible.filter((r) => r.sp500Slice && r.dayPct <= rules.sliceRedTriggerPct);
  if (redSlices.length > 0 && remaining >= 25.0) {
    const topSlice = redSlices[0];
    basket.push({
      symbol: topSlice.symbol,
      companyName: topSlice.profile.name,
      qty: 1,
      displayQty: '$5.00 Slice',
      limitPrice: Number(topSlice.price.toFixed(2)),
      cost: 5.00,
      howToBuy: 'Schwab Stock Slice ($5.00 Fractional Share)',
      isSlice: true,
      dipScore: topSlice.dipScore,
      plainWhy: `Down ${Math.abs(topSlice.dayPct).toFixed(1)}% today (${Math.abs(topSlice.pullback20dPct).toFixed(0)}% below its recent high of $${topSlice.high20d.toFixed(0)}). ${topSlice.profile.plainWhatTheyDo}`
    });
    remaining = Number((remaining - 5.0).toFixed(2));
  }

  const coreCandidates = redEligible
    .filter((r) => !r.sp500Slice && r.price >= 3.0 && r.dipScore >= 30)
    .sort((a, b) => {
      const aUnowned = a.ownedShares === 0 ? 1 : 0;
      const bUnowned = b.ownedShares === 0 ? 1 : 0;
      if (aUnowned !== bUnowned) return bUnowned - aUnowned;
      return b.dipScore - a.dipScore;
    });

  for (const stock of coreCandidates) {
    const askLimit = Number((stock.price * 1.002).toFixed(2));
    if (askLimit <= remaining) {
      basket.push({
        symbol: stock.symbol,
        companyName: stock.profile.name,
        qty: 1,
        displayQty: '1 Share',
        limitPrice: askLimit,
        cost: askLimit,
        howToBuy: `Limit Order @ $${askLimit.toFixed(2)}`,
        isSlice: false,
        dipScore: stock.dipScore,
        plainWhy: `${stock.ownedShares === 0 ? '★ First Share in This Company! ' : ''}Down ${Math.abs(stock.dayPct).toFixed(1)}% today ($${stock.price.toFixed(2)} vs recent high of $${stock.high20d.toFixed(2)}). ${stock.profile.plainWhatTheyDo}`
      });
      remaining = Number((remaining - askLimit).toFixed(2));
    }
  }

  const sweepers = redEligible
    .filter((r) => !r.sp500Slice && r.price <= remaining)
    .sort((a, b) => {
      const aUnowned = a.ownedShares === 0 ? 1 : 0;
      const bUnowned = b.ownedShares === 0 ? 1 : 0;
      if (aUnowned !== bUnowned) return bUnowned - aUnowned;
      return b.dipScore - a.dipScore;
    });

  for (const sw of sweepers) {
    const askLimit = Number(sw.price.toFixed(sw.price < 1 ? 4 : 2));
    const maxQty = Math.floor(remaining / askLimit);
    if (maxQty >= 1) {
      const cost = Number((maxQty * askLimit).toFixed(2));
      basket.push({
        symbol: sw.symbol,
        companyName: sw.profile.name,
        qty: maxQty,
        displayQty: `${maxQty} ${maxQty === 1 ? 'Share' : 'Shares'}`,
        limitPrice: askLimit,
        cost,
        howToBuy: `Cash Sweeper Limit @ $${askLimit.toFixed(askLimit < 1 ? 4 : 2)}`,
        isSlice: false,
        dipScore: sw.dipScore,
        plainWhy: `Puts your leftover $${cost.toFixed(2)} change to work! Down ${Math.abs(sw.dayPct).toFixed(1)}% today. ${sw.profile.plainWhatTheyDo}`
      });
      remaining = Number((remaining - cost).toFixed(2));
    }
  }

  latestBasket = basket;
  return { basket, remaining };
}

function renderAll() {
  const rows = evaluateWatchlist();
  renderKPIsAndPortfolio();
  renderCloudflareQuickColumns(rows);
  renderBasketAndRadar(rows);
  renderCompanyCards(rows);
  renderCompaniesTableWithInlineDrawer(rows);
  renderStrategyStudio();
  renderJournal();
  renderSystemLogs();
  renderAuthStatus();
}

const LOG_STORAGE_KEY = 'redday_ai_system_logs_v4';
let systemLogs = [];
try {
  const savedLogs = localStorage.getItem(LOG_STORAGE_KEY);
  if (savedLogs) systemLogs = JSON.parse(savedLogs);
} catch {
  systemLogs = [];
}

function addSystemLog(level, source, message) {
  const entry = {
    time: new Date().toLocaleTimeString(),
    iso: new Date().toISOString(),
    level: String(level || 'INFO').toUpperCase(),
    source: String(source || 'system'),
    message: String(message || '')
  };
  systemLogs.unshift(entry);
  if (systemLogs.length > 80) systemLogs = systemLogs.slice(0, 80);
  try {
    localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(systemLogs));
  } catch {
    // ignore quota
  }
  renderSystemLogs();
}

async function safeReadJson(res, endpointLabel = 'API') {
  const rawText = await res.text();
  try {
    return JSON.parse(rawText);
  } catch {
    const snippet = rawText.replace(/\s+/g, ' ').slice(0, 140);
    const errMsg = `${endpointLabel} returned HTML/non-JSON (HTTP ${res.status}): ${snippet}`;
    addSystemLog('ERROR', endpointLabel, errMsg);
    throw new Error(errMsg);
  }
}

function renderSystemLogs() {
  const tbody = document.getElementById('system-logs-tbody');
  const modalPreview = document.getElementById('modal-auth-log-preview');
  const badge = document.getElementById('sidebar-log-count');
  if (badge) badge.textContent = String(systemLogs.length || 'Live');

  if (tbody) {
    if (!systemLogs.length) {
      tbody.innerHTML = `
        <tr class="bg-[#0f0f0f] h-11">
          <td colspan="4" class="py-3 px-4 text-[#a1a1a1]">No activity logged yet.</td>
        </tr>
      `;
    } else {
      tbody.innerHTML = systemLogs.map((item) => {
        const lvlColor = item.level === 'ERROR'
          ? 'bg-[#ff6467]/20 text-[#ff6467]'
          : (item.level === 'OK' ? 'bg-[#10b981]/20 text-[#a4f4cf]' : 'bg-[#155dfc]/20 text-[#50a2ff]');
        return `
          <tr class="bg-[#0f0f0f] hover:bg-[#171717] h-10">
            <td class="py-2 px-4 text-[#a1a1a1] whitespace-nowrap">${item.time}</td>
            <td class="py-2 px-3"><span class="px-2 py-0.5 rounded text-[10px] font-semibold ${lvlColor}">${item.level}</span></td>
            <td class="py-2 px-3 text-[#50a2ff] whitespace-nowrap">${item.source}</td>
            <td class="py-2 px-4 text-[#f5f5f5] break-all">${item.message}</td>
          </tr>
        `;
      }).join('');
    }
  }

  if (modalPreview) {
    const recent = systemLogs.slice(0, 8);
    if (recent.length > 0) {
      modalPreview.innerHTML = recent.map((item) => {
        const c = item.level === 'ERROR' ? 'text-[#ff6467]' : (item.level === 'OK' ? 'text-[#a4f4cf]' : 'text-[#50a2ff]');
        return `<div><span class="text-[#a1a1a1]">[${item.time}]</span> <span class="${c} font-semibold">${item.level}</span> <span class="text-[#d9d9d9]">${item.source}:</span> ${item.message}</div>`;
      }).join('');
    }
  }
}

// Render the 3-Column Cloudflare Home Quick Lists (Stocks You Own | Biggest Sales | Next on Wish List)
function renderCloudflareQuickColumns(rows) {
  const ownedCol = document.getElementById('quick-col-owned');
  const salesCol = document.getElementById('quick-col-sales');
  const wishCol = document.getElementById('quick-col-wishlist');

  if (ownedCol) {
    const ownedRows = rows.filter((r) => r.ownedShares > 0).slice(0, 3);
    ownedCol.innerHTML = ownedRows.map((r) => {
      const pnlPct = r.pnlPct || 0;
      const color = pnlPct >= 0 ? 'text-[#a4f4cf]' : 'text-[#ff6467]';
      return `
        <button data-detail-sym="${r.symbol}" class="btn-open-company-detail w-full py-2.5 px-1 flex items-center justify-between hover:bg-[#171717] transition text-left">
          <span class="flex items-center gap-2 min-w-0">
            <span class="w-2 h-2 rounded-full bg-[#5491f6] shrink-0"></span>
            <span class="font-medium text-[#f5f5f5]">${r.symbol}</span>
            <span class="text-xs text-[#a1a1a1] truncate">${r.profile.name}</span>
          </span>
          <span class="text-xs font-medium ${color} shrink-0 ml-2">${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}% ›</span>
        </button>
      `;
    }).join('');
  }

  if (salesCol) {
    const topSales = rows.filter((r) => r.isRedToday).slice(0, 3);
    salesCol.innerHTML = topSales.map((r) => `
      <button data-detail-sym="${r.symbol}" class="btn-open-company-detail w-full py-2.5 px-1 flex items-center justify-between hover:bg-[#171717] transition text-left">
        <span class="flex items-center gap-2 min-w-0">
          <span class="w-2 h-2 rounded-full bg-[#ff6467] shrink-0"></span>
          <span class="font-medium text-[#f5f5f5]">${r.symbol}</span>
          <span class="text-xs text-[#a1a1a1] truncate">$${r.price.toFixed(2)}</span>
        </span>
        <span class="text-xs font-medium text-[#ff6467] shrink-0 ml-2">${r.dayPct.toFixed(1)}% ›</span>
      </button>
    `).join('');
  }

  if (wishCol) {
    const unowned = rows.filter((r) => r.ownedShares === 0).slice(0, 3);
    wishCol.innerHTML = unowned.map((r) => `
      <button data-detail-sym="${r.symbol}" class="btn-open-company-detail w-full py-2.5 px-1 flex items-center justify-between hover:bg-[#171717] transition text-left">
        <span class="flex items-center gap-2 min-w-0">
          <span class="w-2 h-2 rounded-full bg-[#a1a1a1] shrink-0"></span>
          <span class="font-medium text-[#f5f5f5]">${r.symbol}</span>
          <span class="text-xs text-[#a1a1a1] truncate">${r.profile.name}</span>
        </span>
        <span class="text-xs text-[#50a2ff] shrink-0 ml-2">$${r.price.toFixed(2)} ›</span>
      </button>
    `).join('');
  }
}

function renderKPIsAndPortfolio() {
  const tbody = document.getElementById('portfolio-tbody');
  let totalBasis = 0;
  let totalMktVal = 0;
  const harvestHtml = [];

  const { boughtToday, soldToday } = getSameDayTradeLocks();
  const blockDayTrades = state.blockDayTrades !== false;
  const entries = Object.entries(state.holdings);
  const rowsHtml = entries.map(([sym, pos]) => {
    const profile = COMPANY_PROFILES[sym] || { name: sym, plainWhatTheyDo: pos.role };
    const q = state.quotes[sym] || { activePrice: pos.avgCost };
    const livePrice = Number(q.activePrice || pos.avgCost);
    const basis = pos.shares * pos.avgCost;
    const mktVal = pos.shares * livePrice;
    const pnl = mktVal - basis;
    const pnlPct = basis > 0 ? (pnl / basis) * 100 : 0;

    totalBasis += basis;
    totalMktVal += mktVal;

    const harvestTarget = state.rules.harvestGainPct;
    const progressPct = Math.max(0, Math.min(100, (pnlPct / harvestTarget) * 100));
    const sellTargetPrice = pos.avgCost * (1 + harvestTarget / 100);

    const lockedForOvernightHold = blockDayTrades && boughtToday.has(sym);
    if (pnlPct >= harvestTarget) {
      if (lockedForOvernightHold) {
        harvestHtml.push(`
          <div class="kumo-card p-3 flex items-center justify-between">
            <div>
              <strong class="text-[#f5f5f5] text-xs">${sym} (${profile.name})</strong>
              <span class="block text-[#50a2ff] text-[11px]">Up +${pnlPct.toFixed(1)}% — Bought today! Hold overnight &amp; sell tomorrow to avoid Day-Trade flag.</span>
            </div>
            <span class="px-2 py-0.5 rounded bg-[#171717] ring-1 ring-[#5491f6] text-[#50a2ff] font-semibold text-[11px]">Hold Overnight</span>
          </div>
        `);
      } else {
        harvestHtml.push(`
          <div class="kumo-card p-3 flex items-center justify-between">
            <div>
              <strong class="text-[#f5f5f5] text-xs">${sym} (${profile.name})</strong>
              <span class="block text-[#a4f4cf] text-[11px]">Up +${pnlPct.toFixed(1)}% ($${livePrice.toFixed(2)} vs $${pos.avgCost.toFixed(2)} paid) — Held overnight (0 day-trade risk)</span>
            </div>
            <span class="px-2 py-0.5 rounded bg-[#155dfc] text-white font-semibold text-[11px]">Sell 1 sh</span>
          </div>
        `);
      }
    }

    const pnlColor = pnl >= 0 ? 'text-[#a4f4cf]' : 'text-[#ff6467]';
    const sign = pnl >= 0 ? '+' : '';

    return `
      <tr class="bg-[#0f0f0f] hover:bg-[#171717] transition h-12">
        <td class="py-2.5 px-4">
          <button data-detail-sym="${sym}" class="btn-open-company-detail text-left hover:underline">
            <strong class="text-[#50a2ff] font-medium block">${sym}</strong>
            <span class="text-xs text-[#a1a1a1]">${profile.name}</span>
          </button>
        </td>
        <td class="py-2.5 px-3 text-[#d9d9d9] text-xs max-w-xs">${pos.role || profile.plainWhatTheyDo}</td>
        <td class="py-2.5 px-3 text-right font-medium text-[#f5f5f5]">${pos.shares}</td>
        <td class="py-2.5 px-3 text-right text-[#a1a1a1]">$${pos.avgCost.toFixed(pos.avgCost < 1 ? 4 : 2)}</td>
        <td class="py-2.5 px-3 text-right font-medium text-[#f5f5f5]">$${livePrice.toFixed(livePrice < 1 ? 4 : 2)}</td>
        <td class="py-2.5 px-3 text-right font-medium text-[#f5f5f5]">$${mktVal.toFixed(2)}</td>
        <td class="py-2.5 px-3 text-right font-medium ${pnlColor}">${sign}$${pnl.toFixed(2)} (${sign}${pnlPct.toFixed(1)}%)</td>
        <td class="py-2.5 px-4">
          <div class="w-full bg-[#171717] h-2 rounded-full overflow-hidden ring-1 ring-[#262626]">
            <div class="bg-[#5491f6] h-full transition-all" style="width:${progressPct.toFixed(0)}%"></div>
          </div>
          <span class="text-[11px] text-[#a1a1a1] block mt-1">
            Sell 1 sh at <strong class="text-[#f5f5f5]">$${sellTargetPrice.toFixed(2)}</strong> (+${harvestTarget}%)
            ${lockedForOvernightHold ? '<span class="text-[#50a2ff] ml-1">&bull; Hold overnight (Anti-PDT)</span>' : ''}
          </span>
        </td>
      </tr>
    `;
  });

  if (tbody) tbody.innerHTML = rowsHtml.join('');

  const netPnl = totalMktVal - totalBasis;
  const netPnlPct = totalBasis > 0 ? (netPnl / totalBasis) * 100 : 0;
  const totalAcct = totalMktVal + state.cash;
  const s = netPnl >= 0 ? '+' : '';
  const pnlFormatted = `${s}$${netPnl.toFixed(2)} (${s}${netPnlPct.toFixed(1)}%)`;
  const pnlClass = `font-semibold ${netPnl >= 0 ? 'text-[#a4f4cf]' : 'text-[#ff6467]'}`;

  // Update Header & Right Rail KPIs
  ['kpi-account-val', 'rail-account-val'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = `$${totalAcct.toFixed(2)}`;
  });
  ['kpi-unrealized-pnl', 'rail-unrealized-pnl'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = pnlFormatted;
      el.className = pnlClass;
    }
  });
  ['kpi-cash-val', 'rail-cash-val'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = `$${state.cash.toFixed(2)}`;
  });

  const elBtnAcctCash = document.getElementById('btn-use-acct-cash');
  if (elBtnAcctCash) elBtnAcctCash.textContent = `Use Schwab cash ($${state.cash.toFixed(2)})`;

  const pdtLocksEl = document.getElementById('pdt-today-locks');
  const pdtBadgeEl = document.getElementById('pdt-status-badge');
  if (pdtBadgeEl) {
    pdtBadgeEl.textContent = blockDayTrades ? '0 / 3 Used (Protected)' : 'Shield Paused';
    pdtBadgeEl.className = blockDayTrades
      ? 'px-2 py-0.5 rounded bg-[#10b981]/20 text-[#a4f4cf] font-semibold text-[11px]'
      : 'px-2 py-0.5 rounded bg-[#ff6467]/20 text-[#ff6467] font-semibold text-[11px]';
  }
  if (pdtLocksEl) {
    const lockedBought = Array.from(boughtToday);
    const lockedSold = Array.from(soldToday);
    if (lockedBought.length === 0 && lockedSold.length === 0) {
      pdtLocksEl.innerHTML = '✓ <strong class="text-[#a4f4cf]">0 trades today</strong> — All 7 holdings were bought on prior days and are 100% safe to sell anytime without counting as a day trade.';
    } else {
      const parts = [];
      if (lockedBought.length > 0) parts.push(`Bought today (locked from selling until tomorrow): <strong class="text-[#50a2ff]">${lockedBought.join(', ')}</strong>`);
      if (lockedSold.length > 0) parts.push(`Sold today (locked from re-buying until tomorrow): <strong class="text-[#ff6467]">${lockedSold.join(', ')}</strong>`);
      pdtLocksEl.innerHTML = parts.join('<br/>');
    }
  }

  const harvestBox = document.getElementById('harvest-alerts-box');
  if (harvestBox) {
    if (harvestHtml.length > 0) {
      harvestBox.innerHTML = harvestHtml.join('');
    } else {
      let bestSym = 'IREN';
      let bestPct = -999;
      let bestTargetDollar = 23.84;
      entries.forEach(([sym, pos]) => {
        const lp = Number(state.quotes[sym]?.activePrice || pos.avgCost);
        const pct = ((lp - pos.avgCost) / pos.avgCost) * 100;
        if (pct > bestPct) {
          bestPct = pct;
          bestSym = sym;
          bestTargetDollar = pos.avgCost * (1 + state.rules.harvestGainPct / 100);
        }
      });
      harvestBox.innerHTML = `
        <div class="kumo-card p-3.5 space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="font-medium text-[#f5f5f5]">Hold patiently today</span>
            <span class="kumo-badge-dashed">0 ready</span>
          </div>
          <p class="text-[#a1a1a1] text-xs leading-relaxed">
            Closest to +${state.rules.harvestGainPct}% goal: <strong class="text-[#f5f5f5]">${bestSym}</strong>
            (<span class="${bestPct >= 0 ? 'text-[#a4f4cf]' : 'text-[#ff6467]'} font-medium">${bestPct >= 0 ? '+' : ''}${bestPct.toFixed(1)}%</span>;
            sell alert triggers at <strong class="text-[#50a2ff]">$${bestTargetDollar.toFixed(2)}</strong>).
          </p>
        </div>
      `;
    }
  }
}

function renderBasketAndRadar(rows) {
  const budgetInput = document.getElementById('input-deploy-cash');
  const budget = Number(budgetInput?.value || state.deployBudget || 50);
  const { basket, remaining } = computeRedDayBasket(rows, budget);

  const container = document.getElementById('basket-recommendations');
  const spent = Number((budget - remaining).toFixed(2));

  const redCount = rows.filter((r) => r.isRedToday).length;
  const badge = document.getElementById('regime-badge');
  if (badge) badge.textContent = `${redCount} of ${rows.length} on sale today`;

  const sideRedCount = document.getElementById('sidebar-red-count');
  if (sideRedCount) sideRedCount.textContent = String(redCount);

  const countPill = document.getElementById('basket-count-pill');
  if (countPill) countPill.textContent = String(basket.length);

  if (container) {
    if (basket.length === 0) {
      container.innerHTML = `
        <div class="p-5 text-center text-xs text-[#a1a1a1]">
          No stocks meet your Red-Day rules inside a <strong class="text-[#f5f5f5]">$${budget.toFixed(2)}</strong> budget right now.
          Enter <strong class="text-[#50a2ff]">$25</strong> or <strong class="text-[#50a2ff]">$50</strong> above to preview your next deposit!
        </div>
      `;
    } else {
      container.innerHTML = basket.map((item) => `
        <div class="p-4 hover:bg-[#171717]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition">
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 rounded-lg bg-[#155dfc]/15 ring-1 ring-[#5491f6]/40 flex items-center justify-center shrink-0 mt-0.5">
              <span class="text-xs font-semibold text-[#50a2ff]">${item.symbol.slice(0, 2)}</span>
            </div>
            <div class="space-y-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-semibold text-sm text-[#f5f5f5]">Buy ${item.displayQty} of ${item.symbol}</span>
                <span class="text-xs text-[#a1a1a1]">— ${item.companyName}</span>
                <span class="kumo-badge-dashed text-[#50a2ff]">${item.howToBuy}</span>
              </div>
              <p class="text-xs text-[#d9d9d9] leading-relaxed">${item.plainWhy}</p>
            </div>
          </div>
          <div class="sm:text-right shrink-0 pl-11 sm:pl-0">
            <span class="font-semibold text-base text-[#f5f5f5] block">$${item.cost.toFixed(2)}</span>
            <span class="text-[11px] text-[#a1a1a1]">Est. cost</span>
          </div>
        </div>
      `).join('');
    }
  }

  document.getElementById('basket-total-spent').textContent = `$${spent.toFixed(2)}`;
  document.getElementById('basket-leftover').textContent = `$${remaining.toFixed(2)}`;
}

// Render 2-Column Cloudflare Kumo Analytics & Story Cards
function renderCompanyCards(rows) {
  const grid = document.getElementById('company-cards-grid');
  if (!grid) return;

  const q = searchQuery.trim().toLowerCase();
  const filtered = rows.filter((r) => {
    if (activeScanFilter === 'red' && !r.isRedToday) return false;
    if (activeScanFilter === 'owned' && r.ownedShares === 0) return false;
    if (activeScanFilter === 'landlord' && !r.bucket.includes('Bucket 1')) return false;
    if (activeScanFilter === 'slice' && !r.sp500Slice) return false;
    if (activeScanFilter === 'sweeper' && !r.bucket.includes('Bucket 3')) return false;
    if (q) {
      const hay = `${r.symbol} ${r.profile.name} ${r.profile.plainWhatTheyDo} ${r.profile.whyWeLikeIt} ${r.profile.categoryLabel}`.toLowerCase();
      return hay.includes(q);
    }
    return true;
  });

  grid.innerHTML = filtered.map((r) => {
    const dayColor = r.dayPct < 0 ? 'text-[#ff6467]' : 'text-[#a4f4cf]';
    const dayArrow = r.dayPct < 0 ? '↘' : '↗';
    const svgChart = buildPriceAndProjectionSvg(r.closes, r.price, r.target12m, r.isRedToday);

    const ownedPill = r.ownedShares > 0
      ? `<span class="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#10b981]/15 text-[#a4f4cf] ring-1 ring-[#10b981]/40">
           Own ${r.ownedShares} sh ($${r.avgCost.toFixed(2)} avg)
         </span>`
      : `<span class="kumo-badge-dashed">Not owned yet</span>`;

    return `
      <article class="kumo-card p-5 flex flex-col justify-between space-y-4 hover:ring-[#404040] transition">
        <!-- Top Kumo Metric Header: Category Label + Big Price + Trend -->
        <div class="space-y-2">
          <div class="flex items-start justify-between gap-2">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-medium text-[#a1a1a1]">${r.profile.categoryLabel}</span>
                ${ownedPill}
              </div>
              <h3 class="text-base font-semibold text-[#f5f5f5] mt-1">
                <span class="text-[#50a2ff] mr-1">${r.symbol}</span> &bull; ${r.profile.name}
              </h3>
            </div>
            <span class="px-2.5 py-0.5 rounded-full text-[11px] shrink-0 ${r.verdictBadgeClass}">
              ${r.verdictText}
            </span>
          </div>

          <!-- Big 24px Metric Price + Trend (Exact Cloudflare Analytics Card Header!) -->
          <div class="flex items-baseline gap-2.5 pt-1">
            <span class="text-2xl font-semibold text-[#f5f5f5] leading-7">
              $${r.price.toFixed(r.price < 1 ? 4 : 2)}
            </span>
            <span class="text-xs font-medium ${dayColor}">
              ${dayArrow} ${Math.abs(r.dayPct).toFixed(2)}% today
            </span>
            <span class="text-xs text-[#a1a1a1] ml-auto">
              1-Yr Target: <strong class="text-[#a4f4cf]">$${r.target12m.toFixed(2)} (+${r.upsidePct.toFixed(0)}%)</strong>
            </span>
          </div>
        </div>

        <!-- Company Size & Annual Revenue Strip -->
        <div class="grid grid-cols-2 gap-3 p-3 rounded-lg bg-[#0b0b0b] ring-1 ring-[#262626] text-xs">
          <div>
            <span class="text-[11px] text-[#a1a1a1] block">Company Size</span>
            <span class="font-medium text-[#f5f5f5]">${r.profile.marketCap}</span>
          </div>
          <div>
            <span class="text-[11px] text-[#a1a1a1] block">Yearly Revenue</span>
            <span class="font-medium text-[#50a2ff]">${r.profile.annualRevenue}</span>
          </div>
        </div>

        <!-- Plain-English Story: What They Do & Why We Consider It -->
        <div class="space-y-2 text-[13px] leading-relaxed text-[#d9d9d9]">
          <p><strong class="text-[#f5f5f5] font-medium">What they do:</strong> ${r.profile.plainWhatTheyDo}</p>
          <p><strong class="text-[#50a2ff] font-medium">Why we want it:</strong> ${r.profile.whyWeLikeIt}</p>
        </div>

        <!-- Kumo Sparkline + 12-Month Target Projection Chart -->
        <div class="pt-1">
          <div class="flex items-center justify-between text-[11px] text-[#a1a1a1] mb-1">
            <span>30-day price history (High: $${r.high20d.toFixed(2)})</span>
            <span class="text-[#a4f4cf]">Dashed = 12-mo target ($${r.target12m.toFixed(2)})</span>
          </div>
          ${svgChart}
        </div>

        <!-- Card Footer -->
        <div class="pt-2 border-t border-[#262626] flex items-center justify-between text-xs">
          <span class="text-[#a1a1a1]">
            Bargain rating: <strong class="text-[#f5f5f5]">${r.dipScore} / 100</strong>
          </span>
          <button data-detail-sym="${r.symbol}" class="btn-open-company-detail text-[#50a2ff] hover:underline font-medium">
            View full story &amp; outlook &rarr;
          </button>
        </div>
      </article>
    `;
  }).join('');

  bindCompanyDetailButtons();
}

// Render Tab 2: Cloudflare DNS-Style Table with Inline Expandable Company Drawer!
function renderCompaniesTableWithInlineDrawer(rows) {
  const tbody = document.getElementById('companies-table-tbody');
  if (!tbody) return;

  const html = [];
  rows.forEach((r) => {
    const isExpanded = expandedTableSymbol === r.symbol;
    const dayColor = r.dayPct < 0 ? 'text-[#ff6467]' : 'text-[#a4f4cf]';
    const daySign = r.dayPct > 0 ? '+' : '';

    html.push(`
      <tr class="bg-[#0f0f0f] hover:bg-[#171717] transition h-11">
        <td class="py-2.5 px-4">
          <div class="flex items-center gap-2">
            <strong class="text-[#f5f5f5] font-medium">${r.symbol}</strong>
            <span class="text-xs text-[#a1a1a1]">${r.profile.name}</span>
          </div>
        </td>
        <td class="py-2.5 px-3 text-xs text-[#d9d9d9]">${r.profile.categoryLabel}</td>
        <td class="py-2.5 px-3 text-xs text-[#a1a1a1]">${r.profile.marketCap} &bull; ${r.profile.annualRevenue}</td>
        <td class="py-2.5 px-3 text-right">
          <span class="font-medium text-[#f5f5f5]">$${r.price.toFixed(r.price < 1 ? 4 : 2)}</span>
          <span class="text-xs ${dayColor} ml-1">(${daySign}${r.dayPct.toFixed(1)}%)</span>
        </td>
        <td class="py-2.5 px-3 text-right font-medium text-[#a4f4cf]">
          $${r.target12m.toFixed(2)} (+${r.upsidePct.toFixed(0)}%)
        </td>
        <td class="py-2.5 px-3">
          <span class="px-2 py-0.5 rounded-full text-[11px] ${r.verdictBadgeClass}">${r.verdictText}</span>
        </td>
        <td class="py-2.5 px-4 text-right">
          <button data-expand-sym="${r.symbol}" class="btn-toggle-inline-drawer text-[#50a2ff] hover:underline font-medium text-xs">
            ${isExpanded ? 'Close' : 'Details'}
          </button>
        </td>
      </tr>
    `);

    if (isExpanded) {
      const chartSvg = buildPriceAndProjectionSvg(r.closes, r.price, r.target12m, r.isRedToday, 105);
      html.push(`
        <tr class="bg-[#0b0b0b]">
          <td colspan="7" class="p-5 border-b border-[#333333]">
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div class="lg:col-span-7 space-y-3 text-xs leading-relaxed">
                <div class="flex items-center gap-2">
                  <span class="text-base font-semibold text-[#f5f5f5]">${r.symbol} — ${r.profile.name}</span>
                  <span class="kumo-badge-dashed text-[#50a2ff]">${r.profile.marketCap}</span>
                </div>
                <p class="text-[#d9d9d9]"><strong class="text-[#f5f5f5]">What they do:</strong> ${r.profile.plainWhatTheyDo}</p>
                <p class="text-[#d9d9d9]"><strong class="text-[#50a2ff]">Why we're considering it:</strong> ${r.profile.whyWeLikeIt}</p>
                <p class="text-[#a1a1a1]"><strong class="text-[#a4f4cf]">12-Month Projection:</strong> ${r.profile.projectionNote}</p>
              </div>
              <div class="lg:col-span-5 kumo-card p-4">
                <div class="flex items-center justify-between text-[11px] text-[#a1a1a1] mb-1">
                  <span>30-Day Price Curve</span>
                  <span class="text-[#a4f4cf]">1-Yr Target: $${r.target12m.toFixed(2)} (+${r.upsidePct.toFixed(0)}%)</span>
                </div>
                ${chartSvg}
              </div>
            </div>
          </td>
        </tr>
      `);
    }
  });

  tbody.innerHTML = html.join('');

  document.querySelectorAll('.btn-toggle-inline-drawer').forEach((btn) => {
    btn.addEventListener('click', () => {
      const sym = btn.getAttribute('data-expand-sym');
      expandedTableSymbol = expandedTableSymbol === sym ? '' : sym;
      renderCompaniesTableWithInlineDrawer(latestComputedRows);
    });
  });
}

function bindCompanyDetailButtons() {
  document.querySelectorAll('.btn-open-company-detail').forEach((btn) => {
    btn.onclick = () => {
      const sym = btn.getAttribute('data-detail-sym');
      openCompanyDetailModal(sym);
    };
  });
}

function openCompanyDetailModal(symbol) {
  const row = latestComputedRows.find((r) => r.symbol === symbol);
  if (!row) return;

  const modal = document.getElementById('modal-company-detail');
  const header = document.getElementById('detail-modal-header');
  const body = document.getElementById('detail-modal-body');
  if (!modal || !header || !body) return;

  const dayColor = row.dayPct < 0 ? 'text-[#ff6467]' : 'text-[#a4f4cf]';
  const daySign = row.dayPct > 0 ? '+' : '';
  const largeSvg = buildPriceAndProjectionSvg(row.closes, row.price, row.target12m, row.isRedToday, 120);

  header.innerHTML = `
    <div class="flex items-center gap-2">
      <span class="text-xl font-semibold text-[#f5f5f5]">${row.symbol}</span>
      <span class="kumo-badge-dashed text-[#50a2ff]">${row.profile.categoryLabel}</span>
      <span class="px-2.5 py-0.5 rounded-full text-[11px] ${row.verdictBadgeClass}">${row.verdictText}</span>
    </div>
    <h3 class="text-sm font-medium text-[#a1a1a1] mt-1">${row.profile.name}</h3>
  `;

  body.innerHTML = `
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 kumo-card-recessed p-4 text-xs">
      <div>
        <span class="text-[#a1a1a1] block">Current Price</span>
        <span class="text-lg font-semibold text-[#f5f5f5]">$${row.price.toFixed(row.price < 1 ? 4 : 2)}</span>
        <span class="${dayColor} font-medium ml-1">(${daySign}${row.dayPct.toFixed(2)}%)</span>
      </div>
      <div>
        <span class="text-[#a1a1a1] block">Company Size</span>
        <span class="text-sm font-medium text-[#f5f5f5]">${row.profile.marketCap}</span>
      </div>
      <div>
        <span class="text-[#a1a1a1] block">Yearly Revenue</span>
        <span class="text-sm font-medium text-[#50a2ff]">${row.profile.annualRevenue}</span>
      </div>
    </div>

    <div class="kumo-card-recessed p-4 space-y-2">
      <div class="flex items-center justify-between text-xs">
        <span class="text-[#d9d9d9] font-medium">30-Day Price History &amp; 12-Month Analyst Target ($${row.target12m.toFixed(2)})</span>
        <span class="text-[#a4f4cf] font-semibold">Projected Upside: +${row.upsidePct.toFixed(0)}%</span>
      </div>
      ${largeSvg}
      <p class="text-xs text-[#d9d9d9] pt-1">
        <strong class="text-[#f5f5f5]">12-Month Projection:</strong> ${row.profile.projectionNote}
      </p>
    </div>

    <div class="space-y-3 text-xs sm:text-[13px] leading-relaxed kumo-card-recessed p-4 text-[#d9d9d9]">
      <p><strong class="text-[#f5f5f5]">What This Company Does:</strong><br/>${row.profile.plainWhatTheyDo}</p>
      <p><strong class="text-[#50a2ff]">Why We Consider It on Red Days:</strong><br/>${row.profile.whyWeLikeIt}</p>
      <p><strong class="text-[#a4f4cf]">How We Buy It on Charles Schwab:</strong><br/>
        ${row.sp500Slice
          ? `Because 1 full share of ${row.symbol} costs $${row.price.toFixed(2)}, we buy it using a <strong>$5.00 Charles Schwab Stock Slice</strong> whenever it drops ${Math.abs(state.rules.sliceRedTriggerPct)}% or more.`
          : `We buy <strong>1 whole share ($${row.price.toFixed(2)})</strong> using a safe Limit Order whenever ${row.symbol} drops on a red day.`
        }
      </p>
    </div>
  `;

  modal.classList.remove('hidden');
}

function renderStrategyStudio() {
  document.getElementById('rule-landlord-drop').value = state.rules.landlordRedTriggerPct;
  document.getElementById('rule-slice-drop').value = state.rules.sliceRedTriggerPct;
  document.getElementById('rule-rsi-buy').value = state.rules.oversoldRsiThreshold;
  document.getElementById('rule-zscore-buy').value = state.rules.zScoreTrigger;
  document.getElementById('rule-harvest-pct').value = state.rules.harvestGainPct;
  document.getElementById('rule-max-weight').value = state.rules.maxSingleStockWeightPct;

  const listEl = document.getElementById('studio-watchlist-items');
  if (!listEl) return;

  listEl.innerHTML = state.watchlist.map((item) => {
    const prof = COMPANY_PROFILES[item.symbol];
    return `
      <div class="py-2.5 px-1 flex items-center justify-between">
        <div>
          <strong class="text-[#f5f5f5] font-medium">${item.symbol}</strong>
          <span class="text-[#a1a1a1] ml-1.5">${prof ? prof.name : item.role}</span>
        </div>
        <button data-remove-sym="${item.symbol}" class="btn-remove-ticker text-[#ff6467] hover:underline text-xs">
          Remove
        </button>
      </div>
    `;
  }).join('');

  document.querySelectorAll('.btn-remove-ticker').forEach((btn) => {
    btn.addEventListener('click', () => {
      const sym = btn.getAttribute('data-remove-sym');
      state.watchlist = state.watchlist.filter((w) => w.symbol !== sym);
      saveState();
      renderAll();
      showToast(`Removed ${sym} from watchlist.`);
    });
  });
}

function renderJournal() {
  const tbody = document.getElementById('journal-tbody');
  if (!tbody) return;
  tbody.innerHTML = state.journal.map((j) => {
    const isBuy = String(j.action).toUpperCase().includes('BUY') || String(j.action).toUpperCase().includes('BOUGHT');
    const prof = COMPANY_PROFILES[j.symbol];
    return `
      <tr class="bg-[#0f0f0f] hover:bg-[#171717] h-11">
        <td class="py-2.5 px-4 text-[#a1a1a1] text-xs">${j.date}</td>
        <td class="py-2.5 px-3">
          <span class="px-2 py-0.5 rounded text-[11px] font-medium ${isBuy ? 'bg-[#155dfc]/20 text-[#50a2ff]' : 'bg-[#10b981]/20 text-[#a4f4cf]'}">
            ${isBuy ? 'BOUGHT' : 'SOLD'}
          </span>
        </td>
        <td class="py-2.5 px-3">
          <strong class="text-[#f5f5f5] font-medium">${j.symbol}</strong>
          <span class="block text-[11px] text-[#a1a1a1]">${prof ? prof.name : ''}</span>
        </td>
        <td class="py-2.5 px-3 text-right font-medium text-[#f5f5f5]">${j.qty}</td>
        <td class="py-2.5 px-3 text-right text-[#d9d9d9]">$${Number(j.price).toFixed(j.price < 1 ? 4 : 2)}</td>
        <td class="py-2.5 px-3 text-right font-medium text-[#f5f5f5]">$${Number(j.total).toFixed(2)}</td>
        <td class="py-2.5 px-3 font-mono text-xs text-[#a1a1a1]">${j.orderId}</td>
        <td class="py-2.5 px-4 text-[#d9d9d9] text-xs">${j.note}</td>
      </tr>
    `;
  }).join('');
}

function renderAuthStatus() {
  const dot = document.getElementById('token-status-dot');
  const txt = document.getElementById('token-status-text');
  const badge = document.getElementById('modal-token-badge');
  const now = Date.now();
  const exp = state.schwabAuth?.refreshTokenExpiresAt || 0;

  if (exp > now) {
    const daysLeft = ((exp - now) / (1000 * 60 * 60 * 24)).toFixed(1);
    if (dot) dot.className = 'w-2 h-2 rounded-full bg-[#10b981]';
    if (txt) txt.textContent = `Schwab (${daysLeft}d)`;
    if (badge) {
      badge.textContent = `Active — ${daysLeft} Days Remaining`;
      badge.className = 'px-2 py-0.5 rounded bg-[#10b981]/20 text-[#a4f4cf] font-semibold';
    }
  }
}

async function fetchYahooSymbolClientFallback(symbol) {
  const target = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=3mo&interval=1d&includePrePost=true`;
  const urls = [
    `https://corsproxy.io/?${encodeURIComponent(target)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`
  ];
  for (const u of urls) {
    try {
      const r = await fetch(u);
      if (!r.ok) continue;
      const data = await r.json();
      const result = data?.chart?.result?.[0];
      if (!result) continue;
      const meta = result.meta || {};
      const closes = (result.indicators?.quote?.[0]?.close || []).filter((c) => typeof c === 'number' && !Number.isNaN(c));
      const regularPrice = meta.regularMarketPrice ?? closes[closes.length - 1];
      const activePrice = meta.postMarketPrice || meta.preMarketPrice || regularPrice;
      const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? closes[closes.length - 2];
      return { closes, activePrice, prevClose };
    } catch {
      // next
    }
  }
  return null;
}

async function refreshLiveQuotes() {
  const symbols = state.watchlist.map((w) => w.symbol).join(',');
  try {
    const res = await fetch(`/api/market-scan?symbols=${encodeURIComponent(symbols)}`);
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('application/json')) {
      throw new Error('Fallback to client fetch');
    }
    const data = await res.json();
    if (data.ok && data.quotes) {
      Object.entries(data.quotes).forEach(([sym, q]) => {
        const stats = computeStatsFromCloses(q.closes, q.activePrice, q.prevClose);
        if (stats) state.quotes[sym] = stats;
      });
      saveState();
      renderAll();
      document.getElementById('last-scan-time').textContent = `Updated ${new Date().toLocaleTimeString()}`;
      showToast('Updated live stock prices & charts');
      return;
    }
  } catch {
    try {
      const symList = state.watchlist.map((w) => w.symbol);
      const settled = await Promise.allSettled(symList.map((s) => fetchYahooSymbolClientFallback(s)));
      let updatedCount = 0;
      settled.forEach((item, idx) => {
        if (item.status === 'fulfilled' && item.value) {
          const sym = symList[idx];
          const stats = computeStatsFromCloses(item.value.closes, item.value.activePrice, item.value.prevClose);
          if (stats) {
            state.quotes[sym] = stats;
            updatedCount++;
          }
        }
      });
      if (updatedCount > 0) {
        saveState();
        renderAll();
        document.getElementById('last-scan-time').textContent = `Updated ${new Date().toLocaleTimeString()}`;
        return;
      }
    } catch {
      // keep baseline
    }
  }
}

function initEvents() {
  // Primary Tab Buttons
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      switchTab(btn.getAttribute('data-tab'));
    });
  });

  // Jump Links in 3-Column Header
  document.querySelectorAll('[data-jump-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      switchTab(btn.getAttribute('data-jump-tab'));
    });
  });

  // Sidebar Filter Shortcuts
  document.querySelectorAll('.sidebar-filter-link').forEach((btn) => {
    btn.addEventListener('click', () => {
      const f = btn.getAttribute('data-quick-filter');
      activeScanFilter = f;
      switchTab('radar');
      document.querySelectorAll('.scan-filter-btn').forEach((b) => {
        b.className = b.getAttribute('data-filter') === activeScanFilter
          ? 'scan-filter-btn px-2.5 py-1 rounded-md font-medium bg-[#262626] text-[#f5f5f5]'
          : 'scan-filter-btn px-2.5 py-1 rounded-md font-medium text-[#a1a1a1] hover:text-[#f5f5f5]';
      });
      renderCompanyCards(latestComputedRows);
      document.getElementById('company-cards-grid')?.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // Segmented Filter Pill Buttons
  document.querySelectorAll('.scan-filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeScanFilter = btn.getAttribute('data-filter');
      document.querySelectorAll('.scan-filter-btn').forEach((b) => {
        b.className = b.getAttribute('data-filter') === activeScanFilter
          ? 'scan-filter-btn px-2.5 py-1 rounded-md font-medium bg-[#262626] text-[#f5f5f5]'
          : 'scan-filter-btn px-2.5 py-1 rounded-md font-medium text-[#a1a1a1] hover:text-[#f5f5f5]';
      });
      renderCompanyCards(latestComputedRows);
    });
  });

  // Search Bars (Home Search + Sidebar Quick Search)
  ['home-company-search', 'sidebar-quick-search'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', (e) => {
      searchQuery = e.target.value || '';
      renderCompanyCards(latestComputedRows);
    });
  });

  // Right-Rail Anti-PDT Day-Trade Shield Toggle Switch
  document.getElementById('toggle-pdt-switch')?.addEventListener('click', (e) => {
    state.blockDayTrades = state.blockDayTrades === false ? true : false;
    const btn = e.currentTarget;
    btn.className = state.blockDayTrades
      ? 'w-9 h-5 rounded-full bg-[#155dfc] flex items-center justify-end px-0.5 shrink-0 mt-0.5 transition'
      : 'w-9 h-5 rounded-full bg-[#404040] flex items-center justify-start px-0.5 shrink-0 mt-0.5 transition';
    saveState();
    renderAll();
    showToast(state.blockDayTrades ? 'Anti-Day-Trade Shield enabled (0 day trades allowed)' : 'Anti-Day-Trade Shield paused');
  });

  // Right-Rail Unsettled Cash Toggle Switch
  document.getElementById('toggle-unsettled-switch')?.addEventListener('click', (e) => {
    state.unsettledCash = !state.unsettledCash;
    const btn = e.currentTarget;
    btn.className = state.unsettledCash
      ? 'w-9 h-5 rounded-full bg-[#155dfc] flex items-center justify-end px-0.5 shrink-0 mt-0.5 transition'
      : 'w-9 h-5 rounded-full bg-[#404040] flex items-center justify-start px-0.5 shrink-0 mt-0.5 transition';
    const sel = document.getElementById('select-cash-settlement');
    if (sel) sel.value = state.unsettledCash ? 'unsettled' : 'settled';
    saveState();
    renderAll();
  });

  // Close Company Detail Modal
  document.getElementById('btn-close-detail')?.addEventListener('click', () => {
    document.getElementById('modal-company-detail')?.classList.add('hidden');
  });
  document.getElementById('modal-company-detail')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-company-detail') e.target.classList.add('hidden');
  });

  // Shopping Cart Controls
  document.getElementById('input-deploy-cash')?.addEventListener('input', (e) => {
    state.deployBudget = Number(e.target.value || 0);
    saveState();
    renderBasketAndRadar(latestComputedRows);
  });

  document.getElementById('btn-use-acct-cash')?.addEventListener('click', () => {
    const inp = document.getElementById('input-deploy-cash');
    inp.value = state.cash.toFixed(2);
    state.deployBudget = state.cash;
    saveState();
    renderBasketAndRadar(latestComputedRows);
  });

  document.getElementById('select-cash-settlement')?.addEventListener('change', (e) => {
    state.unsettledCash = e.target.value === 'unsettled';
    saveState();
    renderAll();
  });

  document.getElementById('select-order-session')?.addEventListener('change', (e) => {
    state.sessionTiming = e.target.value;
    saveState();
    renderBasketAndRadar(latestComputedRows);
  });

  // Copy Shopping List
  document.getElementById('btn-copy-ticket')?.addEventListener('click', () => {
    if (!latestBasket.length) {
      showToast('No items in shopping list right now.');
      return;
    }
    const lines = latestBasket.map(
      (b) => `BUY ${b.displayQty} of ${b.symbol} (${b.companyName}) — Limit $${b.limitPrice.toFixed(b.limitPrice < 1 ? 4 : 2)} (~$${b.cost.toFixed(2)})`
    );
    navigator.clipboard?.writeText(lines.join('\n'));
    showToast('Copied shopping list to clipboard');
  });

  // Mark as Bought
  document.getElementById('btn-simulate-fill')?.addEventListener('click', () => {
    if (!latestBasket.length) {
      showToast('No items in shopping cart.');
      return;
    }
    latestBasket.forEach((ord) => {
      if (ord.isSlice) return;
      const prof = COMPANY_PROFILES[ord.symbol];
      const existing = state.holdings[ord.symbol] || {
        shares: 0,
        avgCost: 0,
        role: prof ? prof.plainWhatTheyDo : ord.plainWhy
      };
      const newShares = existing.shares + ord.qty;
      const newAvg = (existing.shares * existing.avgCost + ord.cost) / newShares;
      state.holdings[ord.symbol] = {
        shares: newShares,
        avgCost: Number(newAvg.toFixed(4)),
        role: existing.role
      };
      state.journal.unshift({
        date: new Date().toLocaleDateString(),
        action: 'BOUGHT',
        symbol: ord.symbol,
        qty: ord.qty,
        price: ord.limitPrice,
        total: ord.cost,
        orderId: `SAVED-${Math.floor(100000 + Math.random() * 900000)}`,
        note: ord.plainWhy
      });
    });
    saveState();
    renderAll();
    showToast('Added shares to What I Own & Receipts');
  });

  // Buy via Schwab API
  document.getElementById('btn-execute-schwab')?.addEventListener('click', async () => {
    if (!state.schwabAuth?.accessToken) {
      document.getElementById('modal-auth')?.classList.remove('hidden');
      showToast('Sign in with Charles Schwab first to place orders.');
      return;
    }
    try {
      const res = await fetch('/api/schwab-trade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.schwabAuth.accessToken}`
        },
        body: JSON.stringify({
          accountHash: state.schwabAuth.accountHash,
          orders: latestBasket.filter((b) => !b.isSlice),
          unsettledCash: state.unsettledCash,
          blockDayTrades: state.blockDayTrades !== false
        })
      });
      const data = await res.json();
      if (data.ok) showToast('Submitted limit orders to Charles Schwab');
      else showToast(`Schwab: ${data.error}`);
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  });

  // Save Game Plan Rules
  document.getElementById('btn-save-rules')?.addEventListener('click', () => {
    state.rules = {
      landlordRedTriggerPct: Number(document.getElementById('rule-landlord-drop').value),
      sliceRedTriggerPct: Number(document.getElementById('rule-slice-drop').value),
      oversoldRsiThreshold: Number(document.getElementById('rule-rsi-buy').value || 40),
      zScoreTrigger: Number(document.getElementById('rule-zscore-buy').value || -1.25),
      harvestGainPct: Number(document.getElementById('rule-harvest-pct').value),
      maxSingleStockWeightPct: Number(document.getElementById('rule-max-weight').value || 25)
    };
    saveState();
    renderAll();
    showToast('Saved game plan settings');
  });

  document.getElementById('btn-reset-rules')?.addEventListener('click', () => {
    state.rules = structuredClone(DEFAULT_STATE.rules);
    state.watchlist = structuredClone(DEFAULT_STATE.watchlist);
    saveState();
    renderAll();
    showToast('Reset settings to defaults');
  });

  document.getElementById('btn-export-json')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `redday_ai_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  });

  document.getElementById('form-add-ticker')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const sym = document.getElementById('new-ticker-sym').value.trim().toUpperCase();
    const bucket = document.getElementById('new-ticker-bucket').value;
    const role = document.getElementById('new-ticker-role').value.trim();
    if (!sym) return;
    if (!state.watchlist.some((w) => w.symbol === sym)) {
      state.watchlist.push({
        symbol: sym,
        bucket,
        role,
        sp500Slice: bucket.includes('S&P 500')
      });
      saveState();
      renderAll();
      refreshLiveQuotes();
      showToast(`Added ${sym} to watchlist`);
    }
    e.target.reset();
  });

  // Auth Modal
  ['btn-open-auth', 'btn-rail-open-auth'].forEach((id) => {
    document.getElementById(id)?.addEventListener('click', () => {
      document.getElementById('modal-auth')?.classList.remove('hidden');
    });
  });
  document.getElementById('btn-close-auth')?.addEventListener('click', () => {
    document.getElementById('modal-auth')?.classList.add('hidden');
  });

  document.getElementById('btn-modal-view-all-logs')?.addEventListener('click', () => {
    document.getElementById('modal-auth')?.classList.add('hidden');
    switchTab('logs');
  });

  document.getElementById('btn-clear-logs')?.addEventListener('click', () => {
    systemLogs = [];
    localStorage.removeItem(LOG_STORAGE_KEY);
    renderSystemLogs();
    showToast('Cleared system logs');
  });

  document.getElementById('btn-test-schwab-health')?.addEventListener('click', async () => {
    addSystemLog('INFO', '/api/schwab-auth', 'Testing serverless function health & Netlify env vars...');
    try {
      const res = await fetch('/api/schwab-auth');
      const data = await safeReadJson(res, '/api/schwab-auth');
      addSystemLog(
        data.ok ? 'OK' : 'ERROR',
        '/api/schwab-auth',
        `HTTP ${res.status} — credentialsConfigured=${data.credentialsConfigured}, callbackUrl=${data.callbackUrl}`
      );
      showToast(data.credentialsConfigured ? 'Schwab serverless function healthy & credentials ready!' : 'Function active, check credentials');
    } catch (err) {
      showToast(`Health check failed: ${err.message}`);
    }
  });

  document.getElementById('btn-launch-schwab-oauth')?.addEventListener('click', async () => {
    const customKey = document.getElementById('input-schwab-key')?.value.trim() || 'dDGOfkYTf73UDWetFsYXgAZ70jGkO9dYNCryLW0AtFSG8vVY';
    const callback = (document.getElementById('select-oauth-callback')?.value || 'https://redday-ai-schwab.netlify.app').trim().replace(/\/+$/, '');
    const oauthUrl = `https://api.schwabapi.com/v1/oauth/authorize?response_type=code&client_id=${encodeURIComponent(customKey)}&redirect_uri=${encodeURIComponent(callback)}`;
    addSystemLog('INFO', 'OAuth Launch', `Redirecting to Charles Schwab OAuth (callback=${callback})`);
    // Navigate in the same tab so returning to https://redday-ai-schwab.netlify.app/?code=... exchanges automatically!
    window.location.href = oauthUrl;
  });

  document.getElementById('btn-exchange-code')?.addEventListener('click', async () => {
    const redirectUrlOrCode = document.getElementById('input-redirect-url')?.value.trim();
    const clientId = document.getElementById('input-schwab-key')?.value.trim();
    const clientSecret = document.getElementById('input-schwab-secret')?.value.trim();
    const callbackUrl = (document.getElementById('select-oauth-callback')?.value || 'https://redday-ai-schwab.netlify.app').trim().replace(/\/+$/, '');
    const feedback = document.getElementById('auth-modal-feedback');

    if (!redirectUrlOrCode) {
      showToast('Paste the redirect URL or authorization code first.');
      return;
    }

    addSystemLog('INFO', '/api/schwab-auth', `Exchanging authorization code (callbackUrl=${callbackUrl})...`);
    try {
      const res = await fetch('/api/schwab-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'exchange', redirectUrlOrCode, clientId, clientSecret, callbackUrl })
      });
      const data = await safeReadJson(res, '/api/schwab-auth');
      if (data.ok) {
        state.schwabAuth = {
          ...state.schwabAuth,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          accessTokenExpiresAt: data.accessTokenExpiresAt,
          refreshTokenExpiresAt: data.refreshTokenExpiresAt
        };
        saveState();
        renderAuthStatus();
        addSystemLog('OK', '/api/schwab-auth', '7-day Charles Schwab refresh token + 30-min access token activated!');
        if (feedback) {
          feedback.textContent = '✓ Connected! Your 7-day Charles Schwab token is active. Syncing live positions...';
          feedback.className = 'text-xs text-[#a4f4cf] p-2.5 rounded-lg bg-[#10b981]/15 ring-1 ring-[#10b981]/40';
          feedback.classList.remove('hidden');
        }
        showToast('Charles Schwab connected for 7 days!');
        document.getElementById('btn-sync-schwab-positions')?.click();
      } else {
        const errMsg = data.error || 'Token exchange failed';
        addSystemLog('ERROR', '/api/schwab-auth', `HTTP ${res.status}: ${errMsg}`);
        if (feedback) {
          feedback.textContent = `Schwab OAuth Error: ${errMsg}`;
          feedback.className = 'text-xs text-[#ff6467] p-2.5 rounded-lg bg-[#ff6467]/15 ring-1 ring-[#ff6467]/40';
          feedback.classList.remove('hidden');
        }
      }
    } catch (err) {
      if (feedback) {
        feedback.textContent = err.message;
        feedback.className = 'text-xs text-[#ff6467] p-2.5 rounded-lg bg-[#ff6467]/15 ring-1 ring-[#ff6467]/40';
        feedback.classList.remove('hidden');
      }
    }
  });

  document.getElementById('btn-sync-schwab-positions')?.addEventListener('click', async () => {
    if (!state.schwabAuth?.accessToken) {
      document.getElementById('modal-auth')?.classList.remove('hidden');
      showToast('Sign in with Charles Schwab first to sync positions.');
      return;
    }
    addSystemLog('INFO', '/api/schwab-trade', 'Fetching live account balances & positions from Charles Schwab...');
    try {
      const res = await fetch('/api/schwab-trade', {
        headers: { Authorization: `Bearer ${state.schwabAuth.accessToken}` }
      });
      const data = await safeReadJson(res, '/api/schwab-trade');
      if (data.ok) {
        const firstHash = data.accountNumbers?.[0]?.hashValue;
        if (firstHash) state.schwabAuth.accountHash = firstHash;
        if (Array.isArray(data.todayOrders)) state.todayOrders = data.todayOrders;
        const secAcct = data.accounts?.[0]?.securitiesAccount;
        if (secAcct?.currentBalances?.cashAvailableForTrading !== undefined) {
          state.cash = Number(secAcct.currentBalances.cashAvailableForTrading);
        }
        let posCount = 0;
        if (Array.isArray(secAcct?.positions)) {
          secAcct.positions.forEach((p) => {
            const sym = p.instrument?.symbol;
            const qty = Number(p.longQuantity || 0);
            const avg = Number(p.averagePrice || 0);
            if (sym && qty > 0) {
              posCount++;
              const prof = COMPANY_PROFILES[sym];
              state.holdings[sym] = {
                shares: qty,
                avgCost: avg,
                role: state.holdings[sym]?.role || (prof ? prof.plainWhatTheyDo : 'Synced from Charles Schwab')
              };
            }
          });
        }
        saveState();
        renderAll();
        addSystemLog('OK', '/api/schwab-trade', `Synced ${posCount} positions and $${state.cash.toFixed(2)} cash from Charles Schwab.`);
        showToast('Synced live positions & cash from Charles Schwab');
      } else {
        addSystemLog('ERROR', '/api/schwab-trade', data.error || 'Position sync failed');
        showToast(`Schwab: ${data.error}`);
      }
    } catch (err) {
      addSystemLog('ERROR', '/api/schwab-trade', err.message);
      showToast(`Sync error: ${err.message}`);
    }
  });

  document.getElementById('btn-refresh-quotes')?.addEventListener('click', refreshLiveQuotes);
}

async function checkAutoOAuthCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (!code) {
    // If someone visits redday-ai-schwab.netlify.app directly without ?code=, redirect to fintechnav.com/stock
    if (window.location.hostname === 'redday-ai-schwab.netlify.app') {
      window.location.replace('https://fintechnav.com/stock');
    }
    return;
  }

  // If Charles Schwab redirected back to redday-ai-schwab.netlify.app/?code=..., immediately relay to https://fintechnav.com/stock?code=...
  if (window.location.hostname === 'redday-ai-schwab.netlify.app') {
    window.location.replace(`https://fintechnav.com/stock${window.location.search}`);
    return;
  }

  const fullRedirectUrl = window.location.href;
  const callbackUsed = document.getElementById('select-oauth-callback')?.value || 'https://redday-ai-schwab.netlify.app';
  const cleanCallbackOrigin = callbackUsed.replace(/\/+$/, '');
  window.history.replaceState({}, document.title, window.location.pathname);

  const inp = document.getElementById('input-redirect-url');
  if (inp) inp.value = fullRedirectUrl;

  addSystemLog('INFO', 'OAuth Callback', `Detected ?code= in return URL from Charles Schwab. Exchanging for 7-day token...`);
  showToast('Completing Charles Schwab sign-in...');

  try {
    const res = await fetch('/api/schwab-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'exchange',
        redirectUrlOrCode: fullRedirectUrl,
        callbackUrl: cleanCallbackOrigin
      })
    });
    const data = await safeReadJson(res, '/api/schwab-auth');
    if (data.ok) {
      state.schwabAuth = {
        ...state.schwabAuth,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        accessTokenExpiresAt: data.accessTokenExpiresAt,
        refreshTokenExpiresAt: data.refreshTokenExpiresAt
      };
      saveState();
      renderAuthStatus();
      addSystemLog('OK', 'OAuth Callback', '7-day Charles Schwab token activated automatically! Syncing positions...');
      showToast('Connected to Charles Schwab for 7 days!');
      document.getElementById('btn-sync-schwab-positions')?.click();
    } else {
      addSystemLog('ERROR', 'OAuth Callback', data.error || 'Automatic token exchange failed');
      const feedback = document.getElementById('auth-modal-feedback');
      if (feedback) {
        feedback.textContent = `Schwab OAuth Error: ${data.error || 'Token exchange failed'}`;
        feedback.className = 'text-xs text-[#ff6467] p-2.5 rounded-lg bg-[#ff6467]/15 ring-1 ring-[#ff6467]/40';
        feedback.classList.remove('hidden');
      }
      document.getElementById('modal-auth')?.classList.remove('hidden');
    }
  } catch (err) {
    addSystemLog('ERROR', 'OAuth Callback', err.message);
    document.getElementById('modal-auth')?.classList.remove('hidden');
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swPath = window.location.pathname.startsWith('/stock') ? '/stock/sw.js' : '/sw.js';
    navigator.serviceWorker.register(swPath).catch(() => {});
  });
}

initLoginGate();
renderAll();
initEvents();
checkAutoOAuthCallback();
refreshLiveQuotes();
