mergeInto(LibraryManager.library, {
  KyotoPublishState: function (pointer) {
    window.kyotoState = JSON.parse(UTF8ToString(pointer));
    window.dispatchEvent(new CustomEvent('kyoto:state', { detail: window.kyotoState }));
  }
});
