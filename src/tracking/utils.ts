// 在控制台跑单元测试时，window对象不存在
let win;
if (typeof window === 'undefined') {
  const loc = {
    hostname: ''
  };
  win = {
    navigator: { userAgent: '' },
    document: {
      location: loc,
      referrer: ''
    },
    screen: { width: 0, height: 0 },
    location: loc
  };
} else {
  win = window;
}

// 将较长的方法名或对象重命名，可以降低打包的包体积
const ArrayProto = Array.prototype,
  FuncProto = Function.prototype,
  ObjectProto = Object.prototype,
  slice = ArrayProto.slice,
  toStr = ObjectProto.toString,
  hasOwnProperty = ObjectProto.hasOwnProperty,
  windowConsole = win.console,
  nav = win.navigator,
  doc = win.document,
  scr = win.screen,
  userAgent = nav.userAgent;

const nativeBind = FuncProto.bind,
  nativeForEach = ArrayProto.forEach,
  nativeIndexOf = ArrayProto.indexOf,
  nativeMap = ArrayProto.map,
  nativeIsArray = Array.isArray,
  breaker = {};

//TODO: console override

interface UNDERSCORE {
  trim: Function;
  isObject: (f: any) => boolean;
  isEmptyObject: (f: any) => boolean;
  isFunction: (f: any) => boolean;
  isArguments: (f: any) => boolean;
  isString: (obj: any) => boolean;
  isArray: (obj: any) => boolean;
  isDate: (obj: any) => boolean;
  isNumber: (obj: any) => boolean;
  isUndefined: (obj: any) => boolean;
  isDOMElement: (obj: any) => boolean;
  bind: (func: Function, context: any) => Function;
  bindInstanceMethods: (obj: any) => void;
  each: (obj: any, iterator: Function, context?: any) => void;
  escapeHTML: (s: string) => string;
  extend: (obj: object) => object;
  keys: (obj: any) => any[];
  values: (obj: any) => any[];
  toArray: (iterable: any) => any[];
  map: (arr: any[], callback: (value: any, index?: number, arr?: any[]) => any[], context?: any) => any[];
  include: (obj: any, target: any) => boolean;
  includes: (str: string, needle: any) => boolean;
  now: () => number;
  safeWrap: (f: Function) => Function
}

// 扩展UNDERSCORE
const _: UNDERSCORE = {
  trim(str: string) {
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/Trim#Polyfill
    return str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
  },
  isObject(obj: any) {
    return (obj === Object(obj) && !_.isArray(obj));
  },
  isEmptyObject(obj: any) {
    if (_.isObject(obj)) {
      for (const key in obj) {
        if (hasOwnProperty.call(obj, key)) {
          return false;
        }
      }
      return true;
    }
    return false;
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
  bind(func, context) {
    let args: any[], bound: Function;
    if (nativeBind && func.bind === nativeBind) {
      return nativeBind.apply(func, [slice.call(arguments, 1)]);
    }
    if (!_.isFunction(func)) {
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
        obj[func] = _.bind(obj[func], obj);
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
  escapeHTML(s: string) {
    let escaped = s;
    if (escaped && _.isString(escaped)) {
      escaped = escaped.replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    }
    return escaped;
  },
  //TODO: extend method
  extend(obj) {
    return obj;
  },
  keys(obj) {
    let results: any[] = [];
    if (obj == null) {
      return results;
    }
    _.each(obj, function (value: any, key: string) {
      results[results.length] = key;
    });
    return results;
  },
  values(obj) {
    let results: any[] = [];
    if (obj == null) {
      return results;
    }
    _.each(obj, function (value: any) {
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
    if (_.isArray(iterable)) {
      return slice.call(iterable);
    }
    if (_.isArguments(iterable)) {
      return slice.call(iterable);
    }
    return _.values(iterable);
  },
  map(arr, callback, context) {
    if (nativeMap && arr.map === nativeMap) {
      return arr.map(callback, context);
    } else {
      const results = [];
      _.each(arr, function (item: any) {
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
    _.each(obj, function (value: any) {
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

      }
    };
  }
};

export {
  _
};
