/**
 * Username Enumeration Tool
 * Checks username availability across social media and platforms
 * No API keys required - uses HTTP checks
 */

import axios from 'axios';
import { SocialProfile, UsernameEnumResult } from './types.js';
import { logger } from '../../../utils/logger.js';

interface Platform {
  name: string;
  url: string;
  checkType: 'status' | 'content' | 'redirect';
  successIndicator?: string;
  failIndicator?: string;
}

export class UsernameEnum {
  private platforms: Platform[] = [
    {
      name: 'GitHub',
      url: 'https://github.com/{}',
      checkType: 'status',
    },
    {
      name: 'Twitter/X',
      url: 'https://twitter.com/{}',
      checkType: 'status',
    },
    {
      name: 'Instagram',
      url: 'https://www.instagram.com/{}',
      checkType: 'status',
    },
    {
      name: 'Facebook',
      url: 'https://www.facebook.com/{}',
      checkType: 'status',
    },
    {
      name: 'LinkedIn',
      url: 'https://www.linkedin.com/in/{}',
      checkType: 'status',
    },
    {
      name: 'Reddit',
      url: 'https://www.reddit.com/user/{}',
      checkType: 'status',
    },
    {
      name: 'YouTube',
      url: 'https://www.youtube.com/@{}',
      checkType: 'status',
    },
    {
      name: 'TikTok',
      url: 'https://www.tiktok.com/@{}',
      checkType: 'status',
    },
    {
      name: 'Medium',
      url: 'https://medium.com/@{}',
      checkType: 'status',
    },
    {
      name: 'Pinterest',
      url: 'https://www.pinterest.com/{}',
      checkType: 'status',
    },
    {
      name: 'Tumblr',
      url: 'https://{}.tumblr.com',
      checkType: 'status',
    },
    {
      name: 'Twitch',
      url: 'https://www.twitch.tv/{}',
      checkType: 'status',
    },
    {
      name: 'Steam',
      url: 'https://steamcommunity.com/id/{}',
      checkType: 'status',
    },
    {
      name: 'Spotify',
      url: 'https://open.spotify.com/user/{}',
      checkType: 'status',
    },
    {
      name: 'GitLab',
      url: 'https://gitlab.com/{}',
      checkType: 'status',
    },
    {
      name: 'Bitbucket',
      url: 'https://bitbucket.org/{}',
      checkType: 'status',
    },
    {
      name: 'Docker Hub',
      url: 'https://hub.docker.com/u/{}',
      checkType: 'status',
    },
    {
      name: 'npm',
      url: 'https://www.npmjs.com/~{}',
      checkType: 'status',
    },
    {
      name: 'PyPI',
      url: 'https://pypi.org/user/{}',
      checkType: 'status',
    },
    {
      name: 'HackerNews',
      url: 'https://news.ycombinator.com/user?id={}',
      checkType: 'status',
    },
    {
      name: 'Dev.to',
      url: 'https://dev.to/{}',
      checkType: 'status',
    },
    {
      name: 'Stack Overflow',
      url: 'https://stackoverflow.com/users/{}',
      checkType: 'status',
    },
    {
      name: 'Patreon',
      url: 'https://www.patreon.com/{}',
      checkType: 'status',
    },
    {
      name: 'Telegram',
      url: 'https://t.me/{}',
      checkType: 'status',
    },
    {
      name: 'Discord',
      url: 'https://discord.com/users/{}',
      checkType: 'status',
    },
    {
      name: 'Keybase',
      url: 'https://keybase.io/{}',
      checkType: 'status',
    },
    {
      name: 'Mastodon',
      url: 'https://mastodon.social/@{}',
      checkType: 'status',
    },
    {
      name: 'Flickr',
      url: 'https://www.flickr.com/people/{}',
      checkType: 'status',
    },
    {
      name: 'Vimeo',
      url: 'https://vimeo.com/{}',
      checkType: 'status',
    },
    {
      name: 'SoundCloud',
      url: 'https://soundcloud.com/{}',
      checkType: 'status',
    },
    {
      name: 'CodePen',
      url: 'https://codepen.io/{}',
      checkType: 'status',
    },
    {
      name: 'Behance',
      url: 'https://www.behance.net/{}',
      checkType: 'status',
    },
    {
      name: 'Dribbble',
      url: 'https://dribbble.com/{}',
      checkType: 'status',
    },
    {
      name: 'Gravatar',
      url: 'https://gravatar.com/{}',
      checkType: 'status',
    },
    {
      name: 'About.me',
      url: 'https://about.me/{}',
      checkType: 'status',
    },
  ];

