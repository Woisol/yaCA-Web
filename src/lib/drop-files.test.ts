import assert from 'node:assert/strict';
import { test } from 'node:test';
import { droppedFilesToMessage, mergeDroppedMessages, mergePromptWithDropped } from './drop-files.js';

test('droppedFilesToMessage expands text files and attaches images', async () => {
  const textFile = new File(['hello'], 'notes.md', { type: 'text/markdown' });
  const imageFile = new File(['png'], 'screen.png', { type: 'image/png' });

  const message = await droppedFilesToMessage([textFile, imageFile]);

  assert.equal(message.fileCount, 2);
  assert.match(message.text, /\[File: notes\.md\]\nhello\n\[End of File\]/);
  assert.match(message.text, /\[Image:screen\.png\]/);
  assert.ok(Array.isArray(message.content));
  assert.deepEqual(message.content[0], {
    type: 'text',
    text: '\n\n[File: notes.md]\nhello\n[End of File]\n\n'
  });
  assert.equal(message.content[1].type, 'image_url');
  assert.equal(message.content[1].meta?.path, 'screen.png');
  assert.match(message.content[1].image_url.url, /^data:image\/png;base64,/);
});

test('mergePromptWithDropped sends composer text together with text drops', () => {
  const merged = mergePromptWithDropped('Summarize this', {
    text: '\n\n[File: notes.md]\nhello\n[End of File]\n\n',
    content: '\n\n[File: notes.md]\nhello\n[End of File]\n\n'
  });

  assert.equal(merged.text, 'Summarize this\n\n[File: notes.md]\nhello\n[End of File]\n\n');
  assert.equal(merged.content, 'Summarize this\n\n[File: notes.md]\nhello\n[End of File]\n\n');
});

test('mergePromptWithDropped sends composer text together with image drops', () => {
  const merged = mergePromptWithDropped('Describe this', {
    text: '\n\n[Image:screen.png]\n\n',
    content: [{ type: 'image_url', image_url: { url: 'data:image/png;base64,cG5n' }, meta: { path: 'screen.png' } }]
  });

  assert.equal(merged.text, 'Describe this\n\n[Image:screen.png]\n\n');
  assert.ok(Array.isArray(merged.content));
  assert.deepEqual(merged.content[0], { type: 'text', text: 'Describe this\n\n' });
  assert.equal(merged.content[1].type, 'image_url');
});

test('mergeDroppedMessages accumulates multiple drops', async () => {
  const first = await droppedFilesToMessage([new File(['one'], 'one.txt', { type: 'text/plain' })]);
  const second = await droppedFilesToMessage([
    new File(['two'], 'two.txt', { type: 'text/plain' }),
    new File(['png'], 'screen.png', { type: 'image/png' })
  ]);

  const merged = mergeDroppedMessages(first, second);

  assert.equal(merged.fileCount, 3);
  assert.match(merged.text, /\[File: one\.txt\]\none\n\[End of File\]/);
  assert.match(merged.text, /\[File: two\.txt\]\ntwo\n\[End of File\]/);
  assert.match(merged.text, /\[Image:screen\.png\]/);
  assert.ok(Array.isArray(merged.content));
  assert.equal(merged.content.length, 2);
  assert.equal(merged.content[0].type, 'text');
  assert.match(merged.content[0].text, /\[File: one\.txt\]/);
  assert.match(merged.content[0].text, /\[File: two\.txt\]/);
  assert.equal(merged.content[1].type, 'image_url');
});
