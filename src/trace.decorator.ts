/// <reference types="zone.js" />
import { globalTracer } from 'opentracing';
import { getNextTracingSpan } from './get-next-tracing-span';
import { TRACING_SPAN } from './symbols';

export const Trace = (): MethodDecorator => <T>(
  target: Record<string, any>,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<T>,
) => {
  if (!descriptor) {
    return;
  }

  const { value } = descriptor;

  if (typeof value !== 'function') {
    return;
  }

  const { name } = value;
  const wrapper: { [key: string]: T } = {
    [name](...args: any[]) {
      const tracer = globalTracer();
      const prefix =
        typeof target === 'function'
          ? `${target.name}::`
          : `${target.constructor.name}.`;
      const label = `${prefix}${propertyKey.toString()}`;
      const childOf = getNextTracingSpan();
      const span = tracer.startSpan(label, { childOf });
      const zone = Zone.current.fork({ name: label });
      zone[TRACING_SPAN] = span;
      try {
        return zone.run(value, this, args);
      } finally {
        span.finish();
      }
    },
  } as any;

  return {
    ...descriptor,
    value: wrapper[name],
  };
};
