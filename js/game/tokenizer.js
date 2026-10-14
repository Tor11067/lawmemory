/**
 * Thai word tokenization and progressive masking algorithm
 * Follows the 5-level requirement with distributed non-consecutive masking.
 */

export function tokenizeThaiText(text) {
  if (!text) return [];

  // Check if Intl.Segmenter is available (Standard in modern browsers)
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    try {
      const segmenter = new Intl.Segmenter('th', { granularity: 'word' });
      const rawSegments = Array.from(segmenter.segment(text));
      return rawSegments.map((seg, idx) => {
        const hasText = seg.segment.trim().length > 0;
        const isWord = hasText && (seg.isWordLike !== undefined ? Boolean(seg.isWordLike) : !/[.,;()"\u201C\u201D\n\s]/.test(seg.segment));
        return {
          index: idx,
          text: seg.segment,
          isWord
        };
      });
    } catch (e) {
      console.warn('Intl.Segmenter error, using fallback tokenizer', e);
    }
  }

  // Fallback tokenizer for older environments
  // Splits on whitespace while preserving punctuation
  const tokens = [];
  const parts = text.split(/(\s+|[.,;()"\u201C\u201D\n])/);
  let idx = 0;
  for (const part of parts) {
    if (!part) continue;
    const isWord = /[^\s.,;()"\u201C\u201D\n]/.test(part);
    tokens.push({
      index: idx++,
      text: part,
      isWord
    });
  }
  return tokens;
}

/**
 * Creates masked tokens based on Level (1 to 5)
 * 
 * Level 1: 100% visible (0% hidden)
 * Level 2: 25% hidden (spaced out by 4, completely isolated)
 * Level 3: 50% hidden (alternating 1-on 1-off, no two hidden words adjacent)
 * Level 4: 75% hidden (anchor words spaced every 3-4 words, never long unbroken blanks)
 * Level 5: 100% hidden (all words hidden for full recall)
 */
export function createMaskedTokens(text, rawLevel = 1) {
  const level = Number(rawLevel) || 1;
  const tokens = tokenizeThaiText(text);

  // Extract only the word token indices (ignore spaces, punctuation, linebreaks)
  const wordIndices = [];
  tokens.forEach((t, i) => {
    if (t.isWord) wordIndices.push(i);
  });

  const totalWords = wordIndices.length;
  if (totalWords === 0) return tokens;

  // Set of token indices to mask
  const maskedSet = new Set();

  if (level === 1) {
    // 100% visible (0% hidden)
    // maskedSet stays empty
  } else if (level === 2) {
    // 25% hidden: randomly distributed, strictly non-consecutive
    // Random starting offset (1 or 2)
    let w = Math.floor(Math.random() * 2) + 1;
    while (w < totalWords) {
      maskedSet.add(wordIndices[w]);
      // Step randomly by 3 or 4 so masked words are never adjacent (always 2-3 visible words between them)
      const step = Math.random() < 0.5 ? 3 : 4;
      w += step;
    }
  } else if (level === 3) {
    // 50% hidden: alternating words with randomized parity (starts on word 0 or word 1)
    // Zero consecutive masked words (always alternating)
    const startOffset = Math.random() < 0.5 ? 0 : 1;
    for (let w = startOffset; w < totalWords; w += 2) {
      maskedSet.add(wordIndices[w]);
    }
  } else if (level === 4) {
    // 75% hidden: 25% visible as anchor words distributed every 3-4 words
    // In each group of 3-4 words, randomly choose 1 word as the visible anchor
    let chunkStart = 0;
    while (chunkStart < totalWords) {
      const chunkSize = Math.min(4, totalWords - chunkStart);
      const anchorInChunk = Math.floor(Math.random() * chunkSize);
      for (let i = 0; i < chunkSize; i++) {
        if (i !== anchorInChunk) {
          maskedSet.add(wordIndices[chunkStart + i]);
        }
      }
      chunkStart += chunkSize;
    }
  } else if (level === 5) {
    // 100% hidden: all words masked
    for (let w = 0; w < totalWords; w++) {
      maskedSet.add(wordIndices[w]);
    }
  }

  // Build enhanced tokens with masking metadata
  let runningCharOffset = 0;
  return tokens.map(t => {
    const isMasked = maskedSet.has(t.index);
    const startOffset = runningCharOffset;
    runningCharOffset += t.text.length;

    // Generate placeholder representation (e.g. "____" matching length or clean underline)
    const placeholder = t.isWord
      ? '_'.repeat(Math.max(2, t.text.length))
      : t.text;

    return {
      ...t,
      isMasked,
      startOffset,
      endOffset: runningCharOffset,
      placeholder,
      charCount: t.text.length
    };
  });
}

/**
 * Returns level descriptions for the UI
 */
export const LEVEL_CONFIG = {
  1: {
    level: 1,
    name: 'เลเวล 1: เปิดคำ 100%',
    badge: 'ง่ายมาก',
    color: 'emerald',
    percentHidden: '0%',
    description: 'มองเห็นคำทั้งหมด เหมาะสำหรับอ่านทำความเข้าใจและซ้อมพิมพ์จับจังหวะ'
  },
  2: {
    level: 2,
    name: 'เลเวล 2: ซ่อน 25%',
    badge: 'ง่าย',
    color: 'teal',
    percentHidden: '25%',
    description: 'ซ่อนบางคำกระจายกัน โดยมีคำข้างเคียงคอยบอกใบ้ตลอดทั้งประโยค'
  },
  3: {
    level: 3,
    name: 'เลเวล 3: ซ่อน 50%',
    badge: 'ปานกลาง',
    color: 'blue',
    percentHidden: '50%',
    description: 'ซ่อนคำแบบสลับตัวเว้นตัว (คำเว้นคำ) ฝึกดึงความจำโดยยังมีคำนำทาง'
  },
  4: {
    level: 4,
    name: 'เลเวล 4: ซ่อน 75%',
    badge: 'ท้าทาย',
    color: 'amber',
    percentHidden: '75%',
    description: 'ซ่อนคำส่วนใหญ่ เหลือเฉพาะคำสำคัญเป็นจุดสังเกตเป็นระยะๆ'
  },
  5: {
    level: 5,
    name: 'เลเวล 5: ซ่อน 100% (พิมพ์จากความจำ)',
    badge: 'ระดับเซียน',
    color: 'rose',
    percentHidden: '100%',
    description: 'ซ่อนคำทั้งหมด พิมพ์ตัวบท/การวางหลักออกจากความจำล้วนๆ'
  }
};
