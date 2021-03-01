import utils, {
  userAgent,
  nav,
  doc,
  win,
  console,
  localStorageSupported,
  UUID,
  QueryStringify,
  JSONStringify,
  JSONParse, Info
} from './utils';
import RequestBatcher, { EventDataPayload, RequestOptions } from './request-batcher';
import { CONFIG } from './config';
import { Persistence } from './persistence';

const IDENTITY_FUNC = function IDENTITY_FUNC(x: any) {
  return x;
};
const NOOP_FUNC = function NOOP_FUNC() {
};

let MAIN_LOG: HanjeLog;
const PRIMARY_INSTANCE_NAME = 'HANJELOG';

const USE_XHR = (window.XMLHttpRequest && 'withCredentials' in new XMLHttpRequest());

const ENQUEUE_REQUESTS = !USE_XHR && (userAgent.indexOf('MSIE') === -1) && (userAgent.indexOf('Mozilla') === -1);

// 重命名navigator.sendBeacon，使之可以被minified
let sendBeacon: any = null;
if (nav.sendBeacon) {
  sendBeacon = nav.sendBeacon;
}

export interface DefaultConfig {
  [key: string]: any;

  name?: string;
  token?: string;
  api_host?: string;
  api_method?: 'GET' | 'POST';
  api_transport?: 'XHR' | 'SEND_BEACON';
  app_host?: string;
  cdn?: string;
  cross_site_cookie?: boolean;
  cross_sub_domain_cookie?: boolean;
  persistence?: 'cookie' | 'localStorage';
  persistence_name?: string;
  cookie_domain?: string;
  cookie_name?: string;
  loaded?: () => void;
  store_google?: boolean;
  save_referrer?: boolean;
  test?: boolean;
  verbose?: boolean;
  img?: boolean;
  debug?: boolean;
  track_links_timeout?: number;
  cookie_expiration?: number;
  upgrade?: boolean;
  disable_persistence?: boolean;
  disable_cookie?: boolean;
  secure_cookie?: boolean;
  ip?: boolean;
  property_block_list?: string[];
  xhr_headers?: any;
  ignore_dnt?: boolean;
  batch_requests?: boolean;
  batch_size?: number;
  batch_flush_interval_ms?: number;
  batch_request_timeout_ms?: number;
  batch_auto_start?: boolean;
  hooks?: any;
  callback_fn?: string;
}

interface TrackOptions {
  type: string;
  data: any;
  endpoint: string;
  batcher: RequestBatcher;
  should_send_immediately: boolean;
  send_request_options: RequestOptions;
}

const DEFAULT_CONFIG: DefaultConfig = {
  api_host: 'https://api.hannj.com',
  api_method: 'POST',
  api_transport: 'XHR',
  app_host: 'https://hannj.com',
  cdn: 'https://cdn.hannj.com',
  cross_site_cookie: false,
  cross_sub_domain_cookie: false,
  persistence: 'cookie',
  persistence_name: '',
  cookie_domain: '',
  cookie_name: '',
  loaded: () => {
  },
  store_google: true,
  save_referrer: true,
  test: false,
  verbose: false,
  img: false,
  debug: false,
  track_links_timeout: 300,
  cookie_expiration: 365,  // day
  upgrade: false,
  disable_persistence: false,
  disable_cookie: false,
  secure_cookie: false,
  ip: true,
  property_block_list: [],
  xhr_headers: {},
  ignore_dnt: false,
  batch_requests: false,
  batch_size: 50,
  batch_flush_interval_ms: 5000,
  batch_request_timeout_ms: 90000,
  batch_auto_start: true,
  hooks: {}
};

const DOM_LOADED = false;

const REGISTER_DEFAULTS = {
  persistent: true
};
const optionsForRegister = function (daysOrOptions: any) {
  let options;
  if (utils.isObject(daysOrOptions)) {
    options = daysOrOptions;
  } else if (!utils.isUndefined(daysOrOptions)) {
    options = {
      days: daysOrOptions
    };
  } else {
    options = {};
  }
  return utils.extend({}, REGISTER_DEFAULTS, options);
};

