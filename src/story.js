// Break long museum prose at sentence boundaries without rewriting its claims.
export function readingParagraphs(text, target = 125) {
  return String(text || '').split(/\n\s*\n/).filter(s => s.trim()).flatMap(block => {
    const sentences = block.match(/[^。！？]+[。！？]?|[。！？]/gu) || [block];
    const paragraphs = [];
    let current = '';
    for (const sentence of sentences) {
      current += sentence;
      if (current.length >= target) { paragraphs.push(current); current = ''; }
    }
    if (current) paragraphs.push(current);
    return paragraphs;
  });
}

export function separateResearchNotes(text) {
  const sentences=String(text || '').match(/[^。！？]+[。！？]?|[。！？]/gu) || [];
  const notes=[],body=[];
  for(const sentence of sentences) {
    // Move research workflow, never device warnings or compatibility conditions.
    (/冻结记录|冻结文本|本轮只核|未完整逐页|购物链接.*佣金|评测购物链接|本文没有独立长期测试|新闻标题.*活动日期|没有自行复测/.test(sentence) ? notes : body).push(sentence);
  }
  return {body:body.join(''),notes};
}
