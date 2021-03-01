// 在控制台跑单元测试时，window对象不存在
import { CONFIG } from './config';

export let win: Window = window;

// 将较长的方法名或对象重命名，可以降低打包的包体积
const ArrayProto = Array.prototype,
  FuncProto = Function.prototype,
  ObjectProto = Object.prototype,
  slice = ArrayProto.slice,
  toStr = ObjectProto.toString,
  hasOwnProperty = ObjectProto.hasOwnProperty,
  windowConsole = win.console;
export const nav = win.navigator;
export const doc = win.document;
export const scr = win.screen;
export const userAgent = nav.userAgent;

const nativeBind = FuncProto.bind,
  nativeForEach = ArrayProto.forEach,
  nativeIndexOf = ArrayProto.indexOf,
  nativeMap = ArrayProto.map,
  nativeIsArray = Array.isArray,
  breaker = {};

//TODO: console override
export const console = {
  log: function (...args: any[]) {
    if (CONFIG.DEBUG && !utils.isUndefined(windowConsole) && windowConsole) {
      try {
        windowConsole.log.apply<Console, any, any>(windowConsole, args);
      } catch (e) {
        utils.each(args, function (arg: any) {
          windowConsole.log(arg);
        });
      }
    }
  },
  warn: function (...args: any[]) {
    if (CONFIG.DEBUG && !utils.isUndefined(windowConsole) && windowConsole) {
      args = ['Hanjelog warning:'].concat(args);
      try {
        windowConsole.warn.apply<Console, any, any>(windowConsole, args);
      } catch (e) {
        utils.each(args, function (arg: any) {
          windowConsole.warn(arg);
        });
      }
    }
  },
  error: function (...args: any[]) {
    if (CONFIG.DEBUG && !utils.isUndefined(windowConsole) && windowConsole) {
      args = ['Hanjelog error:'].concat(args);
      try {
        windowConsole.error.apply<Console, any, any>(windowConsole, args);
      } catch (e) {
        utils.each(args, function (arg: any) {
          windowConsole.error(arg);
        });
      }
    }
  },
  critical: function (...args: any[]) {
    if (!utils.isUndefined(windowConsole) && windowConsole) {
      args = ['Hanjelog critical:'].concat(args);
      try {
        windowConsole.error.apply<Console, any, any>(windowConsole, args);
      } catch (e) {
        utils.each(args, function (arg: any) {
          windowConsole.error(arg);
        });
      }
    }
  }
};

const logFuncWithPrefix = function (func: () => any, prefix: string) {
  return function (...args: any) {
    args[0] = `[${prefix}]${args[0]}`;
    return func.apply(console, args);
  };
};

export const consoleWithPrefix = function (prefix: string) {
  return {
    log: logFuncWithPrefix(console.log, prefix),
    error: logFuncWithPrefix(console.error, prefix),
    critical: logFuncWithPrefix(console.critical, prefix)
  };
};

interface UNDERSCORE {
  trim: Function;
  isObject: (f: any) => boolean;
  isEmptyObject: (f: any) => boolean;
  isPlainObject: (f: any) => boolean;
  isPrimitive: (f: any) => boolean;
  isFunction: (f: any) => boolean;
  isArguments: (f: any) => boolean;
  isString: (obj: any) => boolean;
  isArray: (obj: any) => boolean;
  isDate: (obj: any) => boolean;
  isNumber: (obj: any) => boolean;
  isUndefined: (obj: any) => boolean;
  isDOMElement: (obj: any) => boolean;
  isBlockedUA: (ua: string) => boolean;
  bind: (func: Function, context: any) => Function;
  bindInstanceMethods: (obj: any) => void;
  each: (obj: any, iterator: Function, context?: any) => void;
  getQueryParam: (url: string, param: string) => string;
  escapeHTML: (s: string) => string;
  extend: (obj: any, ...rest: any[]) => any;
  stripEmptyProperties: (obj: any) => any;
  keys: (obj: any) => any[];
  values: (obj: any) => any[];
  toArray: (iterable: any) => any[];
  map: (arr: any[], callback: (value: any, index?: number, arr?: any[]) => any[], context?: any) => any[];
  include: (obj: any, target: any) => boolean;
  includes: (str: string, needle: any) => boolean;
  now: () => number;
  safeWrap: (f: Function) => Function;
  extractDomain: (hostname: string) => string;
  truncate: (target: string | any[] | Record<string, any>, length: number) => string | any[] | Record<string, any>
}