const encodeDataForRequest = function (data: any) {
  const jsonData = JSONStringify(data);
  const encodedData = { ...jsonData };
  return {
    data: encodedData
  };
};

interface NOOP {
  (): void;
}

interface JSC {
  (response?: any): void;

  [key: string]: (response: any) => void;
}

class HanjeLog {
  private cookie: any;
  private persistence?: Persistence;
  private unpersisted_superprops: any;
  private request_batchers?: Record<'events'|any, RequestBatcher>;
  private config?: DefaultConfig;
  private _flag?: {
    disable_all_events: boolean;
    identify_called: boolean;
  };
  private _triggered_notify?: any[];
  private _jsc?: JSC | NOOP;
  private _batch_requests?: boolean;
  private __loaded?: boolean;
  private __dom_loaded_queue?: any[];
  private __request_queue?: any[];
  private __disabled_events?: any[];
  private cached_groups = {};
  private user_decide_check_complete = false;
  private events_tracked_before_user_decide_check_complete: any[] = [];

  init(token: string, config: DefaultConfig, name: string = PRIMARY_INSTANCE_NAME) {
    config = config || {};
    this.__loaded = true;
    this.config = {};
    this._triggered_notify = [];
    const variable_features: any = {};
    const api_host = config.api_host;
    const is_custom_api = !!api_host && !api_host.match(/\.hannj\.com$/);
    if (!('batch_requests' in config) && !is_custom_api) {
      variable_features.batch_requests = true;
    }
    this.setConfig(utils.extend({}, DEFAULT_CONFIG, variable_features, config, {
      name: name,
      token: token,
      callback_fn: (name === PRIMARY_INSTANCE_NAME ? name : PRIMARY_INSTANCE_NAME + '.' + name) + '._jsc'
    }));
    this._jsc = NOOP_FUNC;
    this.__dom_loaded_queue = [];
    this.__request_queue = [];
    this.__disabled_events = [];
    this._flag = {
      disable_all_events: false,
      identify_called: false
    };
    this.request_batchers = {};
    this._batch_requests = this.getConfig('batch_requests');
    if (this._batch_requests) {
      if (!localStorageSupported(undefined, true) || !USE_XHR) {
        this._batch_requests = false;
        console.log('Turning off Hanjelog request-queueing. needs XHR and localStorage support');
      } else {
        this.initBatchers();
        if (sendBeacon && win.addEventListener) {
          win.addEventListener(('unload'), () => {
            if (this.request_batchers && !this.request_batchers.events.stopped) {
              this.request_batchers.events.flush({ unloading: true });
            }
          });
        }
      }
    }
    // TODO: set persistence instance
    this.persistence = this.cookie = {} = new Persistence(this.config);
    this.unpersisted_superprops = {};
    // TODO: The General Data Protection Regulation (GDPR) init
    // this.gdprInit();
    const uuid = UUID();
    console.log(this.getDistinctID());
    if (!this.getDistinctID()) {
      this.registerOnce({
        'distinct_id': uuid,
        '$device_id': uuid
      }, '');
    }
  }

