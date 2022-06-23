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
import { nearlyEqual } from '../../../../__tests__/testUtils/index';

[nowBrowser, nowNode].forEach(now => {
  test('NOW / should generate a value each time you call it', async () => {
    const n1 = now();
    const n2 = now();

    const delay = 200;
    await new Promise(res => setTimeout(res, delay));
    const n3 = now();

    expect(Number.isFinite(n1)).toBe(true); // is a finite value?
    expect(Number.isFinite(n2)).toBe(true); // is a finite value?
    expect(Number.isFinite(n3)).toBe(true); // is a finite value?
    expect(nearlyEqual(n1, n2)).toBe(true);
    expect(nearlyEqual(n1 + delay, n3)).toBe(true);
  });
});
