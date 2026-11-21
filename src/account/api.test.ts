import { afterEach, describe, expect, it } from 'vitest';
import { browserLocation } from './api';

const g = globalThis as { location?: unknown; document?: unknown };

describe('detección del navegador', () => {
  afterEach(() => {
    delete g.location;
    delete g.document;
  });
  it('en la app nativa no se usa el location de pega que crea Expo', () => {
    // Expo pone un location con la dirección del servidor de desarrollo, cuyo assign lanza un error.
    g.location = { origin: 'http://192.168.1.10:8081', assign: () => { throw new Error('NotSupportedError'); } };
    expect(browserLocation()).toBeNull();
  });
  it('en el navegador sí', () => {
    g.location = { origin: 'https://derbytactics.github.io' };
    g.document = {};
    expect(browserLocation()).toBe(g.location);
  });
});
