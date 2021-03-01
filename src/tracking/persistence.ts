import utils, { Cookie, console, localStorageSupported, win, JSONStringify, JSONParse, Info } from './utils';
import { DefaultConfig } from './core';
import { EventDataPayload } from './request-batcher';
import { CONFIG } from './config';

export enum RESERVED_PROPERTIES {
  SET_QUEUE_KEY = '__jes',
  SET_ONCE_QUEUE_KEY = '__jeso',
  UNSET_QUEUE_KEY = '__jeus',
  ADD_QUEUE_KEY = '__jea',
  APPEND_QUEUE_KEY = '__jeap',
  REMOVE_QUEUE_KEY = '__jer',
  UNION_QUEUE_KEY = '__jeu',
  PEOPLE_DISTINCT_ID_KEY = '$people_distinct_id',
  ALIAS_ID_KEY = '__alias',
  CAMPAIGN_IDS_KEY = '__cmpns',
  EVENT_TIMERS_KEY = '__timers'
}

export class Persistence {
  props: EventDataPayload;
  name: string;
  disabled?: boolean;
  campaign_params_saved: boolean;
  secure?: boolean;
  crossSite?: boolean;
  crossSubDomain?: boolean;
  cookieDomain?: string;
  default_expiry?: number;
  expire_days?: number;
  storage: Cookie | Storage;

  constructor(config: DefaultConfig) {
    this.props = {};
    this.campaign_params_saved = false;
    if (config.persistence_name) {
      this.name = 'je_' + config.persistence_name;
    } else {
      this.name = 'je_' + config.token + '_hanjelog';
    }
    let storageType = config.persistence;
    if (storageType !== 'cookie' && storageType !== 'localStorage') {
      console.critical('Unknown persistence type ' + storageType + '; falling back to cookie');
      storageType = config.persistence = 'cookie';
    }

    if (storageType === 'localStorage' && localStorageSupported()) {
      this.storage = win.localStorage;
    } else {
      this.storage = new Cookie();
    }
    this.load();
    this.updateConfig(config);
    this.upgrade(config);
    this.save();
  }

  private expireNotificationCampaigns = utils.safeWrap(() => {
    const campaignsShown = this.props[RESERVED_PROPERTIES.CAMPAIGN_IDS_KEY];
    const EXPIRY_TIME = CONFIG.DEBUG ? 60 * 1000 : 60 * 60 * 1000; // 1 minute (config.debug)
    if (!campaignsShown) return;
    for (const campaignId in campaignsShown) {
      if (campaignsShown.hasOwnProperty(campaignId) && utils.now() - campaignsShown[campaignId] > EXPIRY_TIME) {
        delete campaignsShown[campaignId];
      }
    }
    if (utils.isEmptyObject(campaignsShown)) {
      delete this.props[RESERVED_PROPERTIES.CAMPAIGN_IDS_KEY];
    }
  });

  properties() {
    const p: EventDataPayload = {};
    utils.each(this.props, (v: any, k: string) => {
      if (!utils.include(RESERVED_PROPERTIES, k)) {
        p[k] = v;
      }
    });
    return p;
  }

  load() {
    if (this.disabled) return;

    const entry = this.storage.get(this.name);
    if (entry) {
      this.props = utils.extend({}, JSONParse(entry));
    }
  }

  updateConfig(config: DefaultConfig) {
    this.default_expiry = this.expire_days = config.cookie_expiration;
    this.setDisabled(config.disable_persistence);
    this.setCookieDomain(config.cookie_domain);
    this.setCrossSite(config.cross_site_cookie);
    this.setCrossSubDomain(config.cross_sub_domain_cookie);
    this.setSecure(config.secure_cookie);
    config.cookie_domain;
  }

  upgrade(config: DefaultConfig) {
    let upgradeFromOldLib: boolean | string = config.upgrade,
      oldCookieName: string,
      oldCookie: string;
    if (upgradeFromOldLib) {
      oldCookieName = 'je_super_properties';
    }
  }

  save() {
    if (this.disabled) return;
    this.expireNotificationCampaigns();
    this.storage.set(this.name, JSONStringify(this.props), {
      expires: this.expire_days,
      domain: utils.extractDomain(win.location.hostname),
      secure: this.secure
    });
  }

  remove() {
    this.storage.remove(this.name);
  }

  registerOnce(props: Record<string, any>, defaultValue: string = 'None', days?: number): boolean {
    if (utils.isObject(props)) {
      this.expire_days = typeof days === 'undefined' ? this.default_expiry : days;
      utils.each(props, (val: any, prop: string) => {
        if (!this.props.hasOwnProperty(prop) || this.props[prop] === defaultValue) {
          this.props[prop] = val;
        }
      });
      this.save();
      return true;
    }
    return false;
  }

  setDisabled(disabled?: boolean) {
    if (disabled !== this.disabled) {
      this.disabled = disabled;
      if (this.disabled) {
        this.remove();
      } else {
        this.save();
      }
    }
  }

  setSecure(secure?: boolean) {
    if (secure !== this.secure) {
      this.secure = secure;
      this.remove();
      this.save();
    }
  }

  setCookieDomain(cookieDomain?: string) {
    if (cookieDomain !== this.cookieDomain) {
      this.remove();
      this.cookieDomain = cookieDomain;
      this.save();
    }
  }

  setCrossSite(crossSite?: boolean) {
    if (crossSite !== this.crossSite) {
      this.crossSite = crossSite;
      this.remove();
      this.save();
    }
  }

  setCrossSubDomain(crossSubDomain?: boolean) {
    if (crossSubDomain !== this.crossSubDomain) {
      this.crossSubDomain = crossSubDomain;
      this.remove();
      this.save();
    }
  }

  setEventTimer(eventName: string, timestamp: number) {
    const timer = this.props[RESERVED_PROPERTIES.EVENT_TIMERS_KEY] || {};
    timer[eventName] = timestamp;
    this.props[RESERVED_PROPERTIES.EVENT_TIMERS_KEY] = timer;
    this.save();
  }

  removeEventTimer(eventName: string): number {
    const timer = this.props[RESERVED_PROPERTIES.EVENT_TIMERS_KEY] || {};
    const timestamp = timer[eventName];
    if (!utils.isUndefined(timestamp)) {
      delete this.props[RESERVED_PROPERTIES.EVENT_TIMERS_KEY][eventName];
    }
    return timestamp;
  }

  register(props: Record<string, any>, days?: number): boolean {
    if (utils.isObject(props)) {
      this.expire_days = typeof days === 'undefined' ? this.default_expiry : days;
      utils.extend(this.props, props);
      this.save();
      return true;
    }
    return false;
  }

  unregister(prop: string) {
    if (prop in this.props) {
      delete this.props[prop];
      this.save();
    }
  }

  updateCampaignParams() {
    if (!this.campaign_params_saved) {
      this.registerOnce(Info.campaignParams());
      this.campaign_params_saved = true;
    }
  }

  updateSearchKeyword(referrer: string) {
    this.register(Info.searchInfo(referrer));
  }

  updateReferrerInfo(referrer: string) {
    this.registerOnce({
      '$initial_referrer': referrer || '$direct',
      '$initial_referring_domain': Info.referringDomain(referrer) || '$direct'
    }, '');
  }

  getReferrerInfo() {
    return utils.stripEmptyProperties({
      '$initial_referrer': this.props['$initial_referrer'],
      '$initial_referring_domain': this.props['$initial_referring_domain']
    });
  }
}