// This is to block various web spiders from executing our JS and
// sending false tracking data
const BLOCKED_UA_STRINGS = [
  'baiduspider',
  'bingbot',
  'bingpreview',
  'facebookexternal',
  'pinterest',
  'screaming frog',
  'yahoo! slurp',
  'yandexbot',

  // a whole bunch of goog-specific crawlers
  // https://developers.google.com/search/docs/advanced/crawling/overview-google-crawlers
  'adsbot-google',
  'apis-google',
  'duplexweb-google',
  'feedfetcher-google',
  'google favicon',
  'google web preview',
  'google-read-aloud',
  'googlebot',
  'googleweblight',
  'mediapartners-google',
  'storebot-google'
];

// 扩展UNDERSCORE
const utils: UNDERSCORE = {
  trim(str: string) {
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/Trim#Polyfill
    return str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
  },
  isObject(obj: any) {
    return (obj === Object(obj) && !utils.isArray(obj));
  },
  isEmptyObject(obj: any) {
    if (utils.isObject(obj)) {
      for (const key in obj) {
        if (hasOwnProperty.call(obj, key)) {
          return false;
        }
      }
      return true;
    }
    return false;
  },
  isPlainObject(obj: any) {
    return obj && toStr.call(obj) === '[object Object]' && 'isPrototypeOf' in obj;
  },
  isPrimitive(obj: any) {
    return obj !== Object(obj);
  },
  isFunction(f: any) {
    try {
      return /^\s*\bfunction\b/.test(f);
    } catch (e) {
      return false;
    }
  },
  isArguments(obj: any) {
    return !!(obj && hasOwnProperty.call(obj, 'callee'));
  },
  isString(obj: any) {
    return toStr.call(obj) === '[object String]';
  },
  isArray(obj: any) {
    if (nativeIsArray) {
      return nativeIsArray(obj);
    }
    return toStr.call(obj) === '[object Array]';
  },
  isDate(obj: any) {
    return toStr.call(obj) === '[object Date]';
  },
  isNumber(obj: any) {
    return toStr.call(obj) === '[object Number]';
  },
  isUndefined(obj: any) {
    return obj === void 0;
  },
  isDOMElement(obj: any) {
    return !!(obj && obj.nodeType === 1);
  },
  isBlockedUA(ua: string) {
    ua = ua.toLowerCase();
    for (let i = 0; i < BLOCKED_UA_STRINGS.length; i++) {
      if (ua.indexOf(BLOCKED_UA_STRINGS[i]) !== -1) {
        return true;
      }
    }
    return false;
  },
  bind(func, context) {
    let args: any[], bound: Function;
    if (nativeBind && func.bind === nativeBind) {
      return nativeBind.apply(func, [slice.call(arguments, 1)]);
    }
    if (!utils.isFunction(func)) {
      throw new TypeError();
    }
    args = slice.call(arguments, 2);
    bound = function (this: any) {
      if (!(this instanceof bound)) {
        return func.apply(context, args.concat(slice.call(arguments)));
      }
      const Ctor: any = function () {
      };
      const self = new Ctor();
      Ctor.prototype = null;
      const result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) {
        return result;
      }
      return self;
    };
    return bound;
  },
  bindInstanceMethods(obj: any) {
    for (const func in obj) {
      if (hasOwnProperty.call(obj, func) && typeof obj[func] === 'function') {
        obj[func] = utils.bind(obj[func], obj);
      }
    }
  },
  each(obj, iterator, context) {
    if (obj == null) {
      return;
    }
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (let i = 0, l = obj.length; i < l; i++) {
        if (i in obj && iterator.call(context, obj[i], i, obj) === breaker) {
          return;
        }
      }
    } else {
      for (let key in obj) {
        if (hasOwnProperty.call(obj, key)) {
          if (iterator.call(context, obj[key], key, obj) === breaker) {
            return;
          }
        }
      }
    }
  },
  getQueryParam(url, param) {
    param = param.replace(/[[]/, '\\[').replace(/[\]]/, '\\]');
    const regexStr = '[\\?&]' + param + '=([^&#]*)';
    const regex = new RegExp(regexStr);
    const results = regex.exec(url);
    if (results == null || (results && typeof results[1] !== 'string' && (results[1] as any[]).length)) {
      return '';
    } else {
      let result = results[1];
      try {
        result = decodeURIComponent(result);
      } catch (e) {
        console.error('Skipping decoding for malformed query param: ' + result);
      }
      return result.replace(/\+/g, ' ');
    }
  },
  escapeHTML(s: string) {
    let escaped = s;
    if (escaped && utils.isString(escaped)) {
      escaped = escaped.replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    }
    return escaped;
  },
  //TODO: extend method
  extend(obj, ...rest) {
    utils.each(rest, function (source: any) {
      for (let prop in source) {
        if (source[prop] !== void 0) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  },
  // 剔除掉value为空的property
  stripEmptyProperties(obj: any) {
    const ret: Record<string, any> = {};
    utils.each(obj, function (v: string, k: string) {
      if (utils.isString(v) && v.length > 0) {
        ret[k] = v;
      }
    });
    return ret;
  },
  keys(obj) {
    let results: any[] = [];
    if (obj == null) {
      return results;
    }
    utils.each(obj, function (value: any, key: string) {
      results[results.length] = key;
    });
    return results;
  },
  values(obj) {
    let results: any[] = [];
    if (obj == null) {
      return results;
    }
    utils.each(obj, function (value: any) {
      results[results.length] = value;
    });
    return results;
  },
  toArray(iterable) {
    if (!iterable) {
      return [];
    }
    if (iterable.toArray) {
      return iterable.toArray();
    }
    if (utils.isArray(iterable)) {
      return slice.call(iterable);
    }
    if (utils.isArguments(iterable)) {
      return slice.call(iterable);
    }
    return utils.values(iterable);
  },
  map(arr, callback, context) {
    if (nativeMap && arr.map === nativeMap) {
      return arr.map(callback, context);
    } else {
      const results = [];
      utils.each(arr, function (item: any) {
        results.push(callback.call(context, item));
      });
      return arr;
    }
  },
  include(obj, target) {
    let found = false;
    if (obj == null) {
      return found;
    }
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) {
      return obj.indexOf(target) !== -1;
    }
    utils.each(obj, function (value: any) {
      if (found || (found = (value === target))) {
        return breaker;
      }
    });
    return found;
  },
  includes(str, needle) {
    return str.indexOf(needle) !== -1;
  },
  // TODO: inherit method
  now() {
    Date.now = Date.now || function () {
      return +new Date();
    };
    return Date.now();
  },
  safeWrap(f) {
    return function (this: any) {
      try {
        return f.apply(this, arguments);
      } catch (e) {
        console.critical('Implementation error. Please turn on debug and contact support@hanjelog.com');
        if (CONFIG.DEBUG) {
          console.critical(e);
        }
      }
    };
  },
  // TODO: safewrap_class
  // TODO: safewrap_instance_methods
  // TODO: strip_empty_properties
  extractDomain(hostname) {
    let domainRegex = DOMAIN_MATCH_REGEX;
    const parts = hostname.split('.');
    const tld = parts[parts.length - 1];
    if (tld.length > 4 || tld === 'com' || tld === 'org') {
      domainRegex = SIMPLE_DOMAIN_MATCH_REGEX;
    }
    const matches = hostname.match(domainRegex);
    return matches ? matches[0] : '';
  },
  truncate(target, length) {
    let ret: any = {};
    if (typeof target === 'string') {
      ret = target.slice(0, length);
    } else if (utils.isArray(target)) {
      ret = [];
      utils.each(target, (val: any) => {
        ret.push(utils.truncate(val, length));
      });
    } else if (utils.isObject(target)) {
      ret = {};
      utils.each(target, (val: any, key: string) => {
        ret[key] = utils.truncate(val, length);
      });
    } else {
      ret = target;
    }
    return ret;
  }
};

const SIMPLE_DOMAIN_MATCH_REGEX = /[a-z0-9][a-z0-9-]*\.[a-z]+$/i;
const DOMAIN_MATCH_REGEX = /[a-z0-9][a-z0-9-]+\.[a-z.]{2,6}$/i;

export default utils;

export const cheap_guid = function (maxLen?: number) {
  const guid = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
  return maxLen ? guid.substring(0, maxLen) : guid;
};

const parseCookieString = (text: string, shouldDecode: boolean) => {
  const cookies: Record<string, any> = {};

  if (utils.isString(text) && text.length > 0) {
    const decodeValue = shouldDecode ? decodeURIComponent : <T>(s: T) => s;
    const cookieParts = text.split(/;\s/g);
    let cookieName;
    let cookieValue;
    let cookieNameValue;

    for (let i = 0, len = cookieParts.length; i < len; i++) {
      // Check for normally-formatted cookie (name-value)
      cookieNameValue = cookieParts[i].match(/([^=]+)=/i);
      if (cookieNameValue instanceof Array) {
        try {
          cookieName = decodeURIComponent(cookieNameValue[1]);
          cookieValue = decodeValue(cookieParts[i].substring(cookieNameValue[1].length + 1));
        } catch (ex) {
          // Intentionally ignore the cookie -
          // the encoding is wrong
        }
      } else {
        // Means the cookie does not have an "=", so treat it as
        // a boolean flag
        cookieName = decodeURIComponent(cookieParts[i]);
        cookieValue = '';
      }

      if (cookieName) {
        cookies[cookieName] = cookieValue;
      }
    }
  }
  return cookies;
};
const validateCookieName = (name: string) => {
  if (utils.isString(name) && name.trim() === '') {
    throw new TypeError('Cookie name must be a non-empty string');
  }
};

export class Cookie {
  get(name: string, options?: any) {
    validateCookieName(name);

    if (typeof options === 'function') {
      options = {
        converter: options
      };
    } else {
      options = options || {};
    }

    const cookies = parseCookieString(document.cookie, !options.raw);
    return (options.converter || (<T>(s: T) => s))(cookies[name]);
  }

  set(name: string, value: string, options: any) {
    validateCookieName(name);
    options = options || {};
    const { expires, domain, path, raw, secure } = options;

    if (!raw) {
      value = encodeURIComponent(String(value));
    }

    let text = name + '=' + value;

    // expires
    let date = expires;
    if (typeof date === 'number') {
      date = new Date();
      date.setDate(date.getDate() + expires);
    }
    if (date instanceof Date) {
      text += '; expires=' + date.toUTCString();
    }

    // domain

    if (utils.isString(domain) && domain.trim() !== '') {
      text += '; domain=' + domain;
    }

    // path
    if (utils.isString(path) && path.trim() !== '') {
      text += '; path=' + path;
    }

    // secure
    if (secure) {
      text += '; secure';
    }

    document.cookie = text;
    return text;
  }

  remove(name: string, options: any) {
    options = options || {};
    options.expires = new Date(0);
    return this.set(name, '', options);
  }
}

let _localStorageSupported: boolean | null = null;
export const localStorageSupported = function (storage?: Storage, forceCheck?: boolean): boolean {
  if (_localStorageSupported != null && !forceCheck) {
    return _localStorageSupported;
  }
  let supported = true;
  try {
    storage = storage || window.localStorage;
    let key = '__jess_' + cheap_guid(8);
    let val = 'xyz';
    storage.setItem(key, val);
    if (storage.getItem(key) !== val) {
      supported = false;
    }
    storage.removeItem(key);
  } catch (e) {
    supported = false;
  }
  _localStorageSupported = supported;
  return supported;
};

export const UUID = (function () {

  // Time/ticks information
  // 1*new Date() is a cross browser version of Date.now()
  const T = function () {
    let d = utils.now(),
      i = 0;

    // this while loop figures how many browser ticks go by
    // before 1*new Date() returns a new number, ie the amount
    // of ticks that go by per millisecond
    while (d == utils.now()) {
      i++;
    }

    return d.toString(16) + i.toString(16);
  };

  // Math.Random entropy
  const R = function () {
    return Math.random().toString(16).replace('.', '');
  };

  // User agent entropy
  // This function takes the user agent string, and then xors
  // together each sequence of 8 bytes.  This produces a final
  // sequence of 8 bytes which it returns as hex.
  const UA = function () {
    let ua = userAgent,
      i, ch, buffer: number[] = [],
      ret = 0;

    function xor(result: number, byte_array: number[]) {
      let j, tmp = 0;
      for (j = 0; j < byte_array.length; j++) {
        tmp |= (buffer[j] << j * 8);
      }
      return result ^ tmp;
    }

    for (i = 0; i < ua.length; i++) {
      ch = ua.charCodeAt(i);
      buffer.unshift(ch & 0xFF);
      if (buffer.length >= 4) {
        ret = xor(ret, buffer);
        buffer = [];
      }
    }

    if (buffer.length > 0) {
      ret = xor(ret, buffer);
    }

    return ret.toString(16);
  };

  return function () {
    const se = (screen.height * screen.width).toString(16);
    return (T() + '-' + R() + '-' + UA() + '-' + se + '-' + T());
  };
})();

const JSONEncode = function (mixedVal: any) {
  let value = mixedVal;
  const quote = function (string: string) {
    const escapable = /[\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g; // eslint-disable-line no-control-regex
    const meta: Record<string, string> = {
      '\b': '\\b',
      '\t': '\\t',
      '\n': '\\n',
      '\f': '\\f',
      '\r': '\\r',
      '"': '\\"',
      '\\': '\\\\'
    };
    escapable.lastIndex = 0;
    if (escapable.test(string)) {
      string = string.replace(escapable, function (a) {
        const c = meta[a];
        return utils.isString(c) ? c : '\\u' + ('0000' + a.charCodeAt(0).toString(16).slice(-4));
      });
    }
    return `"${string}"`;
  };
  const str = function (key: string | number, holder: any): any {
    let gap = '';
    let indent = '  ';
    let i = 0;
    let k = '';
    let v = '';
    let length = 0;
    let mind = gap;
    let partial = [];
    let value = holder[key];
    if (value && typeof value === 'object' && typeof value.toJSON === 'function') {
      value = value.toJSON(key);
    }
    switch (typeof value) {
      case 'string':
        return quote(value);
      case 'number':
        return isFinite(value) ? String(value) : 'undefined';
      case 'boolean':
      case 'undefined':
        return String(value);
      case 'object':
        if (!value) {
          return 'undefined';
        }
        gap += indent;
        partial = [];

        if (toStr.apply(value) === '[object Array]') {
          length = value.length;
          for (i = 0; i < length; i += 1) {
            partial[i] = str(i, value) || 'undefined';
          }
          v = partial.length === 0 ?
            '[]' :
            gap ?
              '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']' :
              '[' + partial.join(',') + ']';
          gap = mind;
          return v;
        }
        for (k in value) {
          if (hasOwnProperty.call(value, k)) {
            v = str(k, value);
            if (v) {
              partial.push(quote(k) + (gap ? ': ' : ':') + v);
            }
          }
        }
        v = partial.length === 0 ?
          '{}' :
          gap ?
            '{' + partial.join(',') + '' + mind + '}' :
            '{' + partial.join(',') + '}';
        gap = mind;
        return v;
    }
  };
  return str('', {
    '': value
  });
};

// TODO: JSONDecode
const JSONDecode = function () {

};

// TODO: Base64Encode
export const Base64Encode = function () {

};

// TODO: UTF8Encode
export const UTF8Encode = function () {

};

export const QueryStringify = function (obj: any, sep: string = '&', eq: string = '=', arrayKey: boolean = false): string {
  if (!utils.isPlainObject(obj)) return '';
  sep = sep || '&';
  eq = eq || '=';
  arrayKey = arrayKey || false;
  const buf = [];
  let key, val;
  for (key in obj) {
    if (hasOwnProperty.call(obj, key)) {
      val = obj[key];
      key = encodeURIComponent(key);
      if (utils.isPrimitive(val)) {
        buf.push(key, eq, encodeURIComponent(`${val}`), sep);
      } else if (utils.isArray(val) && val.length) {
        for (let i = 0; i < val.length; i++) {
          if (utils.isPrimitive(val[i])) {
            buf.push(key, (arrayKey ? encodeURIComponent('[]') : '') + eq, encodeURIComponent(`${val[i]}`), sep);
          }
        }
      } else {
        buf.push(key, eq, sep);
      }
    }
  }
  buf.pop();
  return buf.join('');
};

export const QueryParse = function (str?: string, sep?: string, eq?: string) {
  if (typeof str === 'undefined' && typeof doc !== 'undefined') {
    str = doc.location.search;
  }
  const ret: Record<string, any> = {};
  if (!utils.isString(str) || (str as string).trim().length === 0) {
    return ret;
  }
  str = str?.replace(/^\?/, '');
  const pairs = str?.split(sep || '&');
  eq = eq || '=';
  for (let i = 0; i < (pairs as string[])?.length; i++) {
    const pair = (pairs as string[])[i].split(eq);
    let key = decodeURIComponent(pair[0].trim());
    const val = decodeURIComponent(pair.slice(1).join(eq).trim());
    const m = key.match(/^(\w+)\[\]$/);
    if (m && m[1]) {
      [, key] = m;
    }
    if (hasOwnProperty.call(ret, key)) {
      if (!utils.isArray(ret[key])) {
        ret[key] = [ret[key]];
      }
      ret[key].push(val);
    } else {
      ret[key] = m ? [val] : val;
    }
  }
  return ret;
};


export const registerEvent = (function () {
  /*return function (element, type, handler, oldSchool, useCapture) {

  };*/
})();
export let JSONStringify: any = null;
export let JSONParse: any = null;
if (typeof JSON !== 'undefined') {
  JSONStringify = JSON.stringify;
  JSONParse = JSON.parse;
}
JSONStringify = JSONStringify || JSONEncode;
JSONParse = JSONParse || JSONDecode;

export class Info {
  static campaignParams() {
    const campaignKeywords = 'utm_source utm_medium utm_campaign utm_content utm_term'.split(' '), params: Record<string, any> = {};
    let kw = '';
    utils.each(campaignKeywords, function (kwkey: string) {
      kw = utils.getQueryParam(doc.URL, kwkey);
      if (kw?.length) {
        params[kwkey] = kw;
      }
    });
    return params;
  }

  static searchEngine(referrer: string) {
    if (referrer.search('https?://(.*)google.([^/?]*)') === 0) {
      return 'google';
    } else if (referrer.search('https?://(.*)bing.com') === 0) {
      return 'bing';
    } else if (referrer.search('https?://(.*)yahoo.com') === 0) {
      return 'yahoo';
    } else if (referrer.search('https?://(.*)duckduckgo.com') === 0) {
      return 'duckduckgo';
    } else {
      return null;
    }
  }

  static searchInfo(referrer: string): Record<string, any> {
    const search = Info.searchEngine(referrer),
      param = (search !== 'yahoo') ? 'q' : 'p',
      ret: Record<string, any> = {};
    if (search != null) {
      ret['$search_engine'] = search;
    }
    return ret;
  }

  static referringDomain(referrer: string) {
    const split = referrer.split('/');
    if (split.length >= 3) {
      return split[2];
    }
    return '';
  }

  static os() {
    const a = userAgent;
    if (/Windows/i.test(a)) {
      if (/Phone/.test(a) || /WPDesktop/.test(a)) {
        return 'Windows Phone';
      }
      return 'Windows';
    } else if (/(iPhone|iPad|iPod)/.test(a)) {
      return 'iOS';
    } else if (/Android/.test(a)) {
      return 'Android';
    } else if (/(BlackBerry|PlayBook|BB10)/i.test(a)) {
      return 'BlackBerry';
    } else if (/Mac/i.test(a)) {
      return 'Mac OS X';
    } else if (/Linux/.test(a)) {
      return 'Linux';
    } else if (/CrOS/.test(a)) {
      return 'Chrome OS';
    } else {
      return '';
    }
  }

  static device(user_agent: string = nav.userAgent) {
    console.log(user_agent);
    if (/Windows Phone/i.test(user_agent) || /WPDesktop/.test(user_agent)) {
      return 'Windows Phone';
    } else if (/iPad/.test(user_agent)) {
      return 'iPad';
    } else if (/iPod/.test(user_agent)) {
      return 'iPod Touch';
    } else if (/iPhone/.test(user_agent)) {
      return 'iPhone';
    } else if (/(BlackBerry|PlayBook|BB10)/i.test(user_agent)) {
      return 'BlackBerry';
    } else if (/Android/.test(user_agent)) {
      return 'Android';
    } else {
      return '';
    }
  }

  static properties() {
    return utils.extend(utils.stripEmptyProperties({
      '$os': Info.os(),
      // '$browser': '',
      '$referrer': doc.referrer,
      '$referring_domain': Info.referringDomain(doc.referrer),
      '$device': Info.device()
    }), {
      '$current_url': win.location.href,
      // '$browser_version': ''
      '$screen_height': scr.height,
      '$screen_width': scr.width,
      'hanjelog_lib': 'web',
      '$lib_version': CONFIG.LIB_VERSION,
      '$insert_id': cheap_guid(),
      'time': utils.now()
    });
  }

  static pageViewInfo() {
    return utils.stripEmptyProperties({});
  }
}
