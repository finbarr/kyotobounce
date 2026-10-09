import {prepareBackgroundWorker} from './macos-worker.ts';
await prepareBackgroundWorker(process.argv[2]);
console.log('Kyoto physics worker is configured as a background-only macOS app.');
