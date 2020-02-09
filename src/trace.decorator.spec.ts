import 'zone.js';
import { MockTracer, Span, initGlobalTracer, SpanContext } from 'opentracing';
import { MockSpan } from 'opentracing/lib/mock_tracer';
import { Trace } from './trace.decorator';
import { TRACING_SPAN } from './symbols';

describe('Trace', () => {
  let tracer: MockTracer;

  beforeEach(() => {
    tracer = new MockTracer();
    initGlobalTracer(tracer);
  });

  it('should be a function', () => {
    expect(Trace).toBeInstanceOf(Function);
  });

  it('should return a function', () => {
    expect(Trace()).toBeInstanceOf(Function);
  });

  describe('when it decorates a method', () => {
    class A {
      @Trace()
      static s() {
        return Zone.current;
      }

      @Trace()
      m() {
        return Zone.current;
      }

      @Trace()
      e() {
        const error = new Error();
        error[TRACING_SPAN] = Zone.current[TRACING_SPAN];
        throw error;
      }
    }
    let a: A;

    beforeEach(() => {
      a = new A();
    });

    it('should run a decorated method in a child zone', () => {
      const parentZone = Zone.current;

      const methodZone = A.s();

      expect(methodZone.parent).toEqual(parentZone);
    });

    it("should not change the decorated method's names", () => {
      expect(A.s.name).toEqual('s');
      expect(a.m.name).toEqual('m');
    });

    describe('tracingSpan', () => {
      it("should get assigned to the method's zone", () => {
        const span = A.s()[TRACING_SPAN];

        expect(span).toBeInstanceOf(Span);
      });

      it('should finish with the method', () => {
        const span: MockSpan = A.s()[TRACING_SPAN];
        const stop = Date.now();

        expect(stop).toBeGreaterThanOrEqual(span._finishMs);
      });

      it('should start with the method', () => {
        const start = Date.now();
        const span: MockSpan = A.s()[TRACING_SPAN];

        expect(start).toBeLessThanOrEqual(span._finishMs - span.durationMs());
      });

      it('should be named same as the static method it decorates prefixed with a class name and two colons', () => {
        const zone = A.s();
        const span: MockSpan = zone[TRACING_SPAN];

        expect(span.operationName()).toEqual('A::s');
      });

      it('should be named same as the instance method it decorates prefixed with a class name and a period', () => {
        const zone = a.m();
        const span: MockSpan = zone[TRACING_SPAN];

        expect(span.operationName()).toEqual('A.m');
      });
    });

    it("should name decorated static method's zone with a class and method names separated by two colons", () => {
      const methodZone = A.s();

      expect(methodZone.name).toEqual('A::s');
    });

    it("should name decorated instance method's zone with a class and method names separated by a period", () => {
      const methodZone = a.m();

      expect(methodZone.name).toEqual('A.m');
    });

    it('should close the span even if the traced method throws', () => {
      let span: MockSpan;

      try {
        a.e();
      } catch (error) {
        span = error[TRACING_SPAN];
      }

      expect(span._finishMs).toBeTruthy();
    });

    it('should register the reference to parent span', () => {
      const zone = Zone.current.fork({
        name: 'parent',
      });
      const parentSpan = tracer.startSpan('parent');
      zone[TRACING_SPAN] = parentSpan;
      let childOf: Span | SpanContext;
      jest
        .spyOn(tracer, 'startSpan')
        .mockImplementationOnce((_name, options) => {
          childOf = options.childOf;
          return { finish() {} } as any;
        });

      zone.run(() => {
        a.m();

        expect(childOf).toBe(parentSpan);
      });
    });
  });
});
