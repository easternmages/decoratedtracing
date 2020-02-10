/// <reference types="zone.js" />
import { Span } from 'opentracing';
import { TRACING_SPAN } from './symbols';

export const getNextTracingSpan = (): Span => {
  let zone = Zone.current;
  let span: Span;

  do {
    span = zone[TRACING_SPAN];
    if (span) {
      break;
    }
    zone = zone.parent;
  } while (zone);

  return span;
};
