import { describe, expect, test } from 'vitest';
import { pickCompactTimer } from './compactTimer';

const idle = { running: false, expired: false };

describe('pickCompactTimer', () => {
  test('defaults to the speech timer', () => {
    expect(pickCompactTimer({ speech: idle, affPrep: idle, negPrep: idle })).toBe('speech');
  });

  test('shows a running prep timer over an idle speech timer', () => {
    expect(
      pickCompactTimer({ speech: idle, affPrep: idle, negPrep: { running: true, expired: false } })
    ).toBe('negPrep');
  });

  test('prefers a running speech timer over running prep', () => {
    expect(
      pickCompactTimer({
        speech: { running: true, expired: false },
        affPrep: { running: true, expired: false },
        negPrep: idle,
      })
    ).toBe('speech');
  });

  test('surfaces an expired timer when nothing is running', () => {
    expect(
      pickCompactTimer({ speech: idle, affPrep: { running: false, expired: true }, negPrep: idle })
    ).toBe('affPrep');
  });
});
