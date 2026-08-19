import * as googleTTS from 'google-tts-api';

export class AmharicTtsUtil {
  private static readonly letters: Record<string, string> = {
    'B': 'ቢ',
    'I': 'አይ',
    'N': 'ኤን',
    'G': 'ጂ',
    'O': 'ኦ'
  };

  private static readonly ones = ['', 'አንድ', 'ሁለት', 'ሦስት', 'አራት', 'አምስት', 'ስድስት', 'ሰባት', 'ስምንት', 'ዘጠኝ'];
  private static readonly tens = ['', 'አስር', 'ሃያ', 'ሠላሳ', 'አርባ', 'ሃምሳ', 'ስድሳ', 'ሰባ'];

  /**
   * Translates a standard Bingo string (e.g., 'B-5', 'I-16', 'O-72') 
   * into its phonetic Amharic equivalent.
   */
  static translateNumberToAmharic(drawnNumber: string): string {
    const [letter, numStr] = drawnNumber.split('-');
    const amharicLetter = this.letters[letter.toUpperCase()];
    
    const num = parseInt(numStr, 10);
    const tenDigit = Math.floor(num / 10);
    const oneDigit = num % 10;
    
    let amharicNumber = '';

    if (num < 10) {
      // Single digits (1-9)
      amharicNumber = this.ones[num];
    } else if (num >= 11 && num <= 19) {
      // Teen numbers use the 'አስራ' (Asra) modifier instead of 'አስር' (Asir)
      amharicNumber = `አስራ ${this.ones[oneDigit]}`;
    } else if (num === 10) {
      // Exactly 10
      amharicNumber = 'አስር';
    } else {
      // 20 and above (e.g., 20, 25, 72)
      if (oneDigit === 0) {
        amharicNumber = this.tens[tenDigit];
      } else {
        amharicNumber = `${this.tens[tenDigit]} ${this.ones[oneDigit]}`;
      }
    }

    return `${amharicLetter} ${amharicNumber}`.trim();
  }

  /**
   * Generates a Google TTS Audio URL for the translated Amharic string.
   */
  static getAudioUrl(drawnNumber: string): string {
    const text = this.translateNumberToAmharic(drawnNumber);
    return googleTTS.getAudioUrl(text, {
      lang: 'am', // Amharic language code
      slow: true, // Slightly slower for clarity in a Bingo setting
      host: 'https://translate.google.com',
    });
  }
}
