/**
 * Vulnerability Database Types
 * Integration with NVD API and CVE databases
 */

/**
 * CVE identifier and basic info
 */
export interface CVEIdentifier {
  id: string; // e.g., CVE-2024-1234
  assigner?: string;
  status?: string;
}

/**
 * CVSS (Common Vulnerability Scoring System) data
 */
export interface CVSSScore {
  version: '2.0' | '3.0' | '3.1' | '4.0';
  vectorString: string;
  baseScore: number;
  baseSeverity: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  exploitabilityScore?: number;
  impactScore?: number;
}

/**
 * CPE (Common Platform Enumeration) - identifies affected products
 */
export interface CPEMatch {
  criteria: string; // e.g., cpe:2.3:a:vendor:product:version
  matchCriteriaId?: string;
  vulnerable: boolean;
  versionStartIncluding?: string;
  versionStartExcluding?: string;
  versionEndIncluding?: string;
  versionEndExcluding?: string;
}

/**
 * Weakness enumeration (CWE)
 */
export interface CWEReference {
  id: string; // e.g., CWE-79
  name?: string;
}

/**
 * External references
 */
export interface VulnReference {
  url: string;
  source: string;
  tags?: string[];
}

/**
 * Full CVE data from NVD
 */
export interface CVEData {
  id: string;
  sourceIdentifier?: string;
  published: Date;
  lastModified: Date;
  vulnStatus?: string;

  // Description
  descriptions: Array<{
    lang: string;
    value: string;
  }>;

  // CVSS scores
  cvssV2?: CVSSScore;
  cvssV3?: CVSSScore;
  cvssV4?: CVSSScore;

  // Affected products
  configurations?: {
    nodes: Array<{
      operator: string;
      cpeMatch: CPEMatch[];
    }>;
  };

  // Weaknesses
  weaknesses?: CWEReference[];

  // References
  references: VulnReference[];
}

/**
 * Simplified vulnerability info for UI display
 */
export interface VulnerabilityInfo {
  cveId: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  cvssScore?: number;
  cvssVector?: string;
  published?: Date;
  lastModified?: Date;
  affectedVersions?: string[];
  fixedVersion?: string;
  references?: string[];
  cwe?: string[];
}

/**
 * CVE search criteria
 */
export interface CVESearchCriteria {
  // Search by CVE ID
  cveId?: string;

  // Search by product
  keyword?: string; // Keyword search
  cpeName?: string; // CPE name search

  // Filters
  severityMin?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  publishedStartDate?: Date;
  publishedEndDate?: Date;

  // Pagination
  resultsPerPage?: number;
  startIndex?: number;
}

/**
 * CVE search results
 */
export interface CVESearchResults {
  totalResults: number;
  resultsPerPage: number;
  startIndex: number;
  vulnerabilities: CVEData[];
}

/**
 * Cached vulnerability entry
 */
export interface CachedVulnerability {
  cveId: string;
  data: CVEData;
  cachedAt: Date;
  expiresAt: Date;
}

/**
 * Enrichment result
 */
export interface EnrichmentResult {
  original: any; // Original finding/vulnerability
  enriched: boolean;
  cveData?: CVEData[];
  vulnInfo?: VulnerabilityInfo[];
  source: 'cache' | 'api' | 'none';
}

/**
 * Product version information for matching
 */
export interface ProductVersion {
  vendor?: string;
  product: string;
  version: string;
}
