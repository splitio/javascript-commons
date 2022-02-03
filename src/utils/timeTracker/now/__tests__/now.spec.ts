/**
Copyright 2022 Split Software

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
**/

import { now as nowBrowser } from '../browser';
import { now as nowNode } from '../node';

[nowBrowser, nowNode].forEach(now => {
  test('NOW / should generate a value each time you call it', () => {
    let n1 = now();
    let n2 = now();
    let n3 = now();

    expect(Number.isFinite(n1)).toBe(true); // is a finite value?
    expect(Number.isFinite(n2)).toBe(true); // is a finite value?
    expect(Number.isFinite(n3)).toBe(true); // is a finite value?
  });
});