  /**
   * Enumerate username across all platforms
   */
  async enumerate(username: string): Promise<UsernameEnumResult> {
    logger.info(`Starting username enumeration for: ${username}`);

    const profiles: SocialProfile[] = [];
    const batchSize = 5; // Check 5 platforms at a time to avoid overwhelming

    for (let i = 0; i < this.platforms.length; i += batchSize) {
      const batch = this.platforms.slice(i, i + batchSize);

      const results = await Promise.all(
        batch.map((platform) => this.checkPlatform(username, platform))
      );

      profiles.push(...results);

      // Small delay between batches to be respectful
      if (i + batchSize < this.platforms.length) {
        await this.delay(500);
      }
    }

    const found = profiles.filter((p) => p.exists);

    const result: UsernameEnumResult = {
      username,
      profiles: profiles.sort((a, b) => {
        // Sort found profiles first
        if (a.exists && !b.exists) return -1;
        if (!a.exists && b.exists) return 1;
        return a.platform.localeCompare(b.platform);
      }),
      totalFound: found.length,
      totalChecked: profiles.length,
    };

    logger.info(
      `Username enumeration completed: ${result.totalFound}/${result.totalChecked} profiles found`
    );
    return result;
  }

  /**
   * Check if username exists on a specific platform
   */
  private async checkPlatform(
    username: string,
    platform: Platform
  ): Promise<SocialProfile> {
    const url = platform.url.replace('{}', username);

    try {
      const response = await axios.get(url, {
        timeout: 5000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        maxRedirects: 5,
        validateStatus: (status) => status < 500, // Don't throw on 404
      });

      let exists = false;

      if (platform.checkType === 'status') {
        exists = response.status === 200;
      } else if (platform.checkType === 'content') {
        if (platform.successIndicator) {
          exists = response.data.includes(platform.successIndicator);
        }
        if (platform.failIndicator) {
          exists = !response.data.includes(platform.failIndicator);
        }
      } else if (platform.checkType === 'redirect') {
        exists = response.status === 200 && !response.request.path?.includes('404');
      }

      logger.debug(
        `${platform.name}: ${exists ? 'FOUND' : 'NOT FOUND'} - ${url}`
      );

      return {
        platform: platform.name,
        username,
        url,
        exists,
        lastChecked: new Date(),
      };
    } catch (error) {
      logger.debug(`${platform.name}: ERROR - ${url}`);
      return {
        platform: platform.name,
        username,
        url,
        exists: false,
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Check username on specific platforms only
   */
  async checkSpecificPlatforms(
    username: string,
    platformNames: string[]
  ): Promise<SocialProfile[]> {
    const selectedPlatforms = this.platforms.filter((p) =>
      platformNames.includes(p.name)
    );

    const results = await Promise.all(
      selectedPlatforms.map((platform) => this.checkPlatform(username, platform))
    );

    return results;
  }

  /**
   * Get list of available platforms
   */
  getAvailablePlatforms(): string[] {
    return this.platforms.map((p) => p.name);
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generate username variations
   */
  generateVariations(username: string): string[] {
    const variations = new Set<string>();

    // Original
    variations.add(username);

    // Lowercase
    variations.add(username.toLowerCase());

    // Uppercase
    variations.add(username.toUpperCase());

    // With underscores
    variations.add(username.replace(/[-.]/g, '_'));

    // With hyphens
    variations.add(username.replace(/[_.]/g, '-'));

    // Without special chars
    variations.add(username.replace(/[^a-zA-Z0-9]/g, ''));

    // With numbers
    ['1', '2', '3', '123', '00', '01'].forEach((num) => {
      variations.add(`${username}${num}`);
      variations.add(`${username}_${num}`);
      variations.add(`${username}-${num}`);
    });

    return Array.from(variations).filter((v) => v.length >= 3);
  }

  /**
   * Check if username follows common patterns
   */
  analyzeUsername(username: string): {
    likelyRealName: boolean;
    hasNumbers: boolean;
    hasSpecialChars: boolean;
    length: number;
    pattern: string;
  } {
    return {
      likelyRealName:
        /^[a-z]+[._-]?[a-z]+$/i.test(username) && !username.includes('123'),
      hasNumbers: /\d/.test(username),
      hasSpecialChars: /[^a-zA-Z0-9]/.test(username),
      length: username.length,
      pattern: username.replace(/[a-z]/gi, 'a').replace(/\d/g, '0'),
    };
  }
}