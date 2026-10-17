import test from 'node:test';
import assert from 'node:assert/strict';
import {readingParagraphs,separateResearchNotes} from '../src/story.js';

test('long product prose breaks at complete sentences without losing or rewriting text', () => {
  const text='外壳通过铰链折叠。'.repeat(18)+'USB 3.2接口连接电脑！屏幕可旋转吗？最后一句';
  const paragraphs=readingParagraphs(text,60);
  assert(paragraphs.length>1);
  assert.equal(paragraphs.join(''),text);
  assert(paragraphs.slice(0,-1).every(p=>/[。！？]$/.test(p)));
  assert.deepEqual(readingParagraphs('第一段。\n\n第二段。'),['第一段。','第二段。']);
  assert.deepEqual(readingParagraphs(''),[]);
});

test('research notes remain available while device limits stay in the main reading',()=>{
  const {body,notes}=separateResearchNotes('固定镜头不提供长焦覆盖。评测购物链接可能带来佣金。使用时不要遮挡散热口。');
  assert.equal(body,'固定镜头不提供长焦覆盖。使用时不要遮挡散热口。');
  assert.deepEqual(notes,['评测购物链接可能带来佣金。']);
});
