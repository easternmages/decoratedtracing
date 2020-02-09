import 'zone.js';
import { getNextTracingSpan } from './get-next-tracing-span';
import { TRACING_SPAN } from './symbols';

describe('getNextTracingSpan', () => {
  it('should be a function', () => {
    expect(getNextTracingSpan).toBeInstanceOf(Function);
  });

  it('should retrieve a tracing span from current zone if one is present', () => {
    const zone = Zone.current.fork({
      name: 'test',
    });
    const expectedSpan = (zone[TRACING_SPAN] = {});

    zone.run(() => {
      const span = getNextTracingSpan();

      expect(span).toBe(expectedSpan);
    });
  });

  it('should retrieve a next present tracing span up the zone tree', () => {
    const deepZone = Zone.current.fork({
      name: 'deep',
    });
    const expectedSpan = (deepZone[TRACING_SPAN] = {});
    const middleZone = deepZone.fork({
      name: 'middle',
    });
    const zone = middleZone.fork({
      name: 'test',
    });

    zone.run(() => {
      const span = getNextTracingSpan();

      expect(span).toBe(expectedSpan);
    });
  });
});
