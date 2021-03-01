import RequestQueue from './request-queue';
import { DefaultConfig } from './core';
import utils, { consoleWithPrefix } from './utils';

const MAX_RETRY_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const logger = consoleWithPrefix('batch');

interface IXMLHttpRequest extends XMLHttpRequest {
  responseHeaders: any
}
export interface RequestOptions {
  method?: 'GET' | 'POST';
  verbose?: boolean;
  ignore_json_errors?: boolean;
  skip_hooks?: boolean;
  timeout_ms?: number;
  transport?: DefaultConfig['api_transport'];
  send_immediately?: boolean;
}

export type EventDataPayload = Record<string, any>

export interface EventData {
  id: number;
  flushAfter: number;
  payload: EventDataPayload;
}

type sendRequestFunc = (data: EventDataPayload[], options: RequestOptions, callback: Function) => void;

export default class RequestBatcher {
  queue: RequestQueue;
  libConfig: DefaultConfig;
  sendRequest: sendRequestFunc;
  beforeSendHook: Function;
  batchSize: number;
  flushInterval: number;
  timeoutID?: number | ReturnType<typeof setTimeout>;
  stopped: boolean;
  requestInProgress?: boolean;

  constructor(storageKey: string, options: {
    libConfig: DefaultConfig;
    sendRequestFunc: sendRequestFunc;
    beforeSendHook: Function;
    storage?: Storage;
  }) {
    this.queue = new RequestQueue(storageKey, {
      storage: options.storage
    });
    this.libConfig = options.libConfig;
    this.sendRequest = options.sendRequestFunc;
    this.beforeSendHook = options.beforeSendHook;
    this.batchSize = this.libConfig.batch_size as number;
    this.flushInterval = this.libConfig.batch_flush_interval_ms as number;
    this.stopped = !this.libConfig.batch_auto_start;
  }

  enqueue(item: any, cb: any){
    this.queue.enqueue(item, this.flushInterval, cb);
  }

  start() {
    this.stopped = false;
    this.flush();
  }

  flush(options?: { unloading?: boolean }) {
    try {
      if (this.requestInProgress) {
        logger.log('Flush: Request already in progress');
        return;
      }
      options = options || {};
      const timeoutMS = this.libConfig.batch_request_timeout_ms as number;
      const startTime = utils.now();
      const currentBatchSize = this.batchSize;
      const batch = this.queue.fillBatch(currentBatchSize);
      const dataForRequest: EventDataPayload[] = [];
      const transformedItems: any = {};
      utils.each(batch, (item: any) => {
        let payload = item.payload;
        if (this.beforeSendHook && !item.orphaned) {
          payload = this.beforeSendHook(payload);
        }
        if (payload) {
          dataForRequest.push(payload);
        }
        transformedItems[item.id] = payload;
      });
      if (dataForRequest.length < 1) {
        this.resetFlush();
        return;
      }
      this.requestInProgress = true;
      const batchSendCallback = (res: {
        status: number;
        error: string;
        xhr_req: IXMLHttpRequest
      }) => {
        this.requestInProgress = false;
        try {
          let removeItemsFromQueue = false;
          if (options?.unloading) {
            this.queue.updatePayloads(transformedItems);
          } else if (utils.isObject(res) && res.error === 'timeout' && utils.now() - startTime >= timeoutMS) {
            logger.error('Network timeout; retrying');
            this.flush();
          } else if (utils.isObject(res) && res.xhr_req && (res.xhr_req.status >= 500 || res.xhr_req.status <= 0)) {
            let retryMS = this.flushInterval * 2;
            const headers = res.xhr_req.responseHeaders;
            if (headers) {
              const retryAfter = headers['Retry-After'];
              if (retryAfter) {
                retryMS = (parseInt(retryAfter, 10) * 1000) || retryMS;
              }
            }
            retryMS = Math.min(MAX_RETRY_INTERVAL_MS, retryMS);
            logger.error('Error; retry in ' + retryMS + ' ms');
            this.scheduleFlush(retryMS);
          } else if (utils.isObject(res) && res.xhr_req && res.xhr_req.status === 413) {
            if (batch.length > 1) {
              const halvedBatchSize = Math.max(1, Math.floor(currentBatchSize / 2));
              this.batchSize = Math.min(this.batchSize, halvedBatchSize, batch.length - 1);
              logger.error('413 response; reducing batch size to ' + this.batchSize);
              this.resetFlush();
            } else {
              logger.error('Single-event request too large; dropping', batch);
              this.resetBatchSize();
              removeItemsFromQueue = true;
            }
          } else {
            removeItemsFromQueue = true;
          }

          if (removeItemsFromQueue) {
            this.queue.removeItemsByID(
              utils.map(batch, item => item.id),
              utils.bind(this.flush, this)
            );
          }
        } catch (e) {
          logger.error('Error handling API response', e);
          this.resetFlush();
        }
      };
      const requestOptions: RequestOptions = {
        method: 'POST',
        verbose: true,
        ignore_json_errors: true,
        timeout_ms: timeoutMS
      };
      if (options.unloading) {
        requestOptions.transport = 'SEND_BEACON';
      }
      logger.log('HANJELOG REQUEST:', dataForRequest);
      this.sendRequest(dataForRequest, requestOptions, batchSendCallback);
    } catch (e) {
      logger.error('Error flushing request queue', e);
      this.resetFlush();
    }
  }

  scheduleFlush(flushMS: number) {
    this.flushInterval = flushMS;
    if (!this.stopped) {
      this.timeoutID = setTimeout(() => this.flush(), this.flushInterval);
    }
  }

  resetFlush() {
    this.scheduleFlush(this.libConfig.batch_flush_interval_ms as number);
  }

  resetBatchSize() {
    this.batchSize = this.libConfig.batch_size as number;
  }
}
