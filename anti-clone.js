(function () {
  var ALLOWED = ['webtozipcid-v2.vercel.app'];
  var host = location.hostname;
  var framed = window.top !== window.self;
  var valid = ALLOWED.indexOf(host) !== -1 && !framed && location.protocol === 'https:';
  if (!valid) {
    try { sessionStorage.removeItem('w2z_gate'); } catch (e) {}
    return;
  }
  var next = '/webtozip/';
  try {
    var saved = sessionStorage.getItem('w2z_next');
    if (saved && /^\/webtozip\//.test(saved)) next = saved;
    sessionStorage.setItem('w2z_gate', String(Date.now()));
    sessionStorage.removeItem('w2z_next');
  } catch (e) { return; }
  location.replace(next);
})();