  private sendRequest(url: string, data: any, options: RequestOptions | null, callback: any): boolean {
    let succeeded: boolean = true;
    if (ENQUEUE_REQUESTS) {
      this.__request_queue?.push(arguments);
      return succeeded;
    }
    const DEFAULT_OPTIONS = {
      method: this.getConfig('api_method'),
      transport: this.getConfig('transport'),
      verbose: this.getConfig('verbose')
    };
    let bodyData = null;
    if (!callback && (utils.isFunction(options) || typeof options as string === 'string')) {
      callback = options;
      options = null;
    }
    options = utils.extend(DEFAULT_OPTIONS, options || {});
    if (!USE_XHR) {
      (options as RequestOptions).method = 'GET';
    }
    const use_post = (options as RequestOptions).method === 'POST';
    const use_sendBeacon = sendBeacon && use_post && (options as RequestOptions).transport?.toLowerCase() === 'sendbeacon';
    let verbose_mode = (options as RequestOptions).verbose;
    if (data.verbose) {
      verbose_mode = true;
    }
    if (this.getConfig('test')) {
      data.test = 1;
    }
    if (verbose_mode) {
      data.verbose = 1;
    }
    if (this.getConfig('img')) {
      data.img = 1;
    }
    if (!USE_XHR) {
      if (callback) {
        data.callback = callback;
      } else if (verbose_mode || this.getConfig('test')) {
        data.callback = '(function(){})';
      }
    }
    data.ip = this.getConfig('ip') ? 1 : 0;
    data._ = utils.now().toString();
    if (use_post) {
      bodyData = `data=${encodeURIComponent(data.data)}`;
      delete data.data;
    }
    url += '?' + QueryStringify(data);
    if ('img' in data) {
      const img = doc.createElement('img');
      img.src = url;
      document.body.appendChild(img);
    } else if (use_sendBeacon) {
      try {
        succeeded = sendBeacon(url, bodyData);
      } catch (e) {
        console.error(e);
        succeeded = false;
      }
      try {
        if (callback) {
          callback(succeeded ? 1 : 0);
        }
      } catch (e) {
        console.error(e);
      }
    } else if (USE_XHR) {
      try {
        let startTime: number;
        const useXDomainRequest: boolean = 'XDomainRequest' in win;
        const req: XMLHttpRequest = useXDomainRequest ? new win.XDomainRequest() : new XMLHttpRequest();
        req.open((options as RequestOptions).method as string, url, true);
        if ((options as RequestOptions).timeout_ms && typeof req.timeout != 'undefined') {
          req.timeout = (options as RequestOptions).timeout_ms as number;
          startTime = utils.now();
        }
        req.withCredentials = true;
        if (useXDomainRequest) {
          req.onload = callback || NOOP_FUNC;
          req.onerror = callback || NOOP_FUNC;
          req.onprogress = NOOP_FUNC;
        } else {
          req.onreadystatechange = function () {
            if (req.readyState === 4) {
              if (req.status === 200) {
                if (callback) {
                  if (verbose_mode) {
                    let response: string;
                    try {
                      response = JSONParse(req.responseText);
                    } catch (e) {
                      console.error(e);
                      if ((options as RequestOptions).ignore_json_errors) {
                        response = req.responseText;
                      } else {
                        return;
                      }
                    }
                    callback(response);
                  } else {
                    callback(Number(req.responseText));
                  }
                }
              } else {
                let error;
                if (req.timeout && !req.status && utils.now() - startTime >= req.timeout) {
                  error = 'timeout';
                } else {
                  error = 'Bad HTTP status: ' + req.status + ' ' + req.statusText;
                }
                console.error(error);
                if (callback) {
                  if (verbose_mode) {
                    callback({
                      status: 0,
                      error,
                      xhr_req: req
                    });
                  } else {
                    callback(0);
                  }
                }
              }
            }
          };
        }
        if (use_post) {
          const headers = this.getConfig('xhr_headers');
          headers['Content-Type'] = 'application/x-www-form-urlencoded';
          if (headers && !useXDomainRequest) {
            utils.each(headers, function (headerValue: string, headerName: string) {
              req.setRequestHeader(headerName, headerValue);
            });
          }
          req.send(bodyData);
        } else {
          req.send();
        }
      } catch (e) {
        console.error(e);
        succeeded = false;
      }
    } else {
      const script = doc.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.defer = true;
      script.src = url;
      const s = doc.getElementsByTagName('script')[0];
      s.parentNode && s.parentNode.insertBefore(script, s);
    }
    return succeeded;
  }

