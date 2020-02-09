/// <reference types="zone.js" />
import { globalTracer } from 'opentracing';
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
      const span = tracer.startSpan(label);
      const zone = Zone.current.fork({ name: label });
      zone[TRACING_SPAN] = span;
      const result = zone.run(value, this, args);
      span.finish();
      return result;
    },
  } as any;

  return {
    ...descriptor,
    value: wrapper[name],
  };
};
