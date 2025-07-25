import test from 'node:test';
import { Event, Evented } from '../lib/events.js';

test('Evented', async t => {
  await t.test('calls listeners added with "on"', t => {
    const evented = new Evented();
    const listener = t.mock.fn();
    evented.on('a', listener);
    evented.fire(new Event('a'));
    evented.fire(new Event('a'));
    t.assert.equal(listener.mock.callCount(), 2);
  });

  await t.test('calls listeners added with "once" once', t => {
    const evented = new Evented();
    const listener = t.mock.fn();
    evented.once('a', listener);
    evented.fire(new Event('a'));
    evented.fire(new Event('a'));
    t.assert.equal(listener.mock.callCount(), 1);
    t.assert.ok(!evented.listens('a'));
  });

  await t.test('passes data to listeners', t => {
    const evented = new Evented();
    evented.on('a', data => {
      t.assert.equal(data.foo, 'bar');
    });
    evented.fire(new Event('a', { foo: 'bar' }));
  });

  await t.test('passes "target" to listeners', t => {
    const evented = new Evented();
    evented.on('a', data => {
      t.assert.equal(data.target, evented);
    });
    evented.fire(new Event('a'));
  });

  await t.test('passes "type" to listeners', t => {
    const evented = new Evented();
    evented.on('a', data => {
      t.assert.deepEqual(data.type, 'a');
    });
    evented.fire(new Event('a'));
  });

  await t.test('removes listeners with "off"', t => {
    const evented = new Evented();
    const listener = t.mock.fn();
    evented.on('a', listener);
    evented.off('a', listener);
    evented.fire(new Event('a'));
    t.assert.equal(listener.mock.callCount(), 0);
  });

  await t.test('removes one-time listeners with "off"', t => {
    const evented = new Evented();
    const listener = t.mock.fn();
    evented.once('a', listener);
    evented.off('a', listener);
    evented.fire(new Event('a'));
    t.assert.equal(listener.mock.callCount(), 0);
  });

  await t.test('once listener is removed prior to call', t => {
    const evented = new Evented();
    const listener = t.mock.fn();
    evented.once('a', () => {
      listener();
      evented.fire(new Event('a'));
    });
    evented.fire(new Event('a'));
    t.assert.equal(listener.mock.callCount(), 1);
  });

  await t.test('reports if an event has listeners with "listens"', t => {
    const evented = new Evented();
    evented.on('a', () => {});
    t.assert.ok(evented.listens('a'));
    t.assert.ok(!evented.listens('b'));
  });

  await t.test('does not report true to "listens" if all listeners have been removed', t => {
    const evented = new Evented();
    const listener = () => {};
    evented.on('a', listener);
    evented.off('a', listener);
    t.assert.ok(!evented.listens('a'));
  });

  await t.test('does not immediately call listeners added within another listener', t => {
    const evented = new Evented();
    evented.on('a', () => {
      evented.on('a', () => t.assert.fail());
    });
    evented.fire(new Event('a'));
  });

  await t.test('does not immediately call once listeners added within another once listener', t => {
    const evented = new Evented();
    evented.once('a', () => {
      evented.once('a', () => t.assert.fail());
    });
    evented.fire(new Event('a'));
    t.assert.ok(evented.listens('a'), 'listener has been attached');
  });

  await t.test('has backward compatibility for fire(string, object) API', t => {
    const evented = new Evented();
    const listener = t.mock.fn();
    evented.on('a', listener);
    evented.fire('a', { foo: 'bar' });
    t.assert.equal(listener.mock.callCount(), 1);
    t.assert.equal(listener.mock.calls[0].arguments[0].foo, 'bar');
  });

  await t.test('on is idempotent', t => {
    const results = [];
    const evented = new Evented();
    const listenerA = () => results.push('A');
    const listenerB = () => results.push('B');
    evented.on('a', listenerA);
    evented.on('a', listenerB);
    evented.on('a', listenerA);
    evented.fire(new Event('a'));
    t.assert.deepEqual(results, ['A', 'B']);
  });

  await t.test('evented parents', async t => {
    await t.test('adds parents with "setEventedParent"', t => {
      const listener = t.mock.fn();
      const eventedSource = new Evented();
      const eventedSink = new Evented();
      eventedSource.setEventedParent(eventedSink);
      eventedSink.on('a', listener);
      eventedSource.fire(new Event('a'));
      eventedSource.fire(new Event('a'));
      t.assert.equal(listener.mock.callCount(), 2);
    });

    await t.test('passes original data to parent listeners', t => {
      const eventedSource = new Evented();
      const eventedSink = new Evented();
      eventedSource.setEventedParent(eventedSink);
      eventedSink.on('a', data => {
        t.assert.equal(data.foo, 'bar');
      });
      eventedSource.fire(new Event('a', { foo: 'bar' }));
    });

    await t.test('attaches parent data to parent listeners', t => {
      const eventedSource = new Evented();
      const eventedSink = new Evented();
      eventedSource.setEventedParent(eventedSink, { foz: 'baz' });
      eventedSink.on('a', data => {
        t.assert.equal(data.foz, 'baz');
      });
      eventedSource.fire(new Event('a', { foo: 'bar' }));
    });

    await t.test('attaches parent data from a function to parent listeners', t => {
      const eventedSource = new Evented();
      const eventedSink = new Evented();
      eventedSource.setEventedParent(eventedSink, () => ({ foz: 'baz' }));
      eventedSink.on('a', data => {
        t.assert.equal(data.foz, 'baz');
      });
      eventedSource.fire(new Event('a', { foo: 'bar' }));
    });

    await t.test('passes original "target" to parent listeners', t => {
      const eventedSource = new Evented();
      const eventedSink = new Evented();
      eventedSource.setEventedParent(eventedSink);
      eventedSource.setEventedParent(null);
      eventedSink.on('a', data => {
        t.assert.equal(data.target, eventedSource);
      });
      eventedSource.fire(new Event('a'));
    });

    await t.test('removes parents with "setEventedParent(null)"', t => {
      const listener = t.mock.fn();
      const eventedSource = new Evented();
      const eventedSink = new Evented();
      eventedSink.on('a', listener);
      eventedSource.setEventedParent(eventedSink);
      eventedSource.setEventedParent(null);
      eventedSource.fire(new Event('a'));
      t.assert.equal(listener.mock.callCount(), 0);
    });

    await t.test('reports if an event has parent listeners with "listens"', t => {
      const eventedSource = new Evented();
      const eventedSink = new Evented();
      eventedSink.on('a', () => {});
      eventedSource.setEventedParent(eventedSink);
      t.assert.ok(eventedSink.listens('a'));
    });

    await t.test('eventedParent data function is evaluated on every fire', t => {
      const eventedSource = new Evented();
      const eventedParent = new Evented();
      let i = 0;
      eventedSource.setEventedParent(eventedParent, () => i++);
      eventedSource.on('a', () => {});
      eventedSource.fire(new Event('a'));
      t.assert.equal(i, 1);
      eventedSource.fire(new Event('a'));
      t.assert.equal(i, 2);
    });
  });
});