  private prepareCallback(callback: any, data: any) {
    if (utils.isUndefined(callback)) {
      return null;
    }
    if (USE_XHR) {
      return (response: any) => callback(response, data);
    } else {
      const jsc = this._jsc;
      const randomizedCallback = '' + Math.floor(Math.random() * 100000000);
      const callbackString = this.getConfig('callback_fn') + '[' + randomizedCallback + ']';
      (jsc as JSC)[randomizedCallback] = response => {
        delete (jsc as JSC)[randomizedCallback];
        callback(response, data);
      };
      return callbackString;
    }
  }

  private runHook(hookName: string, payload: string | any[] | Record<string, any>) {
    const hook = this.config?.hooks[hookName] || IDENTITY_FUNC;
    let ret = hook.apply(this, payload);
    if (typeof ret === 'undefined') {
      console.error(hookName + ' hook did not return a value');
      ret = null;
    }
    return ret;
  }

  areBatchersInitialized() {
    return !!this.request_batchers?.events;
  }

  initBatchers() {
    const token = this.getConfig('token');
    if (!this.areBatchersInitialized()) {
      const batcherFor = (attrs: { type: string, endpoint: string, queue_suffix: string }) => {
        return new RequestBatcher('__je_' + token + attrs.queue_suffix, {
          libConfig: (this.config as DefaultConfig),
          sendRequestFunc: (data, options, cb) => {
            this.sendRequest(
              this.getConfig('api_host') + attrs.endpoint,
              encodeDataForRequest(data),
              options,
              this.prepareCallback(cb, data)
            );
          },
          beforeSendHook: (item: EventDataPayload) => {
            return this.runHook('before_send_' + attrs.type, item);
          }
        });
      };
      this.request_batchers = {
        events: batcherFor({ type: 'events', endpoint: '/api/v1/tracking', queue_suffix: '_ev' })
      };
    }
    if (this.getConfig('batch_auto_start')) {
      this.startBatchSenders();
    }
  }

  startBatchSenders() {
    if (this.areBatchersInitialized()) {
      this._batch_requests = true;
      utils.each(this.request_batchers, function (batcher: RequestBatcher) {
        batcher.start();
      });
    }
  }

  setConfig(config: DefaultConfig) {
    if (utils.isObject(config)) {
      utils.extend(this.config, config);
    }
    const newBatchSize = config.batch_size;
    if (newBatchSize) {
      utils.each(this.request_batchers, function (batcher: RequestBatcher) {
        batcher.resetBatchSize();
      });
    }
    if (!this.getConfig('persistence_name')) {
      (this.config as DefaultConfig).persistence_name = (this.config as DefaultConfig).cookie_name;
    }
    if (!this.getConfig('disable_persistence')) {
      (this.config as DefaultConfig).disable_persistence = (this.config as DefaultConfig).disable_cookie;
    }
    if (this.persistence) {
      // TODO: update persistence config
    }
    CONFIG.DEBUG = CONFIG.DEBUG || this.getConfig('debug');
  }

  getConfig(propName: string) {
    return (this.config as DefaultConfig)[propName];
  }

  getProperty(propName: string) {
    return this.persistence?.props[propName];
  }

  getDistinctID() {
    return this.getProperty('distinct_id');
  }

  registerOnce(props: any, defaultValue: string, daysOrOptions?: any) {
    let options: any = optionsForRegister(daysOrOptions);
    if (options.persistent) {
      this.persistence?.registerOnce(props, defaultValue, options.days);
    } else {
      if (typeof defaultValue === 'undefined') {
        defaultValue = 'None';
      }
      utils.each(props, (val: any, prop: string) => {
        if (!this.unpersisted_superprops.hasOwnProperty(prop) || this.unpersisted_superprops[prop] === defaultValue) {
          this.unpersisted_superprops[prop] = val;
        }
      });
    }
  }

