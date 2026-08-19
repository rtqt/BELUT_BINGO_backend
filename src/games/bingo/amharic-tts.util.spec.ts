import { AmharicTtsUtil } from './amharic-tts.util';

describe('AmharicTtsUtil', () => {
  describe('translateNumberToAmharic', () => {
    it('should correctly translate single digit numbers (e.g., B-5)', () => {
      const result = AmharicTtsUtil.translateNumberToAmharic('B-5');
      expect(result).toBe('ቢ አምስት');
    });

    it('should correctly translate two digit numbers (e.g., O-72)', () => {
      const result = AmharicTtsUtil.translateNumberToAmharic('O-72');
      // 72 -> ሰባ ሁለት
      expect(result).toBe('ኦ ሰባ ሁለት');
    });

    it('should correctly translate teen numbers with the "አስራ" modifier (e.g., I-16)', () => {
      const result = AmharicTtsUtil.translateNumberToAmharic('I-16');
      // 16 -> አስራ ስድስት
      expect(result).toBe('አይ አስራ ስድስት');
    });

    it('should correctly translate exact tens (e.g., N-30)', () => {
      const result = AmharicTtsUtil.translateNumberToAmharic('N-30');
      // 30 -> ሠላሳ
      expect(result).toBe('ኤን ሠላሳ');
    });
  });
});
