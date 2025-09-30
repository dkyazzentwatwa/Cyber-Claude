/**
 * Technology Detection Tool
 * Reverse-engineered Wappalyzer-style technology detection
 * No API key required
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { TechnologyInfo, TechnologyDetectionResult } from './types.js';
import { logger } from '../../../utils/logger.js';

interface TechSignature {
  name: string;
  categories: string[];
  website?: string;
  icon?: string;
  headers?: { [key: string]: string | RegExp };
  html?: (string | RegExp)[];
  scripts?: (string | RegExp)[];
  meta?: { [key: string]: string | RegExp };
  cookies?: { [key: string]: string | RegExp };
  implies?: string[];
}

export class TechDetect {
  private signatures: TechSignature[] = [
    // Web Servers
    {
      name: 'Apache',
      categories: ['Web Servers'],
      website: 'https://httpd.apache.org',
      headers: { server: /apache/i },
    },
    {
      name: 'Nginx',
      categories: ['Web Servers'],
      website: 'https://nginx.org',
      headers: { server: /nginx/i },
    },
    {
      name: 'Microsoft IIS',
      categories: ['Web Servers'],
      website: 'https://www.iis.net',
      headers: { server: /iis/i },
    },
    {
      name: 'LiteSpeed',
      categories: ['Web Servers'],
      website: 'https://www.litespeedtech.com',
      headers: { server: /litespeed/i },
    },
    {
      name: 'Cloudflare',
      categories: ['CDN', 'Security'],
      website: 'https://www.cloudflare.com',
      headers: { server: /cloudflare/i, 'cf-ray': /.+/ },
    },

    // JavaScript Frameworks
    {
      name: 'React',
      categories: ['JavaScript Frameworks'],
      website: 'https://reactjs.org',
      html: [/__react/i, /react-root/i],
      scripts: [/react[\.-]/i],
    },
    {
      name: 'Vue.js',
      categories: ['JavaScript Frameworks'],
      website: 'https://vuejs.org',
      html: [/data-v-[a-f0-9]{8}/i, /__vue__/i],
      scripts: [/vue[\.-]/i],
    },
    {
      name: 'Angular',
      categories: ['JavaScript Frameworks'],
      website: 'https://angular.io',
      html: [/ng-version/i, /<ng-/i],
      scripts: [/@angular/i],
    },
    {
      name: 'jQuery',
      categories: ['JavaScript Libraries'],
      website: 'https://jquery.com',
      scripts: [/jquery[\.-]/i],
    },
    {
      name: 'Next.js',
      categories: ['Web Frameworks'],
      website: 'https://nextjs.org',
      html: [/__next/i, /next-route-announcer/i],
      meta: { generator: /next\.js/i },
    },

    // CMS
    {
      name: 'WordPress',
      categories: ['CMS'],
      website: 'https://wordpress.org',
      html: [/wp-content/i, /wp-includes/i],
      meta: { generator: /wordpress/i },
    },
    {
      name: 'Drupal',
      categories: ['CMS'],
      website: 'https://www.drupal.org',
      html: [/drupal/i],
      meta: { generator: /drupal/i },
      headers: { 'x-drupal-cache': /.+/ },
    },
    {
      name: 'Joomla',
      categories: ['CMS'],
      website: 'https://www.joomla.org',
      html: [/joomla/i],
      meta: { generator: /joomla/i },
    },
    {
      name: 'Shopify',
      categories: ['E-commerce'],
      website: 'https://www.shopify.com',
      html: [/shopify/i, /cdn\.shopify\.com/i],
      headers: { 'x-shopify-stage': /.+/ },
    },
    {
      name: 'Wix',
      categories: ['Website Builders'],
      website: 'https://www.wix.com',
      html: [/wix\.com/i],
      headers: { 'x-wix-request-id': /.+/ },
    },
    {
      name: 'Squarespace',
      categories: ['Website Builders'],
      website: 'https://www.squarespace.com',
      html: [/squarespace/i],
    },

    // Analytics
    {
      name: 'Google Analytics',
      categories: ['Analytics'],
      website: 'https://analytics.google.com',
      scripts: [/google-analytics\.com\/analytics\.js/i, /googletagmanager\.com\/gtag/i],
      html: [/ga\(['"]create['"]/i],
    },
    {
      name: 'Google Tag Manager',
      categories: ['Tag Managers'],
      website: 'https://tagmanager.google.com',
      scripts: [/googletagmanager\.com\/gtm\.js/i],
    },
    {
      name: 'Facebook Pixel',
      categories: ['Analytics'],
      website: 'https://www.facebook.com/business/tools/facebook-pixel',
      scripts: [/connect\.facebook\.net\/.*\/fbevents\.js/i],
    },

    // Web Frameworks
    {
      name: 'Bootstrap',
      categories: ['CSS Frameworks'],
      website: 'https://getbootstrap.com',
      html: [/bootstrap/i],
      scripts: [/bootstrap[\.-]/i],
    },
    {
      name: 'Tailwind CSS',
      categories: ['CSS Frameworks'],
      website: 'https://tailwindcss.com',
      html: [/tailwind/i],
    },
    {
      name: 'Express',
      categories: ['Web Frameworks'],
      website: 'https://expressjs.com',
      headers: { 'x-powered-by': /express/i },
    },
    {
      name: 'Laravel',
      categories: ['Web Frameworks'],
      website: 'https://laravel.com',
      cookies: { laravel_session: /.+/ },
      headers: { 'x-powered-by': /laravel/i },
    },
    {
      name: 'Django',
      categories: ['Web Frameworks'],
      website: 'https://www.djangoproject.com',
      cookies: { csrftoken: /.+/ },
    },
    {
      name: 'Ruby on Rails',
      categories: ['Web Frameworks'],
      website: 'https://rubyonrails.org',
      cookies: { _session_id: /.+/ },
      headers: { 'x-powered-by': /phusion passenger/i },
    },

    // E-commerce
    {
      name: 'WooCommerce',
      categories: ['E-commerce'],
      website: 'https://woocommerce.com',
      html: [/woocommerce/i],
      implies: ['WordPress'],
    },
    {
      name: 'Magento',
      categories: ['E-commerce'],
      website: 'https://magento.com',
      html: [/magento/i],
      cookies: { frontend: /.+/ },
    },

    // CDN
    {
      name: 'Akamai',
      categories: ['CDN'],
      website: 'https://www.akamai.com',
      headers: { 'x-akamai-transformed': /.+/ },
    },
    {
      name: 'Amazon CloudFront',
      categories: ['CDN'],
      website: 'https://aws.amazon.com/cloudfront',
      headers: { 'x-amz-cf-id': /.+/ },
    },
    {
      name: 'Fastly',
      categories: ['CDN'],
      website: 'https://www.fastly.com',
      headers: { 'x-fastly-request-id': /.+/ },
    },

    // Security
    {
      name: 'reCAPTCHA',
      categories: ['Security'],
      website: 'https://www.google.com/recaptcha',
      scripts: [/recaptcha/i],
    },
    {
      name: 'hCaptcha',
      categories: ['Security'],
      website: 'https://www.hcaptcha.com',
      scripts: [/hcaptcha/i],
    },

    // Programming Languages
    {
      name: 'PHP',
      categories: ['Programming Languages'],
      website: 'https://www.php.net',
      headers: { 'x-powered-by': /php/i },
      cookies: { phpsessid: /.+/ },
    },
    {
      name: 'ASP.NET',
      categories: ['Web Frameworks'],
      website: 'https://dotnet.microsoft.com/apps/aspnet',
      headers: { 'x-aspnet-version': /.+/, 'x-powered-by': /asp\.net/i },
      cookies: { 'asp.net_sessionid': /.+/ },
    },
  ];

  /**
   * Detect technologies used by a website
   */
  async detect(url: string): Promise<TechnologyDetectionResult> {
    logger.info(`Detecting technologies for: ${url}`);

    try {
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        maxRedirects: 5,
      });

      const $ = cheerio.load(response.data);
      const headers = response.headers;
      const html = response.data;

      const detectedTechs = new Map<string, TechnologyInfo>();

      // Check each signature
      for (const sig of this.signatures) {
        let confidence = 0;
        let detected = false;

        // Check headers
        if (sig.headers && headers) {
          for (const [headerName, pattern] of Object.entries(sig.headers)) {
            const headerValue = headers[headerName.toLowerCase()];
            if (headerValue && this.matchPattern(headerValue, pattern)) {
              detected = true;
              confidence += 30;
            }
          }
        }

        // Check HTML content
        if (sig.html) {
          for (const pattern of sig.html) {
            if (this.matchPattern(html, pattern)) {
              detected = true;
              confidence += 20;
            }
          }
        }

        // Check scripts
        if (sig.scripts) {
          const scripts: string[] = [];
          $('script').each((_, el) => {
            const src = $(el).attr('src');
            if (src) scripts.push(src);
          });

          for (const pattern of sig.scripts) {
            if (scripts.some((src) => this.matchPattern(src, pattern))) {
              detected = true;
              confidence += 25;
            }
          }
        }

        // Check meta tags
        if (sig.meta) {
          for (const [metaName, pattern] of Object.entries(sig.meta)) {
            const metaContent =
              $(`meta[name="${metaName}"]`).attr('content') ||
              $(`meta[property="${metaName}"]`).attr('content');

            if (metaContent && this.matchPattern(metaContent, pattern)) {
              detected = true;
              confidence += 25;
            }
          }
        }

        // Check cookies
        if (sig.cookies && headers['set-cookie']) {
          const cookies = Array.isArray(headers['set-cookie'])
            ? headers['set-cookie']
            : [headers['set-cookie']];

          for (const [cookieName, pattern] of Object.entries(sig.cookies)) {
            if (
              cookies.some((cookie) =>
                cookie.toLowerCase().includes(cookieName.toLowerCase())
              )
            ) {
              detected = true;
              confidence += 20;
            }
          }
        }

        if (detected) {
          detectedTechs.set(sig.name, {
            name: sig.name,
            categories: sig.categories,
            confidence: Math.min(confidence, 100),
            website: sig.website,
            icon: sig.icon,
          });
        }
      }

      // Process implications (if tech A is detected, tech B is also present)
      const additionalTechs = new Map<string, TechnologyInfo>();
      for (const [techName, techInfo] of detectedTechs) {
        const sig = this.signatures.find((s) => s.name === techName);
        if (sig?.implies) {
          for (const impliedTech of sig.implies) {
            const impliedSig = this.signatures.find((s) => s.name === impliedTech);
            if (impliedSig && !detectedTechs.has(impliedTech)) {
              additionalTechs.set(impliedTech, {
                name: impliedSig.name,
                categories: impliedSig.categories,
                confidence: 70,
                website: impliedSig.website,
              });
            }
          }
        }
      }

      // Merge additional techs
      for (const [name, info] of additionalTechs) {
        detectedTechs.set(name, info);
      }

      // Categorize technologies
      const technologies = Array.from(detectedTechs.values()).sort(
        (a, b) => b.confidence - a.confidence
      );

      const server = headers['server'] as string | undefined;
      const framework = technologies
        .filter((t) => t.categories.includes('Web Frameworks'))
        .map((t) => t.name);
      const cms = technologies
        .filter((t) => t.categories.includes('CMS'))
        .map((t) => t.name);
      const analytics = technologies
        .filter((t) => t.categories.includes('Analytics'))
        .map((t) => t.name);
      const security = technologies
        .filter((t) => t.categories.includes('Security'))
        .map((t) => t.name);

      const result: TechnologyDetectionResult = {
        url,
        technologies,
        server,
        framework: framework.length > 0 ? framework : undefined,
        cms: cms.length > 0 ? cms : undefined,
        analytics: analytics.length > 0 ? analytics : undefined,
        security: security.length > 0 ? security : undefined,
      };

      logger.info(`Detected ${technologies.length} technologies for ${url}`);
      return result;
    } catch (error) {
      logger.error(`Technology detection failed for ${url}:`, error);
      throw new Error(
        `Technology detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Match a pattern (string or regex)
   */
  private matchPattern(value: string, pattern: string | RegExp): boolean {
    if (typeof pattern === 'string') {
      return value.toLowerCase().includes(pattern.toLowerCase());
    } else {
      return pattern.test(value);
    }
  }

  /**
   * Get technologies by category
   */
  getTechnologiesByCategory(
    result: TechnologyDetectionResult,
    category: string
  ): TechnologyInfo[] {
    return result.technologies.filter((t) => t.categories.includes(category));
  }

  /**
   * Analyze security implications
   */
  analyzeSecurityImplications(result: TechnologyDetectionResult): {
    findings: string[];
    risks: string[];
  } {
    const findings: string[] = [];
    const risks: string[] = [];

    // Check for outdated/vulnerable technologies
    const wordpress = result.technologies.find((t) => t.name === 'WordPress');
    if (wordpress) {
      findings.push('WordPress CMS detected');
      risks.push('Ensure WordPress and all plugins are up to date');
    }

    // Check for exposed server information
    if (result.server) {
      findings.push(`Server header exposed: ${result.server}`);
      risks.push('Consider hiding server version information');
    }

    // Check for security tools
    const security = result.technologies.filter((t) =>
      t.categories.includes('Security')
    );
    if (security.length > 0) {
      findings.push(`Security tools detected: ${security.map((s) => s.name).join(', ')}`);
    } else {
      risks.push('No obvious security tools detected (CAPTCHA, WAF, etc.)');
    }

    // Check for CDN
    const cdn = result.technologies.filter((t) => t.categories.includes('CDN'));
    if (cdn.length > 0) {
      findings.push(`CDN in use: ${cdn.map((c) => c.name).join(', ')}`);
    } else {
      risks.push('No CDN detected - consider using a CDN for DDoS protection');
    }

    return { findings, risks };
  }
}