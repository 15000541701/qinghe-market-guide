if (!Array.prototype.at)
  Object.defineProperty(Array.prototype, 'at', {
    value: function (index) {
      const i = Math.trunc(index) || 0;
      return this[i < 0 ? this.length + i : i];
    },
    configurable: true,
    writable: true,
  });
if (!Array.prototype.flatMap)
  Object.defineProperty(Array.prototype, 'flatMap', {
    value: function (callback, receiver) {
      return [].concat.apply([], this.map(callback, receiver));
    },
    configurable: true,
    writable: true,
  });
if (!Object.fromEntries)
  Object.fromEntries = (entries) => {
    const object = {};
    for (const [key, value] of entries) object[key] = value;
    return object;
  };
