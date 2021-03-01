import hanjelog from '../src';
import utils, { Cookie } from '../src/tracking/utils';

hanjelog.init('FAKE_TOKEN', {
  api_host: 'http://localhost:9007'
});

hanjelog.track('Registered', {}, { send_immediately: false });

