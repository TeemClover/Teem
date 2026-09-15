import test from 'node:test';
import assert from 'node:assert/strict';
import { lessonContent } from './learn-content.js';

test('private tools become a separate lesson payload without exposing JSON as learner prose',()=>{
  const data=[{kind:'prompt-library',title:'Library',prompts:[{id:'one',title:'One',body:'Private template with ``` literal and <script> text'}]}];
  const result=lessonContent('# Practice\n\n```learn-tools\n'+JSON.stringify(data)+'\n```\n\nKeep learning.');
  assert.deepEqual(result.tools,data);assert.equal(result.readingAvailable,true);
  assert.match(result.reading,/# Practice/);assert.match(result.reading,/Keep learning/);assert.doesNotMatch(result.reading,/Private template|prompt-library|learn-tools/);
});
test('ordinary copy blocks and diagrams stay intact when extracting tool configuration',()=>{
  const body='```text\ncopy this\n```\n\n```diagram\n{"title":"map"}\n```';
  assert.deepEqual(lessonContent(body),{reading:body,readingAvailable:true,tools:[]});
});
test('malformed and unsupported tool configurations never render as raw learner content',()=>{
  for(const json of ['broken','{}','[{"kind":"remote-script","title":"bad","prompts":[]}]']) {
    const result=lessonContent('```learn-tools\n'+json+'\n```');
    assert.deepEqual(result,{reading:'',readingAvailable:false,tools:[]});
  }
});
