import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpBackend, HttpClient } from '@angular/common/http';
import { appConfig } from './app.config';

/**
 * The wiring is the contract with @qits/angular, and every part of it is silent when it is wrong:
 * a missing ErrorHandler override loses uncaught errors, and the XHR backend produces spans that
 * simply never exist. Both are asserted here rather than discovered in a telemetry gap.
 */
describe('appConfig', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...appConfig.providers] });
  });

  it('hands the ErrorHandler to the qits integration', () => {
    expect(TestBed.inject(ErrorHandler).constructor).not.toBe(ErrorHandler);
  });

  it('provides an HttpClient on the fetch backend', () => {
    expect(TestBed.inject(HttpClient)).toBeTruthy();
    expect(TestBed.inject(HttpBackend).constructor.name).toContain('Fetch');
  });
});
