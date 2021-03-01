import utils, { cheap_guid, consoleWithPrefix, JSONParse, JSONStringify, win } from './utils';

const logger = consoleWithPrefix('batch');

const filterOutIDsAndInvalid = (items: any[], idSet: any) => {
  const filteredItems: any[] = [];
  utils.each(items, function (item: any) {
    if (item.id && !idSet[item.id]) {
      filteredItems.push(item);
    }
  });
  return filteredItems;
};

interface QueueOptions {
  storage?: Storage;
  pid?: number
}

export default class RequestQueue {
  storageKey: string;
  storage: Storage;
  pid?: number;
  memQueue: any[];

  constructor(storageKey: string, options: QueueOptions) {
    options = options || {};
    this.storageKey = storageKey;
    this.storage = options.storage || win.localStorage;
    this.pid = options.pid || undefined;
    this.memQueue = [];
  }

  enqueue(item: any, flushInterval: number, cb: Function) {
    const queueEntry = {
      id: cheap_guid(),
      flushAfter: utils.now() + flushInterval * 2,
      payload: item
    };

    let succeed;
    try {
      const storageQueue = this.readFromStorage();
      storageQueue.push(queueEntry);
      succeed = this.saveToStorage(storageQueue);
      if (succeed) {
        this.memQueue.push(queueEntry);
      }
    } catch (e) {
      logger.error('Error enqueueing item', item);
      succeed = false;
    }
    if (cb) {
      cb(succeed);
    }
  }

  readFromStorage(): any[] {
    let storageEntry;
    try {
      storageEntry = this.storage.getItem(this.storageKey);
      if (storageEntry) {
        storageEntry = JSONParse(storageEntry);
        if (!utils.isArray(storageEntry)) {
          logger.error('Invalid storage entry:', storageEntry);
          storageEntry = null;
        }
      }
    } catch (e) {
      logger.error('Error retrieving queue:', e);
      storageEntry = null;
    }
    return storageEntry || [];
  }

  saveToStorage(queue: any[]) {
    try {
      this.storage.setItem(this.storageKey, JSONStringify(queue));
      return true;
    } catch (e) {
      logger.error('Error saving queue', e);
      return false;
    }
  }

  removeItemsByID(ids: string[], cb?: any) {
    const idSet: any = {};
    utils.each(ids, function (id: string) {
      idSet[id] = true;
    });
    this.memQueue = filterOutIDsAndInvalid(this.memQueue, idSet);
    let succeeded: boolean;
    try {
      let storedQueue = this.readFromStorage();
      storedQueue = filterOutIDsAndInvalid(storedQueue, idSet);
      succeeded = this.saveToStorage(storedQueue);
    } catch (e) {
      logger.error('Error removing items', ids);
      succeeded = false;
    }
    if (cb) {
      cb(succeeded);
    }
  }

  fillBatch(batchSize: number) {
    const batch = this.memQueue.slice(0, batchSize);
    if (batch.length < batchSize) {
      const storedQueue = this.readFromStorage();
      if (storedQueue.length) {
        // 数据ID已经在memQueue中，不要重复添加
        const idsInBatch: any = {};
        utils.each(batch, function (item: any) {
          idsInBatch[item.id] = true;
        });
        for (let i = 0; i < storedQueue.length; i++) {
          const item = storedQueue[i];
          // 现在的时间大于每条数据的 flushAfter 时间，并且该条数据不在memQueue中
          if (utils.now() > item.flushAfter && !idsInBatch[item.id]) {
            item.orphaned = true;
            batch.push(item);
            if (batch.length >= batchSize) {
              break;
            }
          }
        }
      }
    }
    return batch;
  }

  updatePayloads(items: any) {}
}
