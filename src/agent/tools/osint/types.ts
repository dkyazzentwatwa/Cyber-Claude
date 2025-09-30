/**
 * OSINT Tool Types and Interfaces
 */

export interface OSINTResult {
  success: boolean;
  data: any;
  source: string;
  timestamp: Date;
  error?: string;
}

export interface DomainInfo {
  domain: string;
  registrar?: string;
  registrationDate?: string;
  expirationDate?: string;
  nameServers?: string[];
  registrantOrg?: string;
  registrantCountry?: string;
  status?: string[];
  dnssec?: string;
}

export interface DNSRecord {
  type: string;
  name: string;
  value: string;
  ttl?: number;
}

export interface DNSReconResult {
  domain: string;
  records: {
    A?: string[];
    AAAA?: string[];
    MX?: string[];
    NS?: string[];
    TXT?: string[];
    CNAME?: string[];
    SOA?: any;
  };
  reverseIPs?: { [ip: string]: string[] };
}

export interface Subdomain {
  subdomain: string;
  ip?: string[];
  source: string;
  discovered: Date;
}

export interface SubdomainResult {
  domain: string;
  subdomains: Subdomain[];
  total: number;
  sources: string[];
}

export interface EmailResult {
  email: string;
  source: string;
  context?: string;
  verified?: boolean;
}

export interface EmailHarvestResult {
  domain: string;
  emails: EmailResult[];
  total: number;
  sources: string[];
}

export interface SocialProfile {
  platform: string;
  username: string;
  url: string;
  exists: boolean;
  lastChecked: Date;
}

export interface UsernameEnumResult {
  username: string;
  profiles: SocialProfile[];
  totalFound: number;
  totalChecked: number;
}

export interface BreachData {
  name: string;
  title: string;
  domain: string;
  breachDate: string;
  addedDate: string;
  modifiedDate: string;
  pwnCount: number;
  description: string;
  dataClasses: string[];
  isVerified: boolean;
  isFabricated: boolean;
  isSensitive: boolean;
  isRetired: boolean;
  isSpamList: boolean;
}

export interface BreachCheckResult {
  email: string;
  breached: boolean;
  breaches: BreachData[];
  totalBreaches: number;
  pasteCount: number;
}

export interface WaybackSnapshot {
  timestamp: string;
  url: string;
  status: string;
  digest: string;
}

export interface WaybackResult {
  url: string;
  snapshots: WaybackSnapshot[];
  totalSnapshots: number;
  firstSnapshot?: string;
  lastSnapshot?: string;
}

export interface TechnologyInfo {
  name: string;
  version?: string;
  categories: string[];
  confidence: number;
  icon?: string;
  website?: string;
}

export interface TechnologyDetectionResult {
  url: string;
  technologies: TechnologyInfo[];
  server?: string;
  framework?: string[];
  cms?: string[];
  analytics?: string[];
  security?: string[];
}

export interface IPGeolocation {
  ip: string;
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  isp?: string;
  org?: string;
  asn?: string;
}

export interface ReverseIPResult {
  ip: string;
  domains: string[];
  total: number;
  source: string;
}

export interface OSINTReconResult {
  target: string;
  scanType: 'quick' | 'full' | 'domain' | 'person' | 'custom';
  startTime: Date;
  endTime: Date;
  results: {
    whois?: DomainInfo;
    dns?: DNSReconResult;
    subdomains?: SubdomainResult;
    emails?: EmailHarvestResult;
    breaches?: BreachCheckResult[];
    technologies?: TechnologyDetectionResult;
    wayback?: WaybackResult;
    geolocation?: IPGeolocation[];
    reverseIP?: ReverseIPResult[];
    usernames?: UsernameEnumResult;
  };
  summary: {
    totalFindings: number;
    riskScore: number;
    dataExposure: string[];
    recommendations: string[];
  };
}