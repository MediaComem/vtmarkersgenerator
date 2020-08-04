import { PerformanceObserver } from 'perf_hooks';

/* Log pipeline duration */

const performanceObserver = new PerformanceObserver((items: any, observer: any) => {
    const entry = items.getEntries().pop();
    const ms = entry?.duration || 0;
    console.log(`Duration of ${entry?.name}: ${(ms/1000).toFixed(2)} seconds`);
  });
performanceObserver.observe({ entryTypes: ['measure'] });
