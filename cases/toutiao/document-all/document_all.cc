#include <node.h>
#include <v8.h>

namespace document_all {

using v8::Context;
using v8::Function;
using v8::FunctionCallbackInfo;
using v8::FunctionTemplate;
using v8::HandleScope;
using v8::Integer;
using v8::Isolate;
using v8::Local;
using v8::Object;
using v8::ObjectTemplate;
using v8::String;
using v8::Symbol;
using v8::Undefined;
using v8::Value;

void Item(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();

  // 后面可以在这里实现 document.all.item(index/name)
  args.GetReturnValue().Set(Undefined(isolate));
}

void NamedItem(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();

  // 后面实现按 id/name 查询
  args.GetReturnValue().Set(Undefined(isolate));
}

// document.all(...)
void CallAsFunction(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();

  // 真正浏览器这里和 item()/namedItem() 有类似查询逻辑
  args.GetReturnValue().Set(Undefined(isolate));
}

void CreateDocumentAll(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();
  HandleScope scope(isolate);

  Local<Context> context = isolate->GetCurrentContext();

  Local<ObjectTemplate> tpl = ObjectTemplate::New(isolate);

  // 最关键的一句
  tpl->MarkAsUndetectable();

  // document.all(...)
  tpl->SetCallAsFunctionHandler(CallAsFunction);

  // document.all.length
  tpl->Set(
      String::NewFromUtf8Literal(isolate, "length"),
      Integer::New(isolate, 0));

  // document.all.item()
  tpl->Set(
      String::NewFromUtf8Literal(isolate, "item"),
      FunctionTemplate::New(isolate, Item));

  // document.all.namedItem()
  tpl->Set(
      String::NewFromUtf8Literal(isolate, "namedItem"),
      FunctionTemplate::New(isolate, NamedItem));

  // Object.prototype.toString.call(document.all)
  tpl->Set(
      Symbol::GetToStringTag(isolate),
      String::NewFromUtf8Literal(isolate, "HTMLAllCollection"));

  Local<Object> all;

  if (!tpl->NewInstance(context).ToLocal(&all)) {
    return;
  }

  args.GetReturnValue().Set(all);
}

NODE_MODULE_INIT(/* exports, module, context */) {
  Isolate* isolate = context->GetIsolate();

  Local<Function> factory =
      Function::New(context, CreateDocumentAll).ToLocalChecked();

  exports
      ->Set(
          context,
          String::NewFromUtf8Literal(isolate, "createDocumentAll"),
          factory)
      .Check();
}

} // namespace document_all