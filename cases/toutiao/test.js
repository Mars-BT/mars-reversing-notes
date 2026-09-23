const native =
  require("./document_all.node");

const all = native.createDocumentAll();

const document = {};

Object.defineProperty(document, "all", {
  configurable: true,
  enumerable: false,
  get() {
    return all;
  }
});

console.log(typeof document.all);
console.log(Boolean(document.all));

console.log(document.all == null);
console.log(document.all == undefined);

console.log(document.all === null);
console.log(document.all === undefined);

console.log(typeof document.all.item);
console.log(typeof document.all.namedItem);

console.log(
  Object.prototype.toString.call(document.all)
);