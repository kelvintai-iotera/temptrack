import { getRssiSignal } from './rssiSignal';

describe('getRssiSignal', () => {
  it('returns none for missing values', () => {
    expect(getRssiSignal(null).bars).toBe(0);
    expect(getRssiSignal(undefined).level).toBe('none');
  });

  it('maps strong signals to more bars', () => {
    expect(getRssiSignal(-48).bars).toBe(5);
    expect(getRssiSignal(-62).bars).toBe(4);
    expect(getRssiSignal(-72).bars).toBe(3);
    expect(getRssiSignal(-82).bars).toBe(2);
    expect(getRssiSignal(-90).bars).toBe(1);
  });
});
