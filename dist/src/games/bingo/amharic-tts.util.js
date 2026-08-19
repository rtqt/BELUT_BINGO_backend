"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AmharicTtsUtil = void 0;
const googleTTS = __importStar(require("google-tts-api"));
class AmharicTtsUtil {
    static letters = {
        'B': 'ቢ',
        'I': 'አይ',
        'N': 'ኤን',
        'G': 'ጂ',
        'O': 'ኦ'
    };
    static ones = ['', 'አንድ', 'ሁለት', 'ሦስት', 'አራት', 'አምስት', 'ስድስት', 'ሰባት', 'ስምንት', 'ዘጠኝ'];
    static tens = ['', 'አስር', 'ሃያ', 'ሠላሳ', 'አርባ', 'ሃምሳ', 'ስድሳ', 'ሰባ'];
    static translateNumberToAmharic(drawnNumber) {
        const [letter, numStr] = drawnNumber.split('-');
        const amharicLetter = this.letters[letter.toUpperCase()];
        const num = parseInt(numStr, 10);
        const tenDigit = Math.floor(num / 10);
        const oneDigit = num % 10;
        let amharicNumber = '';
        if (num < 10) {
            amharicNumber = this.ones[num];
        }
        else if (num >= 11 && num <= 19) {
            amharicNumber = `አስራ ${this.ones[oneDigit]}`;
        }
        else if (num === 10) {
            amharicNumber = 'አስር';
        }
        else {
            if (oneDigit === 0) {
                amharicNumber = this.tens[tenDigit];
            }
            else {
                amharicNumber = `${this.tens[tenDigit]} ${this.ones[oneDigit]}`;
            }
        }
        return `${amharicLetter} ${amharicNumber}`.trim();
    }
    static getAudioUrl(drawnNumber) {
        const text = this.translateNumberToAmharic(drawnNumber);
        return googleTTS.getAudioUrl(text, {
            lang: 'am',
            slow: true,
            host: 'https://translate.google.com',
        });
    }
}
exports.AmharicTtsUtil = AmharicTtsUtil;
//# sourceMappingURL=amharic-tts.util.js.map