import assert from 'node:assert/strict';
import test from 'node:test';

// browser-env.js 会安装浏览器兼容全局，因此放在独立测试文件/进程中，避免污染
// placeOrder 的 mock 单元测试。
await import('../src/browser-env.js');

test('VMP 下单长分支需要的 document 全局别名完整且不可枚举', () => {
    assert.equal(document.Math, Math);
    assert.equal(document.parseFloat, parseFloat);
    assert.equal(document.navigator, globalThis.navigator);
    assert.equal(document.eval, globalThis.eval);
    assert.equal(document.Function, globalThis.Function);
    assert.equal(Object.getPrototypeOf(document), Object.prototype);

    for (const name of ['Math', 'parseFloat', 'navigator', 'eval', 'Function']) {
        assert.equal(Object.getOwnPropertyDescriptor(document, name).enumerable, false);
    }
});

test('请求期间临时提供混淆代码需要的全局别名，并在结束后恢复', () => {
    const before = Object.getOwnPropertyDescriptor(Object.prototype, 'Math');

    globalThis.__beginVmpRequestCompatibility();
    try {
        assert.equal(location.Math, Math);
        assert.equal(location.eval, globalThis.eval);
        assert.equal(location.parseFloat, parseFloat);
        assert.equal(({}).Math, Math);
        assert.equal(Object.getOwnPropertyDescriptor(Object.prototype, 'Math').enumerable, false);
    } finally {
        globalThis.__endVmpRequestCompatibility();
    }

    assert.deepEqual(Object.getOwnPropertyDescriptor(Object.prototype, 'Math'), before);
});