  track(eventName: string, properties: EventDataPayload, options: Partial<RequestOptions>): any;
  track(eventName: string, properties: EventDataPayload, callback: any): any;
  track(eventName: string, properties: EventDataPayload, options: Partial<RequestOptions>, callback?: any): any {
    if (!callback && typeof options === 'function') {
      callback = options;
      options = {};
    }
    options = options = {};
    const transport = options.transport;
    if (transport) {
      options.transport = transport;
    }
    const shouldSendImmediately = options.send_immediately;
    if (typeof callback !== 'function') {
      callback = NOOP_FUNC;
    }
    if (utils.isUndefined(eventName)) {
      console.error('No event name provided to hanjelog.track');
      return;
    }
    if (this.eventIsDisabled(eventName)) {
      callback(0);
      return;
    }
    properties = properties || {};
    properties.token = this.getConfig('token');

    const startTimestamp = this.persistence?.removeEventTimer(eventName);
    if (!utils.isUndefined(startTimestamp)) {
      const durationInMS = utils.now() - (startTimestamp as number);
      properties.$duration = parseFloat((durationInMS / 1000).toFixed(3));
    }
    this.setDefaultSuperProps();

    properties = utils.extend(
      {},
      Info.properties(),
      this.persistence?.properties(),
      this.unpersisted_superprops,
      properties
    );
    const propertyBlockList = this.getConfig('property_block_list');
    if (utils.isArray(propertyBlockList)) {
      utils.each(propertyBlockList, (blockedProp: string) => delete properties[blockedProp]);
    } else {
      console.error('Invalid value for property_block_list config: ' + propertyBlockList);
    }
    const data = {
      event: eventName,
      properties
    };
    const ret = this.trackOrBatch({
      type: 'events',
      data,
      endpoint: this.getConfig('api_host') + '/track/',
      batcher: this.request_batchers?.events as RequestBatcher,
      should_send_immediately: !!shouldSendImmediately,
      send_request_options: options
    }, callback);
    this.checkAndHandleTriggeredNotification(data);
    return ret;
  }

  private trackOrBatch(options: TrackOptions, callback?: any) {
    let truncatedData = utils.truncate(options.data, 255);
    const { endpoint, batcher, should_send_immediately, send_request_options } = options;
    callback = callback || NOOP_FUNC;
    let request_enqueued_or_initiated: boolean | null = true;
    const send_request_immediately = () => {
      if (!send_request_options.skip_hooks) {
        truncatedData = this.runHook('before_send_' + options.type, truncatedData);
      }
      if (truncatedData) {
        console.log('HANJELOG REQUEST:');
        console.log(truncatedData);
        return this.sendRequest(
          endpoint,
          encodeDataForRequest(truncatedData),
          send_request_options,
          this.prepareCallback(callback, truncatedData)
        );
      }
      return null;
    };
    if (this._batch_requests && !should_send_immediately) {
      batcher.enqueue(truncatedData, (succeeded: boolean) => {
        if (succeeded) {
          callback(1, truncatedData);
        } else {
          send_request_immediately();
        }
      });
    } else {
      request_enqueued_or_initiated = send_request_immediately();
    }
    return request_enqueued_or_initiated && truncatedData;
  }

  private eventIsDisabled(eventName: string) {
    return utils.isBlockedUA(userAgent) || this._flag?.disable_all_events || utils.include(this.__disabled_events, eventName);
  }

  private setDefaultSuperProps() {
    this.persistence?.updateSearchKeyword(doc.referrer);
    if (this.getConfig('store_google')) {
      this.persistence?.updateCampaignParams();
    }
    if (this.getConfig('save_referrer')) {
      this.persistence?.updateReferrerInfo(doc.referrer);
    }
  }

  private checkAndHandleTriggeredNotification(eventData: Record<string, any>) {
    if (!this.user_decide_check_complete) {
      this.events_tracked_before_user_decide_check_complete.push(eventData);
    } else {
      // TODO: else check
    }
  }
}

export function createLogInstance() {
  MAIN_LOG = new HanjeLog();

  return MAIN_LOG;
}
